-- PostgreSQL 15+. Owner: atlas_hospital_owner. Runtime: atlas_hospital (never owner).
-- Schema is provisioned by infrastructure. No cross-service table grants.
CREATE SCHEMA IF NOT EXISTS hospital;
REVOKE ALL ON SCHEMA hospital FROM PUBLIC;
GRANT USAGE ON SCHEMA hospital TO atlas_hospital;

CREATE FUNCTION hospital.current_tenant() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE FUNCTION hospital.current_actor() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION hospital.is_platform() RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT COALESCE(current_setting('app.platform_admin', true) = 'true', false) $$;

CREATE TABLE hospital.insurer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(120) NOT NULL,
    code varchar(24) NOT NULL UNIQUE CHECK(code ~ '^[A-Z0-9_-]+$')
);

-- The JSONB rules are a single versioned source for tariffs and quantitative
-- limits. Published documents cannot be modified, including their JSONB rules.
CREATE TABLE hospital.agreement (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    insurer_id uuid NOT NULL REFERENCES hospital.insurer(id),
    insurer varchar(120) NOT NULL,
    name varchar(180) NOT NULL,
    version integer NOT NULL DEFAULT 1 CHECK(version > 0),
    status varchar(16) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED')),
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    rules jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(rules) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    CHECK(valid_to >= valid_from),
    CHECK((status = 'DRAFT' AND published_at IS NULL) OR (status = 'PUBLISHED' AND published_at IS NOT NULL)),
    UNIQUE(tenant_id,id),
    UNIQUE(tenant_id,id,version),
    UNIQUE(tenant_id,insurer_id,version)
);
CREATE INDEX agreement_resolve_idx ON hospital.agreement(tenant_id,insurer_id,valid_from DESC,version DESC) WHERE status = 'PUBLISHED';

CREATE TABLE hospital.hospital_account (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    folio varchar(80) NOT NULL,
    patient_reference varchar(100) NOT NULL,
    insurer varchar(120) NOT NULL,
    insurer_id uuid NOT NULL REFERENCES hospital.insurer(id),
    admission_date date NOT NULL,
    discharge_date date NOT NULL,
    diagnosis_code varchar(20),
    policy_number varchar(100),
    deductible numeric(14,2) CHECK(deductible >= 0 AND deductible < 1000000000000),
    coinsurance_rate numeric(7,6) CHECK(coinsurance_rate BETWEEN 0 AND 1),
    coinsurance_cap numeric(14,2) CHECK(coinsurance_cap >= 0 AND coinsurance_cap < 1000000000000),
    available_coverage numeric(14,2) CHECK(available_coverage >= 0 AND available_coverage < 1000000000000),
    status varchar(20) NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','EVALUATED','IN_REVIEW','READY','SENT','RESOLVED')),
    lane varchar(10) NOT NULL DEFAULT 'YELLOW' CHECK(lane IN ('GREEN','YELLOW','RED')),
    assigned_to uuid,
    agreement_id uuid,
    total numeric(14,2) NOT NULL DEFAULT 0 CHECK(total >= 0 AND total < 1000000000000),
    anomaly_count integer NOT NULL DEFAULT 0 CHECK(anomaly_count >= 0),
    version bigint NOT NULL DEFAULT 0 CHECK(version >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    content_hash varchar(64) CHECK(content_hash ~ '^[a-f0-9]{64}$'),
    idempotency_key varchar(128),
    result varchar(16) CHECK(result IN ('APPROVED','ADJUSTED','REJECTED')),
    authorized_amount numeric(14,2) CHECK(authorized_amount >= 0 AND authorized_amount < 1000000000000),
    outcome_reason varchar(1000),
    outcome_at timestamptz,
    CHECK(discharge_date >= admission_date),
    UNIQUE(tenant_id,id),
    UNIQUE(tenant_id,folio),
    UNIQUE(tenant_id,idempotency_key),
    FOREIGN KEY(tenant_id,agreement_id) REFERENCES hospital.agreement(tenant_id,id)
);
CREATE INDEX account_inbox_idx ON hospital.hospital_account(tenant_id,status,lane,created_at DESC,id);
CREATE INDEX account_recent_idx ON hospital.hospital_account(tenant_id,created_at DESC,id);
CREATE INDEX account_assignment_idx ON hospital.hospital_account(tenant_id,assigned_to,status) WHERE assigned_to IS NOT NULL;
CREATE UNIQUE INDEX account_content_hash_unique ON hospital.hospital_account(tenant_id,content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE hospital.account_line (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    code varchar(60) NOT NULL CHECK(code = upper(trim(code)) AND length(code) > 0),
    description varchar(500) NOT NULL,
    category varchar(40) NOT NULL,
    quantity numeric(12,3) NOT NULL CHECK(quantity > 0 AND quantity < 1000000000),
    unit_price numeric(14,2) NOT NULL CHECK(unit_price >= 0 AND unit_price < 1000000000000),
    total numeric(14,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
    status varchar(24) NOT NULL DEFAULT 'PENDING',
    reason varchar(1000),
    justification varchar(2000),
    service_date date,
    removed boolean NOT NULL DEFAULT false,
    version bigint NOT NULL DEFAULT 0 CHECK(version >= 0),
    UNIQUE(tenant_id,id),
    FOREIGN KEY(tenant_id,account_id) REFERENCES hospital.hospital_account(tenant_id,id)
);
CREATE INDEX account_line_account_idx ON hospital.account_line(tenant_id,account_id,id);

CREATE TABLE hospital.evaluation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    agreement_id uuid,
    agreement_version integer,
    engine_version varchar(40) NOT NULL,
    billed_total numeric(14,2) NOT NULL CHECK(billed_total >= 0 AND billed_total < 1000000000000),
    excluded_total numeric(14,2) NOT NULL CHECK(excluded_total >= 0 AND excluded_total < 1000000000000),
    tariff_adjustment numeric(14,2) NOT NULL CHECK(tariff_adjustment >= 0 AND tariff_adjustment < 1000000000000),
    deductible numeric(14,2) NOT NULL CHECK(deductible >= 0 AND deductible < 1000000000000),
    coinsurance numeric(14,2) NOT NULL CHECK(coinsurance >= 0 AND coinsurance < 1000000000000),
    insurer_estimate numeric(14,2) NOT NULL CHECK(insurer_estimate >= 0 AND insurer_estimate < 1000000000000),
    patient_estimate numeric(14,2) NOT NULL CHECK(patient_estimate >= 0 AND patient_estimate < 1000000000000),
    unresolved_amount numeric(14,2) NOT NULL CHECK(unresolved_amount >= 0 AND unresolved_amount < 1000000000000),
    lane varchar(10) NOT NULL CHECK(lane IN ('GREEN','YELLOW','RED')),
    findings jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(findings) = 'array'),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    previous_evaluation_id uuid,
    UNIQUE(tenant_id,id),
    UNIQUE(tenant_id,account_id,id),
    CHECK(billed_total = tariff_adjustment + insurer_estimate + patient_estimate + unresolved_amount),
    CHECK(patient_estimate = deductible + coinsurance),
    CHECK(excluded_total <= unresolved_amount),
    CHECK((agreement_id IS NULL AND agreement_version IS NULL) OR (agreement_id IS NOT NULL AND agreement_version IS NOT NULL)),
    FOREIGN KEY(tenant_id,account_id) REFERENCES hospital.hospital_account(tenant_id,id),
    FOREIGN KEY(tenant_id,agreement_id,agreement_version) REFERENCES hospital.agreement(tenant_id,id,version),
    FOREIGN KEY(tenant_id,account_id,previous_evaluation_id) REFERENCES hospital.evaluation(tenant_id,account_id,id)
);
CREATE INDEX evaluation_account_latest_idx ON hospital.evaluation(tenant_id,account_id,created_at DESC,id);

CREATE TABLE hospital.account_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    actor_id uuid,
    action varchar(80) NOT NULL,
    description varchar(1500) NOT NULL,
    before_value jsonb,
    after_value jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY(tenant_id,account_id) REFERENCES hospital.hospital_account(tenant_id,id)
);
CREATE INDEX account_history_account_idx ON hospital.account_history(tenant_id,account_id,created_at DESC,id);

