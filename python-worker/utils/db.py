"""Database connection utilities"""
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse, unquote

# Load environment variables from .env file
load_dotenv()

def get_db_connection():
    """Get PostgreSQL connection from DATABASE_URL"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable not set.\n"
            "Please create a .env file in python-worker/ with:\n"
            "DATABASE_URL=postgresql://user:password@localhost:5432/database_name"
        )
    
    # Log the database URL (without password) for debugging
    parsed = urlparse(database_url)
    
    # Ensure port is included (default 5432 for PostgreSQL)
    port = parsed.port or 5432
    database_name = parsed.path.lstrip('/') if parsed.path else 'postgres'
    
    safe_url = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{port}/{database_name}"
    print(f"Connecting to database: {safe_url}")
    
    # Parse connection parameters for better error handling
    conn_params = {
        'host': parsed.hostname,
        'port': port,
        'database': database_name,
        'user': parsed.username,
        'password': unquote(parsed.password) if parsed.password else None,
    }
    
    print(f"Connection parameters:")
    print(f"   Host: {conn_params['host']}")
    print(f"   Port: {conn_params['port']}")
    print(f"   Database: {conn_params['database']}")
    print(f"   User: {conn_params['user']}")
    
    # Try direct connection (psycopg2 handles connection strings well)
    try:
        # Try connecting with explicit parameters first (more reliable)
        conn = psycopg2.connect(**conn_params)
        
        # Set search_path to 'public' explicitly to ensure we're using the right schema
        try:
            with conn.cursor() as cursor:
                cursor.execute("SET search_path TO public;")
                conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Failed to set search_path: {e}")
        
        # Verify connection and get database info
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
                
                # CRITICAL FIX: Try direct query to jobs table FIRST
                # This bypasses any schema visibility issues
                jobs_table_exists = False
                try:
                    cursor.execute("SELECT 1 FROM public.jobs LIMIT 1;")
                    jobs_table_exists = True
                    print("SUCCESS: Direct query to public.jobs works!")
                except Exception as e:
                    if 'does not exist' in str(e) or 'relation' in str(e).lower():
                        jobs_table_exists = False
                        print(f"ERROR: public.jobs table does not exist: {e}")
                    else:
                        # Permission error or other issue
                        print(f"WARNING: Cannot query public.jobs: {e}")
                
                # Try multiple methods to list tables
                tables = []
                
                # Method 1: information_schema (most reliable)
                try:
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                        ORDER BY table_name;
                    """)
                    tables = [row[0] for row in cursor.fetchall()]
                    if len(tables) > 0:
                        print(f"Found {len(tables)} tables using information_schema")
                except Exception as e:
                    conn.rollback()
                    print(f"WARNING: information_schema query failed: {e}")
                
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
                            print(f"Found {len(tables)} tables using pg_tables")
                        else:
                            print("WARNING: pg_tables returned 0 tables")
                    except Exception as e:
                        conn.rollback()
                        print(f"WARNING: pg_tables query failed: {e}")
                
                # Method 3: Direct query to pg_class (system catalog)
                if len(tables) == 0:
                    try:
                        cursor.execute("""
                            SELECT relname 
                            FROM pg_class 
                            WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                            AND relkind = 'r'
                            ORDER BY relname;
                        """)
                        tables = [row[0] for row in cursor.fetchall()]
                        if len(tables) > 0:
                            print(f"Found {len(tables)} tables using pg_class")
                    except Exception as e:
                        conn.rollback()
                        print(f"WARNING: pg_class query failed: {e}")
                
                print(f"Database Info:")
                print(f"   Current Database: {current_db}")
                print(f"   Current Schema: {current_schema}")
                print(f"   Available Schemas: {', '.join(schemas)}")
                print(f"   Tables in 'public' schema: {len(tables)}")
                if len(tables) > 0:
                    print(f"   First 10 tables: {', '.join(tables[:10])}")
                
                # Verify jobs table exists using multiple methods
                table_exists_check = False
                
                # Check 1: Direct query (already done above)
                if jobs_table_exists:
                    table_exists_check = True
                    print("SUCCESS: jobs table verified via direct query")
                else:
                    # Check 2: information_schema
                    try:
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_schema = 'public' 
                                AND table_name = 'jobs'
                            );
                        """)
                        table_exists_check = cursor.fetchone()[0]
                        if table_exists_check:
                            print("SUCCESS: jobs table verified via information_schema")
                    except Exception as e:
                        conn.rollback()
                        print(f"WARNING: information_schema check failed: {e}")
                    
                    # Check 3: pg_tables
                    if not table_exists_check:
                        try:
                            cursor.execute("""
                                SELECT EXISTS (
                                    SELECT FROM pg_tables 
                                    WHERE schemaname = 'public' 
                                    AND tablename = 'jobs'
                                );
                            """)
                            table_exists_check = cursor.fetchone()[0]
                            if table_exists_check:
                                print("SUCCESS: jobs table verified via pg_tables")
                        except Exception as e:
                            conn.rollback()
                            print(f"WARNING: pg_tables check failed: {e}")
                
                if not table_exists_check:
                    # Get all databases for debugging
                    all_databases = []
                    try:
                        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
                        all_databases = [row[0] for row in cursor.fetchall()]
                    except:
                        pass
                    
                    # Try external URL format
                    external_host = f"{parsed.hostname}.oregon-postgres.render.com"
                    
                    error_msg = (
                        f"ERROR: 'jobs' table does not exist in database!\n"
                        f"\nConnection Details:\n"
                        f"   Database URL: {safe_url}\n"
                        f"   Current Database: {current_db}\n"
                        f"   Current Schema: {current_schema}\n"
                        f"   Tables Found: {len(tables)}\n"
                        f"   All Databases on Server: {', '.join(all_databases[:5])}{'...' if len(all_databases) > 5 else ''}\n"
                    )
                    
                    if len(tables) > 0:
                        error_msg += f"   Tables Found: {', '.join(tables[:20])}{'...' if len(tables) > 20 else ''}\n"
                    else:
                        error_msg += "   WARNING: No tables found in 'public' schema!\n"
                        error_msg += "\nDIAGNOSIS:\n"
                        error_msg += "   This database appears to be EMPTY or WRONG database.\n"
                        error_msg += "   Backend can see 32 tables, but worker sees 0.\n"
                        error_msg += "\nPOSSIBLE FIXES:\n"
                        error_msg += "   1. Try EXTERNAL Database URL instead:\n"
                        error_msg += f"      postgresql://{parsed.username}:***@{external_host}:{port}/{database_name}\n"
                        error_msg += "   2. Verify backend DATABASE_URL and copy EXACTLY\n"
                        error_msg += "   3. Check if backend uses different connection string\n"
                        error_msg += "   4. Internal URL might be routing to empty replica\n"
                    
                    error_msg += (
                        f"\nIMMEDIATE ACTION:\n"
                        f"1. Go to Render -> PostgreSQL Database -> Info tab\n"
                        f"2. Copy EXTERNAL Database URL (not Internal)\n"
                        f"3. Update Python Worker DATABASE_URL with External URL\n"
                        f"4. Save and redeploy\n"
                    )
                    
                    raise ValueError(error_msg)
        except Exception as e:
            conn.rollback()
            raise ValueError(
                f"ERROR: Error verifying database: {str(e)}\n"
                f"Connection: {safe_url}\n"
                f"Please check DATABASE_URL is correct."
            ) from e
        
        return conn
    except psycopg2.OperationalError as e:
        # Provide helpful error message
        error_msg = str(e)
        if "password authentication failed" in error_msg:
            raise ValueError(
                f"ERROR: Database password authentication failed.\n"
                f"Error: {error_msg}\n\n"
                f"Please check:\n"
                f"1. Your PostgreSQL password is correct\n"
                f"2. DATABASE_URL in python-worker/.env file\n"
                f"3. Format: postgresql://username:password@host:port/database_name\n\n"
                f"Example: postgresql://postgres:mypassword@localhost:5432/finapilot"
            ) from e
        elif "could not connect" in error_msg or "connection refused" in error_msg:
            raise ValueError(
                f"ERROR: Cannot connect to database server.\n"
                f"Error: {error_msg}\n\n"
                f"Please check:\n"
                f"1. PostgreSQL is running\n"
                f"2. Host and port are correct in DATABASE_URL\n"
                f"3. Database server is accessible"
            ) from e
        else:
            raise ValueError(
                f"ERROR: Database connection failed.\n"
                f"Error: {error_msg}\n\n"
                f"Please check your DATABASE_URL in python-worker/.env file.\n"
                f"Format: postgresql://username:password@host:port/database_name"
            ) from e
    except Exception as e:
        raise ValueError(
            f"ERROR: Unexpected error connecting to database.\n"
            f"Error: {str(e)}\n\n"
            f"Please check your DATABASE_URL in python-worker/.env file."
        ) from e

def get_db_cursor(conn, dict_cursor=False):
    """Get database cursor"""
    if dict_cursor:
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()
