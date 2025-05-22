ALTER TABLE system_status
    ADD COLUMN last_event_id UUID NOT NULL,
    ADD COLUMN last_event_version INTEGER NOT NULL;