CREATE TABLE hospital.audit_event (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    actor_id uuid,
    action varchar(80) NOT NULL,
    entity_type varchar(80) NOT NULL,
    entity_id uuid,
    details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_scope_idx ON hospital.audit_event(tenant_id,created_at DESC,id);

-- Published agreements and historical evidence are protected from application
-- mutations. Administrative maintenance still requires a controlled migration.
CREATE FUNCTION hospital.reject_published_agreement_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'PUBLISHED' THEN
        RAISE EXCEPTION 'Published agreements are immutable; create a new version' USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER agreement_immutable BEFORE UPDATE OR DELETE ON hospital.agreement
FOR EACH ROW EXECUTE FUNCTION hospital.reject_published_agreement_change();

CREATE FUNCTION hospital.reject_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Evidence is append-only' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON hospital.audit_event
FOR EACH ROW EXECUTE FUNCTION hospital.reject_evidence_mutation();
CREATE TRIGGER evaluation_append_only BEFORE UPDATE OR DELETE ON hospital.evaluation
FOR EACH ROW EXECUTE FUNCTION hospital.reject_evidence_mutation();
CREATE TRIGGER history_append_only BEFORE UPDATE OR DELETE ON hospital.account_history
FOR EACH ROW EXECUTE FUNCTION hospital.reject_evidence_mutation();

DO $$
DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['agreement','hospital_account','account_line','evaluation','account_history'] LOOP
        EXECUTE format('ALTER TABLE hospital.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('CREATE POLICY tenant_scope ON hospital.%I USING(tenant_id = hospital.current_tenant()) WITH CHECK(tenant_id = hospital.current_tenant())', table_name);
    END LOOP;
END $$;

ALTER TABLE hospital.audit_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_scope ON hospital.audit_event USING(tenant_id = hospital.current_tenant() OR (tenant_id IS NULL AND hospital.is_platform()))
WITH CHECK(tenant_id = hospital.current_tenant() OR (tenant_id IS NULL AND hospital.is_platform()));

REVOKE ALL ON ALL TABLES IN SCHEMA hospital FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hospital FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hospital.current_tenant(),hospital.current_actor(),hospital.is_platform() TO atlas_hospital;
ALTER DEFAULT PRIVILEGES IN SCHEMA hospital REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA hospital REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON hospital.agreement,hospital.hospital_account,hospital.account_line TO atlas_hospital;
GRANT SELECT,INSERT ON hospital.evaluation,hospital.account_history,hospital.audit_event TO atlas_hospital;
GRANT SELECT ON hospital.insurer TO atlas_hospital;
