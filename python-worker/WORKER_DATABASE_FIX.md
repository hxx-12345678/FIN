# Python Worker Database Connection Fix

## Problem

Python worker shows:
```
Found 0 tables: 
❌ 'jobs' table does not exist in database!
```

But we verified the production database has 32 tables including `jobs`.

## Root Cause

The Python worker's `DATABASE_URL` environment variable is **different** from the backend's `DATABASE_URL`, OR it's pointing to an empty database.

## Solution: Verify DATABASE_URL Matches

### Step 1: Get Backend DATABASE_URL

1. Go to **Render Dashboard**
2. Open your **Backend Service**
3. Go to **Environment** tab
4. Find `DATABASE_URL`
5. **Copy the entire value**

It should look like:
```
postgresql://finapilot_user:YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO@dpg-d4o2nomuk2gs7385k770-a.oregon-postgres.render.com/finapilot
```

### Step 2: Set Python Worker DATABASE_URL

1. Go to **Render Dashboard**
2. Open your **Python Worker Service**
3. Go to **Environment** tab
4. Find `DATABASE_URL`
5. **Paste the EXACT same value** from backend
6. **Save**

### Step 3: Verify

After updating, the worker will:
- Show connection details on startup
- List all tables found
- Verify `jobs` table exists
- Start processing jobs

---

## Expected Output After Fix

When DATABASE_URL is correct, you should see:

```
🔌 Connecting to database: postgresql://finapilot_user:***@dpg-d4o2nomuk2gs7385k770-a:5432/finapilot
📊 Database Info:
   Current Database: finapilot
   Current Schema: public
   Available Schemas: public
   Tables in 'public' schema: 32
   First 10 tables: _prisma_migrations, ai_cfo_plans, alert_rules, ...
✅ Database connection successful
✅ 'jobs' table verified
```

---

## Quick Checklist

- [ ] Backend DATABASE_URL copied
- [ ] Python Worker DATABASE_URL matches exactly
- [ ] No extra spaces or characters
- [ ] Both services use same database
- [ ] Worker redeployed after updating DATABASE_URL

---

## If Still Not Working

If you still see "0 tables", check:

1. **Database Name**: Ensure both point to `finapilot` database
2. **Host**: Ensure both point to same host (`dpg-d4o2nomuk2gs7385k770-a.oregon-postgres.render.com`)
3. **User**: Ensure both use same user (`finapilot_user`)
4. **Password**: Ensure password matches

The worker now shows detailed connection info to help debug!

