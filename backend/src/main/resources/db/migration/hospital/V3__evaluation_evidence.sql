-- Keep legacy evaluations honest: their historical inputs cannot be reconstructed
-- from current, mutable lines. No backfill and no change to append-only evidence.
ALTER TABLE hospital.evaluation
    ADD COLUMN input_snapshot jsonb,
    ADD COLUMN rules_snapshot jsonb,
    ADD COLUMN result_snapshot jsonb,
    ADD COLUMN engine_artifact_sha256 varchar(64),
    ADD CONSTRAINT evaluation_evidence_complete CHECK (
        (input_snapshot IS NULL AND rules_snapshot IS NULL AND result_snapshot IS NULL AND engine_artifact_sha256 IS NULL)
        OR
        (input_snapshot IS NOT NULL AND rules_snapshot IS NOT NULL AND result_snapshot IS NOT NULL
         AND engine_artifact_sha256 IS NOT NULL
         AND jsonb_typeof(input_snapshot) = 'object'
         AND jsonb_typeof(rules_snapshot) = 'object'
         AND jsonb_typeof(result_snapshot) = 'object'
         AND engine_artifact_sha256 ~ '^[a-f0-9]{64}$')
    );

CREATE FUNCTION hospital.require_evaluation_evidence() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.input_snapshot IS NULL OR NEW.rules_snapshot IS NULL OR NEW.result_snapshot IS NULL OR NEW.engine_artifact_sha256 IS NULL THEN
        RAISE EXCEPTION 'New evaluations require complete reproducible evidence' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION hospital.require_evaluation_evidence() FROM PUBLIC;
CREATE TRIGGER evaluation_requires_evidence BEFORE INSERT ON hospital.evaluation
FOR EACH ROW EXECUTE FUNCTION hospital.require_evaluation_evidence();
