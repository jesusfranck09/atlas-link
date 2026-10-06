-- Entirely synthetic hospitals, insurers, references, conventions and prices.
-- Dates are relative to installation so a newly installed demo stays usable.
DO $$
DECLARE
    tenant_one uuid := '11111111-1111-1111-1111-111111111111';
    tenant_two uuid := '22222222-2222-2222-2222-222222222222';
    insurer_one uuid := 'c0000000-0000-0000-0000-000000000001';
    insurer_two uuid := 'c0000000-0000-0000-0000-000000000002';
    insurer_three uuid := 'c0000000-0000-0000-0000-000000000003';
    reviewer uuid := 'a0000000-0000-0000-0000-000000000004';
    biller uuid := 'a0000000-0000-0000-0000-000000000003';
    rule_set jsonb := '{"tariffs":{"HAB-DIA":4500,"LAB-BAS":850,"FAR-DEMO":350,"CIR-DEMO":45000},"excludedCodes":["KIT-PER"],"maxQuantities":{"HAB-DIA":10,"LAB-BAS":3,"FAR-DEMO":5},"highRiskThreshold":20000}'::jsonb;
    i integer; scenario integer; tenant_key uuid; account_key uuid; agreement_key uuid;
    insurer_key uuid; insurer_name text; line_one uuid; line_two uuid; line_three uuid;
    line_four uuid; event_time timestamptz; account_status text; account_lane text;
    findings_value jsonb; billed numeric; excluded numeric; adjustment numeric;
    deductible_value numeric; coinsurance_value numeric; insurer_value numeric;
    patient_value numeric; unresolved_value numeric; amount_available numeric;
