import pg from "pg";

// ponytail: default matches root .env.example; set DATABASE_URL to override
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://greenhouse:greenhouse@127.0.0.1:5432/greenhouse",
});

export default pool;
