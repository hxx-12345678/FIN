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
        
        # Set autocommit to avoid transaction issues
        conn.set_session(autocommit=True)
        
        # Set search_path to 'public' explicitly to ensure we're using the right schema
        try:
            with conn.cursor() as cursor:
                cursor.execute("SET search_path TO public;")
        except Exception as e:
            raise ValueError(f"Failed to set search_path: {e}")
        
        # Verify connection and get database info
        try:
            with conn.cursor() as cursor:
                # Get current database name
                cursor.execute("SELECT current_database();")
                current_db = cursor.fetchone()[0]
                
                # Get current user and permissions
                cursor.execute("SELECT current_user, session_user;")
                current_user, session_user = cursor.fetchone()
                
                # Get current schema
                cursor.execute("SELECT current_schema();")
                current_schema = cursor.fetchone()[0]
                
                # Check if user has USAGE permission on public schema
                cursor.execute("""
                    SELECT has_schema_privilege(current_user, 'public', 'USAGE') as has_usage,
                           has_schema_privilege(current_user, 'public', 'CREATE') as has_create;
                """)
                has_usage, has_create = cursor.fetchone()
                
                print(f"Database Info:")
                print(f"   Current Database: {current_db}")
                print(f"   Current User: {current_user}")
                print(f"   Session User: {session_user}")
                print(f"   Current Schema: {current_schema}")
                print(f"   Has USAGE on public: {has_usage}")
                print(f"   Has CREATE on public: {has_create}")
                
                # Get all schemas
                cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema');")
                schemas = [row[0] for row in cursor.fetchall()]
                print(f"   Available Schemas: {', '.join(schemas)}")
                
                # CRITICAL: Check if jobs table exists using direct query
                # This is the most reliable method
                jobs_table_exists = False
                jobs_error = None
                try:
                    cursor.execute("SELECT 1 FROM public.jobs LIMIT 1;")
                    jobs_table_exists = True
                    print("SUCCESS: Direct query to public.jobs works!")
                except Exception as e:
                    jobs_error = str(e)
                    if 'does not exist' in str(e) or 'relation' in str(e).lower():
                        jobs_table_exists = False
                        print(f"ERROR: public.jobs table does not exist: {e}")
                    else:
                        # Permission error or other issue
                        print(f"WARNING: Cannot query public.jobs: {e}")
                
                # Try multiple methods to list tables (with proper error handling)
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
                        print(f"WARNING: pg_class query failed: {e}")
                
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
                    if len(tables) > 0 and 'jobs' in tables:
                        table_exists_check = True
                        print("SUCCESS: jobs table found in table list")
                    else:
                        # Check 3: information_schema EXISTS query
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
                                print("SUCCESS: jobs table verified via information_schema EXISTS")
                        except Exception as e:
                            print(f"WARNING: information_schema EXISTS check failed: {e}")
                        
                        # Check 4: pg_tables
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
                                print(f"WARNING: pg_tables EXISTS check failed: {e}")
                
                if not table_exists_check:
                    # Get all databases for debugging
                    all_databases = []
                    try:
                        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
                        all_databases = [row[0] for row in cursor.fetchall()]
                    except:
                        pass
                    
                    # Check if we're in the right database by checking for other expected tables
                    expected_tables = ['users', 'orgs', 'models', 'exports']
                    found_expected = []
                    for table in expected_tables:
                        try:
                            cursor.execute(f"SELECT 1 FROM public.{table} LIMIT 1;")
                            found_expected.append(table)
                        except:
                            pass
                    
                    # Try external URL format
                    external_host = f"{parsed.hostname}.oregon-postgres.render.com"
                    
                    error_msg = (
                        f"ERROR: 'jobs' table does not exist in database!\n"
                        f"\nConnection Details:\n"
                        f"   Database URL: {safe_url}\n"
                        f"   Current Database: {current_db}\n"
                        f"   Current User: {current_user}\n"
                        f"   Current Schema: {current_schema}\n"
                        f"   Has USAGE permission: {has_usage}\n"
                        f"   Tables Found: {len(tables)}\n"
                        f"   All Databases on Server: {', '.join(all_databases[:5])}{'...' if len(all_databases) > 5 else ''}\n"
                    )
                    
                    if len(found_expected) > 0:
                        error_msg += f"   Found expected tables: {', '.join(found_expected)}\n"
                        error_msg += f"   This suggests we're in the RIGHT database but jobs table is missing!\n"
                    else:
                        error_msg += f"   No expected tables found (users, orgs, models, exports)\n"
                    
                    if len(tables) > 0:
                        error_msg += f"   Tables Found: {', '.join(tables[:20])}{'...' if len(tables) > 20 else ''}\n"
                    else:
                        error_msg += "   WARNING: No tables found in 'public' schema!\n"
                        error_msg += "\nDIAGNOSIS:\n"
                        if not has_usage:
                            error_msg += "   User does NOT have USAGE permission on 'public' schema!\n"
                            error_msg += "   This prevents seeing tables even if they exist.\n"
                        else:
                            error_msg += "   This database appears to be EMPTY or WRONG database.\n"
                            error_msg += "   Backend can see 32 tables, but worker sees 0.\n"
                        error_msg += "\nPOSSIBLE FIXES:\n"
                        error_msg += "   1. Verify DATABASE_URL matches backend EXACTLY\n"
                        error_msg += "   2. Check if backend uses different connection string\n"
                        error_msg += "   3. Grant USAGE permission: GRANT USAGE ON SCHEMA public TO finapilot_user;\n"
                        error_msg += "   4. Grant SELECT permission: GRANT SELECT ON ALL TABLES IN SCHEMA public TO finapilot_user;\n"
                    
                    error_msg += (
                        f"\nIMMEDIATE ACTION:\n"
                        f"1. Go to Render -> PostgreSQL Database -> Info tab\n"
                        f"2. Copy EXTERNAL Database URL (not Internal)\n"
                        f"3. Update Python Worker DATABASE_URL with External URL\n"
                        f"4. If still fails, check database permissions\n"
                        f"5. Save and redeploy\n"
                    )
                    
                    conn.close()
                    raise ValueError(error_msg)
        except Exception as e:
            conn.close()
            raise ValueError(
                f"ERROR: Error verifying database: {str(e)}\n"
                f"Connection: {safe_url}\n"
                f"Please check DATABASE_URL is correct."
            ) from e
        
        # Set back to transaction mode for normal operations
        conn.set_session(autocommit=False)
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
