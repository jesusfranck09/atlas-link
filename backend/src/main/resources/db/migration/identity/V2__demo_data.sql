-- Explicit opt-in. Never enables demo credentials on a non-demo deployment.
DO $$
DECLARE
    demo_hash text := '$2y$12$gjoKjyL3K26EtWgNkRYGl.rGgUtbka1we2ac4GMHXfuJoXQfexxF6';
BEGIN
    IF NOT '${demoEnabled}'::boolean THEN RETURN; END IF;
    INSERT INTO identity.app_user(id,tenant_id,email,name,role,password_hash,active) VALUES
    ('a0000000-0000-0000-0000-000000000001',NULL,'atlas@demo.atlaslink.mx','Marina Solís · Demo','PLATFORM_ADMIN',demo_hash,true),
    ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','admin@demo.atlaslink.mx','Ana Beltrán · Demo','HOSPITAL_ADMIN',demo_hash,true),
    ('a0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','caja@demo.atlaslink.mx','Camila Vega · Demo','BILLING',demo_hash,true),
    ('a0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','auditor@demo.atlaslink.mx','Diego Navarro · Demo','REVIEWER',demo_hash,true),
    ('a0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','direccion@demo.atlaslink.mx','Elena Robles · Demo','DIRECTOR',demo_hash,true),
    ('a0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','aseguradora@demo.atlaslink.mx','Santiago Cruz · Demo','INSURER_DEMO',demo_hash,true),
    ('a0000000-0000-0000-0000-000000000007','22222222-2222-2222-2222-222222222222','otro@demo.atlaslink.mx','Perfil aislamiento · Demo','HOSPITAL_ADMIN',demo_hash,true),
    ('a0000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','baja@demo.atlaslink.mx','Cuenta desactivada · Demo','BILLING',demo_hash,false);
END $$;
