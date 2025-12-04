#!/usr/bin/env python3
"""
Direct Database Connection Test
Run this to see exactly what database the worker is connecting to
"""

import os
import sys
from urllib.parse import urlparse, unquote
import psycopg2

# Get DATABASE_URL from environment
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("❌ DATABASE_URL not set!")
    sys.exit(1)

print("=" * 60)
print("  Direct Database Connection Test")
print("=" * 60)
print()

# Parse URL
parsed = urlparse(database_url)
port = parsed.port or 5432
database_name = parsed.path.lstrip('/') if parsed.path else 'postgres'

print(f"📊 Parsed DATABASE_URL:")
print(f"   Host: {parsed.hostname}")
print(f"   Port: {port} (from URL: {parsed.port or 'default 5432'})")
print(f"   Database: {database_name}")
print(f"   User: {parsed.username}")
print()

# Try connection with explicit parameters
conn_params = {
    'host': parsed.hostname,
    'port': port,
    'database': database_name,
    'user': parsed.username,
    'password': unquote(parsed.password) if parsed.password else None,
}

print("🔌 Connecting...")
try:
    conn = psycopg2.connect(**conn_params)
    print("✅ Connected successfully!")
    print()
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)

# Get database info
with conn.cursor() as cursor:
    # Current database
    cursor.execute("SELECT current_database();")
    current_db = cursor.fetchone()[0]
    print(f"📊 Current Database: {current_db}")
    
    # Current user
    cursor.execute("SELECT current_user;")
    current_user = cursor.fetchone()[0]
    print(f"👤 Current User: {current_user}")
    
    # All databases
    cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
    all_dbs = [row[0] for row in cursor.fetchall()]
    print(f"📚 All Databases: {', '.join(all_dbs)}")
    print()
    
    # Check if we're in the right database
    if current_db != database_name:
        print(f"⚠️  WARNING: Connected to '{current_db}' but expected '{database_name}'!")
        print()
    
    # List all schemas
    cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema') ORDER BY schema_name;")
    schemas = [row[0] for row in cursor.fetchall()]
    print(f"📁 Available Schemas: {', '.join(schemas)}")
    print()
    
    # Try to find tables using multiple methods
    print("🔍 Searching for tables...")
    print()
    
    # Method 1: information_schema
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables1 = [row[0] for row in cursor.fetchall()]
    print(f"Method 1 (information_schema): {len(tables1)} tables")
    if len(tables1) > 0:
        print(f"   First 10: {', '.join(tables1[:10])}")
    print()
    
    # Method 2: pg_tables
    cursor.execute("""
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
    """)
    tables2 = [row[0] for row in cursor.fetchall()]
    print(f"Method 2 (pg_tables): {len(tables2)} tables")
    if len(tables2) > 0:
        print(f"   First 10: {', '.join(tables2[:10])}")
    print()
    
    # Method 3: Direct query to jobs
    try:
        cursor.execute("SELECT COUNT(*) FROM public.jobs;")
        jobs_count = cursor.fetchone()[0]
        print(f"Method 3 (direct jobs query): ✅ jobs table exists with {jobs_count} records")
    except Exception as e:
        print(f"Method 3 (direct jobs query): ❌ {e}")
    print()
    
    # Check permissions
    cursor.execute("""
        SELECT has_table_privilege('public', 'jobs', 'SELECT') as can_select,
               has_table_privilege('public', 'jobs', 'INSERT') as can_insert,
               has_table_privilege('public', 'jobs', 'UPDATE') as can_update;
    """)
    perms = cursor.fetchone()
    print(f"🔐 Permissions on jobs table:")
    print(f"   SELECT: {perms[0]}")
    print(f"   INSERT: {perms[1]}")
    print(f"   UPDATE: {perms[2]}")
    print()

conn.close()

print("=" * 60)
print("  Summary")
print("=" * 60)
print()

if len(tables1) == 0 and len(tables2) == 0:
    print("❌ PROBLEM: No tables found in 'public' schema!")
    print()
    print("Possible causes:")
    print("1. Wrong database (empty database)")
    print("2. Wrong schema (tables in different schema)")
    print("3. Permissions issue (can't see tables)")
    print("4. Connection pooler (read-only replica)")
    print()
    print("🔧 Try:")
    print("1. Use External Database URL instead of Internal")
    print("2. Check if backend can see tables (it should)")
    print("3. Verify DATABASE_URL matches backend exactly")
else:
    print(f"✅ Found {len(tables1)} tables using information_schema")
    if 'jobs' in tables1:
        print("✅ 'jobs' table exists!")
    else:
        print("❌ 'jobs' table NOT found in list!")

