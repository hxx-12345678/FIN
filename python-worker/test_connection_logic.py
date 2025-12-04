#!/usr/bin/env python3
"""
Test the EXACT connection logic used by the worker
This simulates what happens when worker.py runs
"""

import os
import sys
from urllib.parse import urlparse, unquote
import psycopg2

# Simulate the EXACT logic from utils/db.py
def test_db_connection_logic(database_url):
    """Test the exact connection logic from get_db_connection()"""
    print("="*60)
    print("  TESTING EXACT WORKER CONNECTION LOGIC")
    print("="*60)
    print()
    
    if not database_url:
        print("❌ DATABASE_URL not provided")
        return False
    
    # Parse URL (exact logic from utils/db.py)
    parsed = urlparse(database_url)
    port = parsed.port or 5432
    database_name = parsed.path.lstrip('/') if parsed.path else 'postgres'
    
    safe_url = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{port}/{database_name}"
    print(f"[CONNECT] Connecting to database: {safe_url}")
    
    # Connection parameters (exact logic from utils/db.py)
    conn_params = {
        'host': parsed.hostname,
        'port': port,
        'database': database_name,
        'user': parsed.username,
        'password': unquote(parsed.password) if parsed.password else None,
    }
    
    print(f"[CONNECT] Connection parameters:")
    print(f"   Host: {conn_params['host']}")
    print(f"   Port: {conn_params['port']}")
    print(f"   Database: {conn_params['database']}")
    print(f"   User: {conn_params['user']}")
    print()
    
    try:
        # Connect (exact method from utils/db.py)
        print("[CONNECT] Attempting connection...")
        conn = psycopg2.connect(**conn_params)
        print("[SUCCESS] Connection successful!")
        print()
        
        # Set search_path (exact logic from utils/db.py)
        try:
            with conn.cursor() as cursor:
                cursor.execute("SET search_path TO public;")
                conn.commit()
                print("[SUCCESS] Set search_path to 'public'")
        except Exception as e:
            conn.rollback()
            print(f"❌ Failed to set search_path: {e}")
            return False
        
        # Verify connection and get database info (exact logic from utils/db.py)
        try:
            with conn.cursor() as cursor:
                # Get current database name
                cursor.execute("SELECT current_database();")
                current_db = cursor.fetchone()[0]
                
                # Get current schema
                cursor.execute("SELECT current_schema();")
                current_schema = cursor.fetchone()[0]
                
                # Get all schemas
                cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema');")
                schemas = [row[0] for row in cursor.fetchall()]
                
                # Try multiple methods to list tables (exact logic from utils/db.py)
                tables = []
                
                # Method 1: information_schema
                try:
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                        ORDER BY table_name;
                    """)
                    tables = [row[0] for row in cursor.fetchall()]
                    if len(tables) > 0:
                        print(f"[SUCCESS] Found {len(tables)} tables using information_schema")
                except Exception as e:
                    conn.rollback()
                    print(f"[WARNING] information_schema query failed: {e}")
                
                # Method 2: pg_tables (if information_schema doesn't work)
                if len(tables) == 0:
                    try:
                        cursor.execute("""
                            SELECT tablename 
                            FROM pg_tables 
                            WHERE schemaname = 'public'
                            ORDER BY tablename;
                        """)
                        tables = [row[0] for row in cursor.fetchall()]
                        if len(tables) > 0:
                            print(f"[SUCCESS] Found {len(tables)} tables using pg_tables")
                        else:
                            print("[WARNING] pg_tables returned 0 tables")
                    except Exception as e:
                        conn.rollback()
                        print(f"[WARNING] pg_tables query failed: {e}")
                
                # Method 3: Direct query to jobs table (test if it exists)
                if len(tables) == 0:
                    try:
                        cursor.execute("SELECT 1 FROM public.jobs LIMIT 1;")
                        tables = ['jobs (exists but not in schema queries)']
                        print("[WARNING] jobs table exists but not visible in schema queries (permissions issue?)")
                    except Exception as e:
                        conn.rollback()
                        if 'does not exist' in str(e) or 'relation' in str(e).lower():
                            print("[ERROR] jobs table does not exist")
                        else:
                            print(f"[WARNING] Direct jobs query error: {e}")
                
                print(f"\n📊 Database Info:")
                print(f"   Current Database: {current_db}")
                print(f"   Current Schema: {current_schema}")
                print(f"   Available Schemas: {', '.join(schemas)}")
                print(f"   Tables in 'public' schema: {len(tables)}")
                if len(tables) > 0:
                    print(f"   First 10 tables: {', '.join(tables[:10])}")
                
                # Verify jobs table exists (exact logic from utils/db.py)
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'jobs'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                print()
                if table_exists:
                    print("[SUCCESS] 'jobs' table EXISTS!")
                    
                    # Test direct query to jobs table
                    cursor.execute("SELECT COUNT(*) FROM public.jobs;")
                    jobs_count = cursor.fetchone()[0]
                    print(f"[SUCCESS] Jobs table has {jobs_count} records")
                    
                    conn.close()
                    return True
                else:
                    print("[ERROR] 'jobs' table does NOT exist!")
                    
                    # Get all databases for debugging
                    all_databases = []
                    try:
                        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
                        all_databases = [row[0] for row in cursor.fetchall()]
                    except:
                        pass
                    
                    print(f"\n[DIAGNOSTIC] Diagnostic Info:")
                    print(f"   All Databases on Server: {', '.join(all_databases[:5])}")
                    print(f"   Current Database: {current_db}")
                    print(f"   Tables Found: {len(tables)}")
                    
                    conn.close()
                    return False
                    
        except Exception as e:
            conn.rollback()
            print(f"[ERROR] Error verifying database: {e}")
            conn.close()
            return False
        
    except psycopg2.OperationalError as e:
        print(f"[ERROR] Connection failed: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return False

def main():
    print()
    print("This script tests the EXACT connection logic used by worker.py")
    print("It simulates what happens when the worker starts up.")
    print()
    
    # Test with Internal URL
    internal_url = "postgresql://finapilot_user:YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO@dpg-d4o2nomuk2gs7385k770-a/finapilot"
    print("\n" + "="*60)
    print("TEST 1: Internal Database URL")
    print("="*60)
    internal_result = test_db_connection_logic(internal_url)
    
    # Test with External URL
    external_url = "postgresql://finapilot_user:YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO@dpg-d4o2nomuk2gs7385k770-a.oregon-postgres.render.com:5432/finapilot"
    print("\n" + "="*60)
    print("TEST 2: External Database URL")
    print("="*60)
    external_result = test_db_connection_logic(external_url)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print()
    print(f"Internal URL: {'[SUCCESS] WORKS' if internal_result else '[FAILED] FAILED'}")
    print(f"External URL: {'[SUCCESS] WORKS' if external_result else '[FAILED] FAILED'}")
    print()
    
    if external_result:
        print("[SUCCESS] USE EXTERNAL URL IN RENDER")
        print(f"   {external_url.replace('YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO', '***')}")
    elif internal_result:
        print("[SUCCESS] USE INTERNAL URL IN RENDER")
        print(f"   {internal_url.replace('YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO', '***')}")
    else:
        print("[ERROR] NEITHER URL WORKS")
        print("   Check database credentials and connectivity")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

