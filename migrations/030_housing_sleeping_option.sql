ALTER TABLE housing_status ADD COLUMN sleeping_option_id INTEGER REFERENCES village_sleeping_options(id) ON DELETE SET NULL;
