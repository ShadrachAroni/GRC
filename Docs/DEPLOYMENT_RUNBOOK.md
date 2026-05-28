# SecureBank GRC Platform - Operational Deployment Runbook

This document serves as the operational guide for deploying, managing, and
maintaining the SecureBank GRC Platform in target environments.

---

## 1. System Boot Operations (Docker Compose)

The entire GRC stack is containerized and managed using Docker Compose.

### Step-by-Step Boot Procedure

1. **Configure Environment Variables**: Ensure a production-ready `.env` file
   exists in the project root directory. Use [`.env.example`] as a baseline.

2. **Build and Boot the Containers**: To build the production images and start
   all services in detached (background) mode, run:
   ```bash
   docker compose up --build -d
   ```

3. **Verify Container Health**: Check the status of the containers using:
   ```bash
   docker compose ps
   ```
   Both the `api` and `frontend` services are configured with health checks to
   ensure they are fully responsive before being marked healthy.

4. **Shutdown Stack**: To safely shut down the services and preserve volumes,
   run:
   ```bash
   docker compose down
   ```

---

## 2. Database Migrations (SQLAlchemy & Alembic)

The database schema is defined using SQLAlchemy. Tables are automatically
initialized on startup, but production schema updates are managed via Alembic.

### Running Migrations

1. **Apply Existing Migrations**: To update the database schema to the latest
   version, run the following command inside the API container:
   ```bash
   docker compose exec api alembic upgrade head
   ```

2. **Generate a New Migration**: If you make changes to `api/models.py`,
   generate a new migration script:
   ```bash
   docker compose exec api alembic revision --autogenerate -m "Describe schema changes"
   ```

3. **Rollback Migrations**: To roll back the last migration:
   ```bash
   docker compose exec api alembic downgrade -1
   ```

---

## 3. Cryptographic Key & API Credential Rotation Policy

To comply with GRC security controls (specifically **Control 13: Key Rotation
Policy**), secrets must be rotated periodically or immediately upon suspected
compromise.

### Rotation Schedule

| Secret Identifier       | Recommended Frequency | Impact / Side-effects                                       |
| ----------------------- | --------------------- | ----------------------------------------------------------- |
| `JWT_SECRET_KEY`        | Every 90 days         | Revokes all active user sessions; users must log back in.   |
| `POSTGRES_PASSWORD`     | Every 90 days         | Requires brief API downtime to update database credentials. |
| `STRIPE_WEBHOOK_SECRET` | Every 90 days         | No downtime; verify new signatures in Stripe dashboard.     |

### Step-by-Step Rotation Procedures

#### A. Rotating JWT Secret Key

1. Generate a new cryptographically secure 256-bit key:
   ```bash
   openssl rand -hex 32
   ```
2. Open the `.env` configuration file and update the `JWT_SECRET_KEY` value:
   ```env
   JWT_SECRET_KEY=new_generated_hex_string
   ```
3. Restart the API service to pick up the new environment:
   ```bash
   docker compose up -d --no-deps api
   ```

#### B. Rotating PostgreSQL Password

1. Connect to the PostgreSQL database and update the database user's password:
   ```bash
   docker compose exec -it db psql -U postgres -d grcdb -c "ALTER USER grc WITH PASSWORD 'new_strong_password';"
   ```
2. Update the `.env` database connection string:
   ```env
   DATABASE_URL=postgresql://grc:new_strong_password@db:5432/grcdb
   ```
3. Update the `POSTGRES_PASSWORD` under the `db` service environment if
   applicable.
4. Restart the stack to refresh database connections:
   ```bash
   docker compose down
   docker compose up -d
   ```

---

## 4. Disaster Recovery & Database State Recovery

Periodic database backups prevent data loss and support recovery in the event of
an infrastructure failure.

### Database Backups (pg_dump)

To create a compressed binary backup of the PostgreSQL database, run:

```bash
# Create backups folder in host system if not exists
mkdir -p backups

# Export database contents to a backup file
docker compose exec -t db pg_dump -U grc -d grcdb -F c -b -v -f /var/lib/postgresql/data/grcdb_backup.dump
```

Copy the dump file out of the container for offsite storage:

```bash
docker compose cp db:/var/lib/postgresql/data/grcdb_backup.dump ./backups/grcdb_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Database Recovery (pg_restore)

To restore database state from a backup dump file:

1. Copy the backup file into the database container:
   ```bash
   docker compose cp ./backups/your_backup_file.dump db:/var/lib/postgresql/data/restore.dump
   ```

2. Terminate active sessions to the database to release locks:
   ```bash
   docker compose exec -t db psql -U postgres -d grcdb -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'grcdb' AND pid <> pg_backend_pid();"
   ```

3. Run `pg_restore` to drop, recreate tables, and populate data:
   ```bash
   docker compose exec -t db pg_restore -U grc -d grcdb --clean --no-owner /var/lib/postgresql/data/restore.dump
   ```

4. Verify migration state and data presence by querying table counts:
   ```bash
   docker compose exec -t db psql -U grc -d grcdb -c "SELECT COUNT(*) FROM risks;"
   ```
