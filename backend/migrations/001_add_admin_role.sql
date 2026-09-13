-- Apply this once to an existing database created from an older init.sql.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';