BEGIN
    IF NOT '${demoEnabled}'::boolean THEN RETURN; END IF;
    INSERT INTO hospital.insurer(id,name,code) VALUES
    (insurer_one,'Áurea Salud · DEMO','AUREA'),
    (insurer_two,'Nova Protección · DEMO','NOVA'),
    (insurer_three,'Solum Seguros · DEMO','SOLUM');

    INSERT INTO hospital.agreement(id,tenant_id,insurer_id,insurer,name,version,status,valid_from,valid_to,rules,published_at) VALUES
    ('d0000000-0000-0000-0000-000000000001',tenant_one,insurer_one,'Áurea Salud · DEMO','Convenio demostrativo Áurea',1,'PUBLISHED',current_date-365,current_date+365,rule_set,now()-interval '20 days'),
    ('d0000000-0000-0000-0000-000000000002',tenant_one,insurer_two,'Nova Protección · DEMO','Convenio demostrativo Nova',1,'PUBLISHED',current_date-365,current_date+365,rule_set,now()-interval '20 days'),
    ('d0000000-0000-0000-0000-000000000003',tenant_one,insurer_three,'Solum Seguros · DEMO','Convenio Solum pendiente de revisión',1,'DRAFT',current_date-365,current_date+365,rule_set,NULL),
    ('d0000000-0000-0000-0000-000000000004',tenant_two,insurer_one,'Áurea Salud · DEMO','Convenio Horizonte · DEMO',1,'PUBLISHED',current_date-365,current_date+365,rule_set,now()-interval '20 days');

    FOR i IN 1..20 LOOP
        tenant_key := CASE WHEN i <= 18 THEN tenant_one ELSE tenant_two END;
        scenario := CASE WHEN i <= 18 THEN i % 6 ELSE 0 END;
        account_key := ('e0000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid;
        line_one := md5('atlas-demo-line-one-'||i)::uuid;
        line_two := md5('atlas-demo-line-two-'||i)::uuid;
        line_three := md5('atlas-demo-line-three-'||i)::uuid;
        line_four := md5('atlas-demo-line-four-'||i)::uuid;
        insurer_key := CASE WHEN i % 2 = 0 THEN insurer_one ELSE insurer_two END;
        insurer_name := CASE WHEN i % 2 = 0 THEN 'Áurea Salud · DEMO' ELSE 'Nova Protección · DEMO' END;
        agreement_key := CASE WHEN i % 2 = 0 THEN 'd0000000-0000-0000-0000-000000000001'::uuid ELSE 'd0000000-0000-0000-0000-000000000002'::uuid END;
        IF i > 18 THEN
            insurer_key := insurer_one; insurer_name := 'Áurea Salud · DEMO';
            agreement_key := 'd0000000-0000-0000-0000-000000000004';
        END IF;
        IF i = 17 THEN
            insurer_key := insurer_three; insurer_name := 'Solum Seguros · DEMO'; agreement_key := NULL;
        END IF;
        event_time := now() - (i || ' days')::interval;
        account_status := CASE WHEN i <= 9 OR i > 18 THEN 'EVALUATED' WHEN i <= 13 THEN 'IN_REVIEW' WHEN i <= 15 THEN 'READY' WHEN i <= 17 THEN 'SENT' ELSE 'RESOLVED' END;
        billed := 10900; excluded := 0; adjustment := 0; deductible_value := 1000;
        coinsurance_value := 990; insurer_value := 8910; patient_value := 1990;
        unresolved_value := 0; amount_available := 500000; account_lane := 'GREEN'; findings_value := '[]';
        CASE scenario
            WHEN 1 THEN
                billed := 11900; adjustment := 1000; account_lane := 'YELLOW';
                findings_value := jsonb_build_array(jsonb_build_object('lineId',line_one,'code','ABOVE_TARIFF','message','Precio por encima del tabulador contractual.','severity','YELLOW','amount',1000));
            WHEN 2 THEN
                billed := 12100; excluded := 1200; unresolved_value := 1200; account_lane := 'RED';
                findings_value := jsonb_build_array(jsonb_build_object('lineId',line_four,'code','EXCLUDED','message','Concepto excluido del convenio; responsabilidad por confirmar.','severity','RED','amount',1200));
            WHEN 3 THEN
                deductible_value := 0; coinsurance_value := 0; insurer_value := 0; patient_value := 0; unresolved_value := billed; account_lane := 'YELLOW';
                findings_value := jsonb_build_array(jsonb_build_object('lineId',NULL,'code','POLICY_INCOMPLETE','message','Faltan parámetros confirmados de póliza; no se atribuyen importes al paciente.','severity','YELLOW','amount',billed));
            WHEN 4 THEN
                coinsurance_value := 905; insurer_value := 8145; patient_value := 1905; unresolved_value := 850; account_lane := 'RED';
                findings_value := jsonb_build_array(jsonb_build_object('lineId',line_two,'code','UNMAPPED_CODE','message','Código sin tabulador homologado.','severity','RED','amount',850));
            WHEN 5 THEN
                amount_available := 5000; insurer_value := 5000; unresolved_value := 3910; account_lane := 'RED';
                findings_value := jsonb_build_array(jsonb_build_object('lineId',NULL,'code','COVERAGE_LIMIT','message','La estimación supera la cobertura disponible; responsabilidad pendiente.','severity','RED','amount',3910));
            ELSE NULL;
        END CASE;
        IF i = 17 THEN
            deductible_value := 0; coinsurance_value := 0; insurer_value := 0; patient_value := 0; unresolved_value := billed;
            findings_value := jsonb_build_array(jsonb_build_object('lineId',NULL,'code','NO_AGREEMENT','message','No hay convenio publicado vigente para la fecha de egreso.','severity','RED','amount',billed));
        END IF;
        INSERT INTO hospital.hospital_account(id,tenant_id,folio,patient_reference,insurer,insurer_id,admission_date,discharge_date,diagnosis_code,policy_number,deductible,coinsurance_rate,coinsurance_cap,available_coverage,status,lane,assigned_to,agreement_id,total,anomaly_count,version,created_at,updated_at,idempotency_key,result,authorized_amount,outcome_reason,outcome_at)
        VALUES(account_key,tenant_key,'DEMO-'||lpad(i::text,5,'0'),'PAC-SINT-'||lpad(i::text,4,'0'),insurer_name,insurer_key,current_date-i-3,current_date-i,'DEMO','POL-SINT-'||lpad(i::text,4,'0'),CASE WHEN scenario=3 THEN NULL ELSE 1000 END,CASE WHEN scenario=3 THEN NULL ELSE 0.10 END,CASE WHEN scenario=3 THEN NULL ELSE 20000 END,CASE WHEN scenario=3 THEN NULL ELSE amount_available END,account_status,account_lane,CASE WHEN i BETWEEN 10 AND 18 THEN reviewer ELSE NULL END,agreement_key,billed,jsonb_array_length(findings_value),1,event_time,event_time+interval '20 minutes','seed-'||i,CASE WHEN i=18 THEN 'APPROVED' ELSE NULL END,CASE WHEN i=18 THEN insurer_value ELSE NULL END,CASE WHEN i=18 THEN 'Resultado manual sintético para demostración.' ELSE NULL END,CASE WHEN i=18 THEN event_time+interval '1 day' ELSE NULL END);

        INSERT INTO hospital.account_line(id,tenant_id,account_id,code,description,category,quantity,unit_price,status,reason,service_date) VALUES
        (line_one,tenant_key,account_key,'HAB-DIA','Habitación estándar · precio demostrativo','ESTANCIA',2,CASE WHEN scenario=1 THEN 5000 ELSE 4500 END,CASE WHEN scenario=1 THEN 'ANOMALY' ELSE 'ACCEPTED' END,CASE WHEN scenario=1 THEN 'Precio por encima del tabulador contractual.' ELSE NULL END,current_date-i-2),
        (line_two,tenant_key,account_key,CASE WHEN scenario=4 THEN 'LAB-X' ELSE 'LAB-BAS' END,'Panel de laboratorio · demostración','ESTUDIOS',1,850,CASE WHEN scenario=4 THEN 'ANOMALY' ELSE 'ACCEPTED' END,CASE WHEN scenario=4 THEN 'Código sin tabulador homologado.' ELSE NULL END,current_date-i-1),
        (line_three,tenant_key,account_key,'FAR-DEMO','Suministro sintético · sin prescripción','FARMACIA',3,350,'ACCEPTED',NULL,current_date-i-1);
        IF scenario=2 THEN
            INSERT INTO hospital.account_line(id,tenant_id,account_id,code,description,category,quantity,unit_price,status,reason,service_date)
            VALUES(line_four,tenant_key,account_key,'KIT-PER','Kit personal no cubierto · demostración','MATERIAL',1,1200,'ANOMALY','Concepto excluido del convenio; responsabilidad por confirmar.',current_date-i);
        END IF;

        INSERT INTO hospital.evaluation(id,tenant_id,account_id,agreement_id,agreement_version,engine_version,billed_total,excluded_total,tariff_adjustment,deductible,coinsurance,insurer_estimate,patient_estimate,unresolved_amount,lane,findings,created_at,created_by)
        VALUES(md5('atlas-demo-evaluation-'||i)::uuid,tenant_key,account_key,agreement_key,CASE WHEN agreement_key IS NULL THEN NULL ELSE 1 END,'1.0.0',billed,excluded,adjustment,deductible_value,coinsurance_value,insurer_value,patient_value,unresolved_value,account_lane,findings_value,event_time+interval '2 minutes',CASE WHEN i<=18 THEN biller ELSE 'a0000000-0000-0000-0000-000000000007'::uuid END);
        INSERT INTO hospital.account_history(tenant_id,account_id,actor_id,action,description,created_at) VALUES
        (tenant_key,account_key,CASE WHEN i<=18 THEN biller ELSE 'a0000000-0000-0000-0000-000000000007'::uuid END,'RECEIVED','Cuenta sintética recibida para demostración.',event_time),
        (tenant_key,account_key,CASE WHEN i<=18 THEN biller ELSE 'a0000000-0000-0000-0000-000000000007'::uuid END,'EVALUATED','Evaluación con parámetros demostrativos; no constituye autorización de pago.',event_time+interval '2 minutes');
        IF i BETWEEN 10 AND 18 THEN
            INSERT INTO hospital.account_history(tenant_id,account_id,actor_id,action,description,created_at)
            VALUES(tenant_key,account_key,reviewer,'CLAIMED','Cuenta asignada a revisión de demostración.',event_time+interval '5 minutes');
        END IF;
        IF i BETWEEN 14 AND 18 THEN
            INSERT INTO hospital.account_history(tenant_id,account_id,actor_id,action,description,created_at)
            VALUES(tenant_key,account_key,reviewer,'READY',CASE WHEN account_lane='GREEN' THEN 'Cuenta preparada para exportación.' ELSE 'Aceptación explícita de riesgo para el recorrido de demostración.' END,event_time+interval '10 minutes');
        END IF;
        IF i BETWEEN 16 AND 18 THEN
            INSERT INTO hospital.account_history(tenant_id,account_id,actor_id,action,description,created_at)
            VALUES(tenant_key,account_key,biller,'SENT','Envío registrado manualmente en el escenario sintético.',event_time+interval '15 minutes');
        END IF;
        IF i=18 THEN
            INSERT INTO hospital.account_history(tenant_id,account_id,actor_id,action,description,created_at)
            VALUES(tenant_key,account_key,biller,'OUTCOME_RECORDED','Aprobación sintética registrada manualmente.',event_time+interval '1 day');
        END IF;
        INSERT INTO hospital.audit_event(tenant_id,actor_id,action,entity_type,entity_id,details,created_at)
        VALUES(tenant_key,CASE WHEN i<=18 THEN biller ELSE 'a0000000-0000-0000-0000-000000000007'::uuid END,'DEMO_ACCOUNT_CREATED','ACCOUNT',account_key,jsonb_build_object('demo',true,'source','synthetic_seed'),event_time);
    END LOOP;
END $$;
