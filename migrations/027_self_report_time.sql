ALTER TABLE shift_pickers ADD COLUMN self_reported_at TEXT;
UPDATE shift_pickers SET self_reported_at=(
 SELECT MIN(a.created_at) FROM audit_events a
 WHERE a.actor_id=shift_pickers.user_id AND a.action='SELF_REPORT' AND a.entity_type='SHIFT' AND a.entity_id=shift_pickers.shift_id
);
