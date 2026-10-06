-- תמחור מדורג לפי כמות: מערך JSON של מדרגות {aboveQuantity, rateNis, appliesToAll}; NULL = תעריף אחיד
ALTER TABLE field_unit_rates ADD COLUMN tiers TEXT;
