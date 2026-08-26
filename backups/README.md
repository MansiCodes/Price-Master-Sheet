# Database dump for AWS deploy

Share these two files with the other developer (do **not** share `.env`):

| File | Purpose |
|------|---------|
| `backups/01-schema.sql` | Tables, enums, indexes |
| `backups/02-data.sql` | All row data (INSERTs) |

## On AWS (target Postgres / RDS)

1. Point `DATABASE_URL` at the empty AWS database.
2. Apply schema (pick one):

```bash
npx prisma db push
```

or:

```bash
psql "$DATABASE_URL" -f backups/01-schema.sql
```

3. Load data:

```bash
psql "$DATABASE_URL" -f backups/02-data.sql
```

4. Regenerate client if needed:

```bash
npx prisma generate
```

## Notes

- `02-data.sql` truncates tables then inserts — safe on a fresh DB; will wipe existing rows on a non-empty DB.
- Contains users (password hashes), production entries, machines, cable options, etc.
- Files are gitignored under `backups/*.sql` — send via secure share (Drive, S3, zip), not a public gist.
