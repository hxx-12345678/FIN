#!/usr/bin/env python3
"""
Comprehensive Pre-Deployment Test
Tests all database connection scenarios before deploying to Render
"""

import os
import sys
from urllib.parse import urlparse, unquote
import psycopg2

def test_connection(database_url, label):
    """Test a database connection and return results"""
    print(f"\n{'='*60}")
    print(f"  Testing: {label}")
    print(f"{'='*60}")
    
    try:
        parsed = urlparse(database_url)
        port = parsed.port or 5432
        database_name = parsed.path.lstrip('/') if parsed.path else 'postgres'
        
        print(f"📊 Connection Details:")
        print(f"   Host: {parsed.hostname}")
        print(f"   Port: {port}")
        print(f"   Database: {database_name}")
        print(f"   User: {parsed.username}")
        
        # Connect with explicit parameters
        conn_params = {
            'host': parsed.hostname,
            'port': port,
            'database': database_name,
            'user': parsed.username,
            'password': unquote(parsed.password) if parsed.password else None,
        }
        
        print(f"\n🔌 Connecting...")
        conn = psycopg2.connect(**conn_params)
        print("✅ Connection successful!")
        
        with conn.cursor() as cursor:
            # Set search_path
            cursor.execute("SET search_path TO public;")
            conn.commit()
            
            # Get database info
            cursor.execute("SELECT current_database();")
            current_db = cursor.fetchone()[0]
            
            cursor.execute("SELECT current_schema();")
            current_schema = cursor.fetchone()[0]
            
            # List tables using information_schema
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            print(f"\n📊 Database Info:")
            print(f"   Current Database: {current_db}")
            print(f"   Current Schema: {current_schema}")
            print(f"   Tables Found: {len(tables)}")
            
            if len(tables) > 0:
                print(f"   First 10 tables: {', '.join(tables[:10])}")
                if 'jobs' in tables:
                    print(f"   ✅ 'jobs' table EXISTS!")
                    
                    # Test direct query
                    cursor.execute("SELECT COUNT(*) FROM public.jobs;")
                    jobs_count = cursor.fetchone()[0]
                    print(f"   ✅ Jobs table has {jobs_count} records")
                else:
                    print(f"   ❌ 'jobs' table NOT in list!")
            else:
                print(f"   ❌ NO TABLES FOUND!")
            
            # Check if jobs table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs'
                );
            """)
            jobs_exists = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'success': True,
                'tables_count': len(tables),
                'jobs_exists': jobs_exists,
                'current_db': current_db,
                'tables': tables
            }
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'tables_count': 0,
            'jobs_exists': False
        }

def main():
    print("="*60)
    print("  PRE-DEPLOYMENT DATABASE CONNECTION TEST")
    print("="*60)
    print()
    print("This script tests database connections before deployment.")
    print("It will test both Internal and External URLs.")
    print()
    
    # Get DATABASE_URL from environment or use test values
    internal_url = os.getenv('DATABASE_URL_INTERNAL') or \
        "postgresql://finapilot_user:YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO@dpg-d4o2nomuk2gs7385k770-a/finapilot"
    
    external_url = os.getenv('DATABASE_URL_EXTERNAL') or \
        "postgresql://finapilot_user:YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO@dpg-d4o2nomuk2gs7385k770-a.oregon-postgres.render.com:5432/finapilot"
    
    # Test Internal URL
    internal_result = test_connection(internal_url, "Internal Database URL")
    
    # Test External URL
    external_result = test_connection(external_url, "External Database URL")
    
    # Summary
    print(f"\n{'='*60}")
    print("  TEST SUMMARY")
    print(f"{'='*60}\n")
    
    print("Internal URL Results:")
    if internal_result['success']:
        print(f"  ✅ Connection: SUCCESS")
        print(f"  📊 Tables Found: {internal_result['tables_count']}")
        print(f"  {'✅' if internal_result['jobs_exists'] else '❌'} Jobs Table: {'EXISTS' if internal_result['jobs_exists'] else 'NOT FOUND'}")
    else:
        print(f"  ❌ Connection: FAILED")
        print(f"  Error: {internal_result.get('error', 'Unknown')}")
    
    print("\nExternal URL Results:")
    if external_result['success']:
        print(f"  ✅ Connection: SUCCESS")
        print(f"  📊 Tables Found: {external_result['tables_count']}")
        print(f"  {'✅' if external_result['jobs_exists'] else '❌'} Jobs Table: {'EXISTS' if external_result['jobs_exists'] else 'NOT FOUND'}")
    else:
        print(f"  ❌ Connection: FAILED")
        print(f"  Error: {external_result.get('error', 'Unknown')}")
    
    print("\n" + "="*60)
    print("  RECOMMENDATION")
    print("="*60 + "\n")
    
    # Determine which URL to use
    if external_result['success'] and external_result['jobs_exists']:
        print("✅ USE EXTERNAL DATABASE URL")
        print(f"   {external_url.replace('YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO', '***')}")
        print("\n   This URL:")
        print("   ✅ Connects successfully")
        print(f"   ✅ Has {external_result['tables_count']} tables")
        print("   ✅ Has 'jobs' table")
        return 0
    elif internal_result['success'] and internal_result['jobs_exists']:
        print("✅ USE INTERNAL DATABASE URL")
        print(f"   {internal_url.replace('YqBB25acxTkkvhAo0Xu8INmVHIL5f3jO', '***')}")
        print("\n   This URL:")
        print("   ✅ Connects successfully")
        print(f"   ✅ Has {internal_result['tables_count']} tables")
        print("   ✅ Has 'jobs' table")
        return 0
    else:
        print("❌ NEITHER URL WORKS PROPERLY")
        print("\n   Issues:")
        if not internal_result['success']:
            print(f"   - Internal URL: {internal_result.get('error', 'Connection failed')}")
        if not external_result['success']:
            print(f"   - External URL: {external_result.get('error', 'Connection failed')}")
        if internal_result.get('tables_count', 0) == 0:
            print("   - Internal URL: No tables found")
        if external_result.get('tables_count', 0) == 0:
            print("   - External URL: No tables found")
        print("\n   🔧 Action Required:")
        print("   1. Verify database migrations are run")
        print("   2. Check database credentials")
        print("   3. Ensure database is accessible")
        return 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)

