-- PostgreSQL 15+. Owner: atlas_control_owner. Runtime: atlas_control (never owner).
-- Schema is provisioned by infrastructure. No cross-service table grants.
CREATE SCHEMA IF NOT EXISTS control;
REVOKE ALL ON SCHEMA control FROM PUBLIC;
GRANT USAGE ON SCHEMA control TO atlas_control;

CREATE FUNCTION control.current_tenant() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE FUNCTION control.current_actor() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION control.is_platform() RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT COALESCE(current_setting('app.platform_admin', true) = 'true', false) $$;

CREATE TABLE control.tenant (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(160) NOT NULL CHECK (length(trim(name)) > 0),
    slug varchar(80) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
    status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
    is_demo boolean NOT NULL DEFAULT false,
    contact_email varchar(254),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE control.license (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL UNIQUE REFERENCES control.tenant(id),
    plan varchar(80) NOT NULL DEFAULT 'PILOT',
    status varchar(20) NOT NULL DEFAULT 'TRIAL' CHECK(status IN ('TRIAL','ACTIVE','SUSPENDED','EXPIRED')),
    seat_limit integer NOT NULL DEFAULT 10 CHECK(seat_limit BETWEEN 1 AND 100000),
    monthly_account_limit integer NOT NULL DEFAULT 1000 CHECK(monthly_account_limit BETWEEN 1 AND 10000000),
    starts_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
    billing_cycle varchar(20) NOT NULL DEFAULT 'MONTHLY' CHECK(billing_cycle IN ('MONTHLY','ANNUAL')),
    version bigint NOT NULL DEFAULT 0 CHECK(version >= 0),
    CHECK(expires_at > starts_at)
);

CREATE TABLE control.lead (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(160) NOT NULL,
    email varchar(254) NOT NULL,
    organization varchar(200) NOT NULL,
    phone varchar(40),
    message varchar(3000) NOT NULL,
    consent boolean NOT NULL CHECK(consent),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_created_idx ON control.lead(created_at DESC);

ALTER TABLE control.tenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_read ON control.tenant FOR SELECT USING(id = control.current_tenant() OR control.is_platform());
CREATE POLICY tenant_write ON control.tenant FOR ALL USING(control.is_platform()) WITH CHECK(control.is_platform());

ALTER TABLE control.license ENABLE ROW LEVEL SECURITY;
CREATE POLICY license_read ON control.license FOR SELECT USING(tenant_id = control.current_tenant() OR control.is_platform());
CREATE POLICY license_write ON control.license FOR ALL USING(control.is_platform()) WITH CHECK(control.is_platform());

ALTER TABLE control.lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_read ON control.lead FOR SELECT USING(control.is_platform());
CREATE POLICY lead_receive ON control.lead FOR INSERT WITH CHECK(consent);

REVOKE ALL ON ALL TABLES IN SCHEMA control FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA control FROM PUBLIC;
GRANT EXECUTE ON FUNCTION control.current_tenant(),control.current_actor(),control.is_platform() TO atlas_control;
ALTER DEFAULT PRIVILEGES IN SCHEMA control REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA control REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON control.tenant,control.license TO atlas_control;
GRANT SELECT,INSERT ON control.lead TO atlas_control;
