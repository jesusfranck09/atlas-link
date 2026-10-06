-- PostgreSQL 15+. Owner: atlas_identity_owner. Runtime: atlas_identity (never owner).
-- Schema is provisioned by infrastructure. No cross-service table grants.
CREATE SCHEMA IF NOT EXISTS identity;
REVOKE ALL ON SCHEMA identity FROM PUBLIC;
GRANT USAGE ON SCHEMA identity TO atlas_identity;

CREATE FUNCTION identity.current_tenant() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE FUNCTION identity.current_actor() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION identity.is_platform() RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT COALESCE(current_setting('app.platform_admin', true) = 'true', false) $$;

CREATE TABLE identity.app_user (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    email varchar(254) NOT NULL CHECK (email = lower(trim(email)) AND position('@' IN email) > 1),
    name varchar(160) NOT NULL CHECK (length(trim(name)) > 0),
    role varchar(24) NOT NULL CHECK (role IN ('PLATFORM_ADMIN','HOSPITAL_ADMIN','BILLING','REVIEWER','DIRECTOR','INSURER_DEMO')),
    password_hash varchar(100) NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_user_role_scope CHECK ((role = 'PLATFORM_ADMIN' AND tenant_id IS NULL) OR (role <> 'PLATFORM_ADMIN' AND tenant_id IS NOT NULL)),
    UNIQUE(email),
    UNIQUE(tenant_id,id)
);
CREATE INDEX app_user_tenant_active_idx ON identity.app_user(tenant_id, active);

CREATE TABLE identity.auth_session (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash varchar(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    user_id uuid NOT NULL REFERENCES identity.app_user(id),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at)
);
CREATE INDEX auth_session_user_idx ON identity.auth_session(user_id);
CREATE INDEX auth_session_expiry_idx ON identity.auth_session(expires_at);

ALTER TABLE identity.app_user ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_scope ON identity.app_user USING(tenant_id = identity.current_tenant() OR (tenant_id IS NULL AND identity.is_platform()))
WITH CHECK(tenant_id = identity.current_tenant() OR (tenant_id IS NULL AND identity.is_platform()));

ALTER TABLE identity.auth_session ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_actor ON identity.auth_session USING(user_id = identity.current_actor()) WITH CHECK(user_id = identity.current_actor());

-- The only cross-tenant identity lookups. Public execution is explicitly denied.
-- Fixed search_path prevents object substitution in SECURITY DEFINER routines.
CREATE FUNCTION identity.find_login_user(login_email text) RETURNS SETOF identity.app_user
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, identity, pg_temp
AS $$ SELECT u.* FROM identity.app_user u WHERE u.email = lower(trim(login_email)) AND u.active $$;

CREATE FUNCTION identity.find_session_user(session_token_hash text) RETURNS SETOF identity.app_user
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, identity, pg_temp
AS $$ SELECT u.* FROM identity.app_user u JOIN identity.auth_session s ON s.user_id = u.id
      WHERE s.token_hash = session_token_hash AND s.expires_at > now() AND u.active $$;

REVOKE ALL ON ALL TABLES IN SCHEMA identity FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA identity FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.current_tenant(),identity.current_actor(),identity.is_platform() TO atlas_identity;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.find_login_user(text),identity.find_session_user(text) TO atlas_identity;
GRANT SELECT,INSERT,UPDATE ON identity.app_user TO atlas_identity;
GRANT SELECT,INSERT,DELETE ON identity.auth_session TO atlas_identity;
