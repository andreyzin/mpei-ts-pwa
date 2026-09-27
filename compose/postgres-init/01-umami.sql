-- Runs once, when the postgres volume is created. The bot uses the default
-- database from POSTGRES_DB; Umami keeps its tables apart in its own.
CREATE DATABASE umami;
