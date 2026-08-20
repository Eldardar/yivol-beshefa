ALTER TABLE shifts ADD COLUMN start_hour TEXT;
ALTER TABLE shifts ADD COLUMN end_hour TEXT;
ALTER TABLE shifts ADD COLUMN team_leader_details TEXT NOT NULL DEFAULT '';
