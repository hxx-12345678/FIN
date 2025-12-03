# Database Setup for Python Worker

## Problem

The Python worker is getting this error:
```
relation "jobs" does not exist
```

This means the database migrations haven't been run yet on your production database.

## Solution: Run Database Migrations

The `jobs` table (and other tables) need to be created in your PostgreSQL database. You have two options:

### Option 1: Run Migrations from Backend (Recommended)

Since your backend already has Prisma set up, run migrations from there:

1. **SSH into your backend service** (if possible), OR
2. **Run migrations via Render Shell** (if available), OR
3. **Add a migration script to backend** that runs on startup

### Option 2: Run Migrations Manually

Connect to your PostgreSQL database and run the migration SQL files.

---

## Quick Fix: Add Migration Check to Backend

The easiest solution is to ensure your backend runs migrations on startup. Check if your backend has this in `backend/src/app.ts` or similar:

```typescript
// Run migrations on startup (production)
if (process.env.NODE_ENV === 'production') {
  await prisma.$executeRaw`SELECT 1`; // Test connection
  // Prisma migrations should be run via: npx prisma migrate deploy
}
```

### Steps to Fix:

1. **Go to your Backend service on Render**
2. **Check if migrations are being run** - Look for migration commands in build/start scripts
3. **If not, add migration step:**

   In Render Dashboard → Backend Service → Settings:
   
   **Build Command:**
   ```bash
   npm install && npx prisma generate && npx prisma migrate deploy
   ```
   
   OR add to **Start Command** (before starting server):
   ```bash
   npx prisma migrate deploy && npm start
   ```

---

## Manual Migration (If Needed)

If you need to run migrations manually:

1. **Get your DATABASE_URL** from Render (Backend service → Environment)
2. **Connect to database** using psql or a database client
3. **Run the migration SQL files** in order:
   - `backend/prisma/migrations/20251114135522_init/migration.sql` (creates jobs table)
   - Other migration files in chronological order

---

## Verify Tables Exist

After running migrations, verify the `jobs` table exists:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'jobs';
```

You should see `jobs` in the results.

---

## After Migrations Run

Once migrations are complete:
1. The Python worker will stop showing "relation jobs does not exist" errors
2. The worker will start polling for jobs successfully
3. You'll see in logs: `✅ Database connection successful` (without errors)

---

## Important Notes

- **Same Database**: Both backend and Python worker MUST use the same `DATABASE_URL`
- **Migrations Once**: Migrations only need to be run once (not on every deploy)
- **Backend First**: Run migrations from backend, then worker will work
- **Check Backend**: If backend is working, migrations are likely already run - check DATABASE_URL matches

