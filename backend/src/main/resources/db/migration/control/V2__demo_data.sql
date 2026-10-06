DO $$
BEGIN
    IF NOT '${demoEnabled}'::boolean THEN RETURN; END IF;
    INSERT INTO control.tenant(id,name,slug,status,is_demo,contact_email) VALUES
    ('11111111-1111-1111-1111-111111111111','Hospital Aurora · DEMO','hospital-aurora-demo','ACTIVE',true,'admin@demo.atlaslink.mx'),
    ('22222222-2222-2222-2222-222222222222','Clínica Horizonte · DEMO','clinica-horizonte-demo','ACTIVE',true,'otro@demo.atlaslink.mx');
    INSERT INTO control.license(id,tenant_id,plan,status,seat_limit,monthly_account_limit,starts_at,expires_at,billing_cycle) VALUES
    ('b0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Hospital','ACTIVE',25,2500,now()-interval '15 days',now()+interval '350 days','ANNUAL'),
    ('b0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Exploración','TRIAL',5,100,now(),now()+interval '30 days','MONTHLY');
END $$;
