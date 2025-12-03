#!/usr/bin/env python3
"""
Test Database Connection and Verify Schema
Run this to verify the Python worker can connect to the database
"""

import os
import sys
from utils.db import get_db_connection

def test_connection():
    """Test database connection and verify jobs table exists"""
    print("=" * 60)
    print("  Python Worker Database Connection Test")
    print("=" * 60)
    print()
    
    # Check DATABASE_URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set!")
        print("\nPlease set DATABASE_URL in Render environment variables:")
        print("DATABASE_URL=postgresql://user:password@host:port/database")
        sys.exit(1)
    
    # Parse URL (safely)
    from urllib.parse import urlparse
    parsed = urlparse(database_url)
    print(f"📊 Database Info:")
    print(f"   Host: {parsed.hostname}")
    print(f"   Port: {parsed.port or 5432}")
    print(f"   Database: {parsed.path.lstrip('/')}")
    print(f"   User: {parsed.username}")
    print()
    
    # Test connection
    print("🔌 Testing connection...")
    try:
        conn = get_db_connection()
        print("✅ Database connection successful!")
        print()
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    # Check jobs table
    print("🔍 Checking jobs table...")
    try:
        with conn.cursor() as cursor:
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs'
                );
            """)
            exists = cursor.fetchone()[0]
            
            if not exists:
                print("❌ 'jobs' table does NOT exist!")
                print()
                print("Listing all tables in database:")
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)
                tables = [row[0] for row in cursor.fetchall()]
                print(f"   Found {len(tables)} tables:")
                for table in tables:
                    print(f"   - {table}")
                print()
                print("⚠️  Solution: Run database migrations:")
                print("   npx prisma migrate deploy")
                conn.close()
                sys.exit(1)
            
            # Count jobs
            cursor.execute("SELECT COUNT(*) FROM jobs;")
            count = cursor.fetchone()[0]
            print(f"✅ 'jobs' table exists with {count} records")
            print()
            
            # Check columns
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'jobs'
                ORDER BY ordinal_position;
            """)
            columns = cursor.fetchall()
            print(f"✅ Table has {len(columns)} columns:")
            for col_name, col_type in columns[:10]:
                print(f"   - {col_name} ({col_type})")
            if len(columns) > 10:
                print(f"   ... and {len(columns) - 10} more")
            print()
            
    except Exception as e:
        print(f"❌ Error checking jobs table: {e}")
        conn.close()
        sys.exit(1)
    
    # Test query
    print("🧪 Testing job reservation query...")
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, job_type, status 
                FROM jobs 
                WHERE status = 'queued' 
                LIMIT 1;
            """)
            result = cursor.fetchone()
            if result:
                print(f"✅ Query works! Found job: {result[0]}")
            else:
                print("✅ Query works! (No queued jobs found)")
            print()
    except Exception as e:
        print(f"❌ Query failed: {e}")
        conn.close()
        sys.exit(1)
    
    conn.close()
    
    print("=" * 60)
    print("  ✅ All Tests Passed!")
    print("=" * 60)
    print()
    print("Your Python worker should work correctly now.")
    print()

if __name__ == '__main__':
    test_connection()

