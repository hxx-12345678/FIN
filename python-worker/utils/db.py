"""Database connection utilities"""
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse, unquote, urlencode

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
    
    # CRITICAL FIX: Remove explicit port if it's 5432 (default)
    # Render's connection pooler might route differently with explicit port
    # Backend doesn't use explicit port, so we shouldn't either
    port = parsed.port
    if port == 5432:
        # Don't include port in connection - let PostgreSQL use default
        # This matches backend behavior
        port = None
    
    # Ensure port is included (default 5432 for PostgreSQL) only if not default
    port = port or 5432
    database_name = parsed.path.lstrip('/') if parsed.path else 'postgres'
    
    safe_url = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{port}/{database_name}"
    print(f"Connecting to database: {safe_url}")
    
    # Parse connection parameters for better error handling
    # CRITICAL: Don't include port if it's 5432 (default) to match backend
    conn_params = {
        'host': parsed.hostname,
        'database': database_name,
        'user': parsed.username,
        'password': unquote(parsed.password) if parsed.password else None,
        # Add connection options to ensure we connect to the right database
        'options': '-c search_path=public'
    }
    
    # Only add port if it's not the default 5432
    if parsed.port and parsed.port != 5432:
        conn_params['port'] = parsed.port
        print(f"Connection parameters:")
        print(f"   Host: {conn_params['host']}")
        print(f"   Port: {conn_params['port']}")
    else:
        print(f"Connection parameters:")
        print(f"   Host: {conn_params['host']}")
        print(f"   Port: 5432 (default, not specified)")
    
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
                # Get current database name and OID
                cursor.execute("SELECT current_database(), oid FROM pg_database WHERE datname = current_database();")
                current_db, db_oid = cursor.fetchone()
                
                # Get current user and permissions
                cursor.execute("SELECT current_user, session_user;")
                current_user, session_user = cursor.fetchone()
                
                # Get current schema
                cursor.execute("SELECT current_schema();")
                current_schema = cursor.fetchone()[0]
                
                # Get connection info
                cursor.execute("""
                    SELECT 
                        inet_server_addr() as server_ip,
                        inet_server_port() as server_port,
                        version() as pg_version;
                """)
                server_info = cursor.fetchone()
                server_ip = server_info[0] if server_info[0] else 'N/A'
                server_port = server_info[1] if server_info[1] else 'N/A'
                pg_version = server_info[2][:50] if server_info[2] else 'N/A'
                
                # Check if user has USAGE permission on public schema
                cursor.execute("""
                    SELECT has_schema_privilege(current_user, 'public', 'USAGE') as has_usage,
                           has_schema_privilege(current_user, 'public', 'CREATE') as has_create;
                """)
                has_usage, has_create = cursor.fetchone()
                
                # CRITICAL: Check database OID to ensure we're in the right database
                # Also check if there are ANY tables in ANY schema
                cursor.execute("""
                    SELECT 
                        schemaname,
                        COUNT(*) as table_count
                    FROM pg_tables 
                    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                    GROUP BY schemaname
                    ORDER BY schemaname;
                """)
                schema_table_counts = cursor.fetchall()
                
                # Check ALL schemas for tables using information_schema
                cursor.execute("""
                    SELECT 
                        table_schema,
                        COUNT(*) as table_count
                    FROM information_schema.tables 
                    WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    GROUP BY table_schema
                    ORDER BY table_schema;
                """)
                info_schema_counts = cursor.fetchall()
                
                # Check ALL schemas
                cursor.execute("""
                    SELECT schema_name 
                    FROM information_schema.schemata 
                    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY schema_name;
                """)
                all_schemas = [row[0] for row in cursor.fetchall()]
                
                print(f"Database Info:")
                print(f"   Current Database: {current_db} (OID: {db_oid})")
                print(f"   Server IP: {server_ip}")
                print(f"   Server Port: {server_port}")
                print(f"   PostgreSQL Version: {pg_version}")
                print(f"   Current User: {current_user}")
                print(f"   Session User: {session_user}")
                print(f"   Current Schema: {current_schema}")
                print(f"   Has USAGE on public: {has_usage}")
                print(f"   Has CREATE on public: {has_create}")
                print(f"   All Schemas: {', '.join(all_schemas)}")
                
                # Show table counts from both methods
                print(f"   Tables by Schema (pg_tables):")
                if len(schema_table_counts) > 0:
                    for schema, count in schema_table_counts:
                        print(f"      {schema}: {count} tables")
                else:
                    print(f"      (no tables found)")
                
                print(f"   Tables by Schema (information_schema):")
                if len(info_schema_counts) > 0:
                    for schema, count in info_schema_counts:
                        print(f"      {schema}: {count} tables")
                else:
                    print(f"      (no tables found)")
                
                # CRITICAL: Try to find tables in ALL schemas, not just public
                all_tables = []
                for schema in all_schemas:
                    try:
                        cursor.execute(f"""
                            SELECT '{schema}' as schema_name, tablename 
                            FROM pg_tables 
                            WHERE schemaname = %s
                            ORDER BY tablename
                            LIMIT 20;
                        """, (schema,))
                        schema_tables = cursor.fetchall()
                        for schema_name, table_name in schema_tables:
                            all_tables.append(f"{schema_name}.{table_name}")
                    except Exception as e:
                        print(f"WARNING: Could not query schema {schema}: {e}")
                
                if len(all_tables) > 0:
                    print(f"   Found {len(all_tables)} tables across all schemas:")
                    print(f"      {', '.join(all_tables[:20])}")
                
                # Check if jobs table exists in ANY schema
                jobs_table_exists = False
                jobs_location = None
                jobs_error = None
                
                # Try public.jobs first
                try:
                    cursor.execute("SELECT 1 FROM public.jobs LIMIT 1;")
                    jobs_table_exists = True
                    jobs_location = "public.jobs"
                    print(f"SUCCESS: Found jobs table at {jobs_location}!")
                except Exception as e:
                    jobs_error = str(e)
                    # Try other schemas
                    for schema in all_schemas:
                        if schema == 'public':
                            continue
                        try:
                            cursor.execute(f"SELECT 1 FROM {schema}.jobs LIMIT 1;")
                            jobs_table_exists = True
                            jobs_location = f"{schema}.jobs"
                            print(f"SUCCESS: Found jobs table at {jobs_location}!")
                            break
                        except:
                            pass
                
                # Also check information_schema for jobs table in any schema
                if not jobs_table_exists:
                    cursor.execute("""
                        SELECT table_schema, table_name
                        FROM information_schema.tables 
                        WHERE table_name = 'jobs'
                        AND table_schema NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY table_schema;
                    """)
                    jobs_locations = cursor.fetchall()
                    if len(jobs_locations) > 0:
                        jobs_location = f"{jobs_locations[0][0]}.{jobs_locations[0][1]}"
                        print(f"INFO: Found jobs table in information_schema at {jobs_location}")
                        # Try to query it
                        try:
                            cursor.execute(f"SELECT 1 FROM {jobs_location} LIMIT 1;")
                            jobs_table_exists = True
                            print(f"SUCCESS: Can query jobs table at {jobs_location}!")
                        except Exception as e:
                            print(f"WARNING: Found jobs table at {jobs_location} but cannot query: {e}")
                
                # Check for expected tables in public schema
                expected_tables = ['users', 'orgs', 'models', 'exports', 'jobs']
                found_expected = []
                for table in expected_tables:
                    try:
                        cursor.execute(f"SELECT 1 FROM public.{table} LIMIT 1;")
                        found_expected.append(table)
                    except:
                        pass
                
                # If no tables found anywhere, this is a real problem
                if len(all_tables) == 0 and not jobs_table_exists:
                    error_msg = (
                        f"ERROR: No tables found in database!\n"
                        f"\nConnection Details:\n"
                        f"   Database URL: {safe_url}\n"
                        f"   Database Name: {current_db}\n"
                        f"   Database OID: {db_oid}\n"
                        f"   Server IP: {server_ip}\n"
                        f"   Server Port: {server_port}\n"
                        f"   PostgreSQL Version: {pg_version}\n"
                        f"   Current User: {current_user}\n"
                        f"   Current Schema: {current_schema}\n"
                        f"   Has USAGE permission: {has_usage}\n"
                        f"   All Schemas: {', '.join(all_schemas)}\n"
                        f"   Tables Found: 0 (across all schemas)\n"
                    )
                    
                    if len(found_expected) > 0:
                        error_msg += f"\n   Found expected tables in public: {', '.join(found_expected)}\n"
                    else:
                        error_msg += f"\n   No expected tables found in public schema\n"
                    
                    error_msg += (
                        f"\nDIAGNOSIS:\n"
                        f"   This database is COMPLETELY EMPTY - no tables in any schema.\n"
                        f"   Backend sees 32 tables, but worker sees 0.\n"
                        f"   Database OID: {db_oid}\n"
                        f"   Server IP: {server_ip}\n"
                        f"\nPOSSIBLE CAUSES:\n"
                        f"   1. Connection routing issue - explicit port :5432 routes to different endpoint\n"
                        f"   2. Backend uses different DATABASE_URL (check backend env vars)\n"
                        f"   3. Connection pooler routing to read replica or empty database\n"
                        f"   4. Database migrations not run on this database instance\n"
                        f"\nIMMEDIATE ACTION:\n"
                        f"1. Go to Render -> Backend Service -> Environment tab\n"
                        f"2. Copy EXACT DATABASE_URL from backend (check format)\n"
                        f"3. Remove :5432 from worker DATABASE_URL if backend doesn't have it\n"
                        f"4. Ensure worker DATABASE_URL matches backend EXACTLY (character by character)\n"
                        f"5. Save and redeploy\n"
                        f"\nNOTE: If backend URL has NO port, worker should also have NO port.\n"
                        f"PostgreSQL defaults to 5432, so explicit port might route differently.\n"
                    )
                    
                    conn.close()
                    raise ValueError(error_msg)
                
                # If jobs table exists but in different location, that's also a problem
                if jobs_table_exists and jobs_location != "public.jobs":
                    error_msg = (
                        f"WARNING: jobs table found at {jobs_location}, not public.jobs!\n"
                        f"This might work, but it's unexpected.\n"
                        f"Backend expects jobs table in public schema.\n"
                    )
                    print(error_msg)
                    # Don't fail - let it try to work
                
                # If jobs table doesn't exist at all
                if not jobs_table_exists:
                    error_msg = (
                        f"ERROR: 'jobs' table does not exist in any schema!\n"
                        f"\nConnection Details:\n"
                        f"   Database: {current_db} (OID: {db_oid})\n"
                        f"   Server IP: {server_ip}\n"
                        f"   Server Port: {server_port}\n"
                        f"   User: {current_user}\n"
                        f"   Schemas Checked: {', '.join(all_schemas)}\n"
                        f"   Tables Found: {len(all_tables)} (across all schemas)\n"
                    )
                    
                    if len(found_expected) > 0:
                        error_msg += f"   Found expected tables: {', '.join(found_expected)}\n"
                        error_msg += f"   This suggests we're in the RIGHT database but jobs table is missing!\n"
                    else:
                        error_msg += f"   No expected tables found - database appears empty.\n"
                    
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
