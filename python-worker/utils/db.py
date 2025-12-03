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
    safe_url = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{parsed.port or 5432}{parsed.path}"
    print(f"🔌 Connecting to database: {safe_url}")
    
    # psycopg2 requires 'postgres://' not 'postgresql://'
    # Convert if needed
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgres://', 1)
    
    # Try direct connection (psycopg2 handles connection strings well)
    try:
        # Parse connection parameters for better error handling
        conn_params = {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path.lstrip('/') if parsed.path else 'postgres',
            'user': parsed.username,
            'password': unquote(parsed.password) if parsed.password else None,
        }
        
        print(f"🔌 Connection parameters:")
        print(f"   Host: {conn_params['host']}")
        print(f"   Port: {conn_params['port']}")
        print(f"   Database: {conn_params['database']}")
        print(f"   User: {conn_params['user']}")
        
        # Try connecting with explicit parameters
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
            
            # Try multiple methods to list tables
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
                    print(f"✅ Found {len(tables)} tables using information_schema")
            except Exception as e:
                conn.rollback()
                print(f"⚠️  information_schema query failed: {e}")
            
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
                        print(f"✅ Found {len(tables)} tables using pg_tables")
                    else:
                        print("⚠️  pg_tables returned 0 tables")
                except Exception as e:
                    conn.rollback()
                    print(f"⚠️  pg_tables query failed: {e}")
            
            # Method 3: Direct query to jobs table (test if it exists)
            if len(tables) == 0:
                try:
                    cursor.execute("SELECT 1 FROM public.jobs LIMIT 1;")
                    # If this works, table exists but we can't see it in schema queries
                    tables = ['jobs (exists but not in schema queries)']
                    print("⚠️  jobs table exists but not visible in schema queries (permissions issue?)")
                except Exception as e:
                    conn.rollback()
                    if 'does not exist' in str(e) or 'relation' in str(e).lower():
                        pass  # Table really doesn't exist
                    else:
                        print(f"⚠️  Direct jobs query error: {e}")
            
            print(f"📊 Database Info:")
            print(f"   Current Database: {current_db}")
            print(f"   Current Schema: {current_schema}")
            print(f"   Available Schemas: {', '.join(schemas)}")
            print(f"   Tables in 'public' schema: {len(tables)}")
            if len(tables) > 0:
                print(f"   First 10 tables: {', '.join(tables[:10])}")
            
            # Verify jobs table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs'
                );
            """)
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                error_msg = (
                    f"❌ 'jobs' table does not exist in database!\n"
                    f"\nConnection Details:\n"
                    f"   Database URL: {safe_url}\n"
                    f"   Current Database: {current_db}\n"
                    f"   Current Schema: {current_schema}\n"
                    f"   Tables Found: {len(tables)}\n"
                )
                
                if len(tables) > 0:
                    error_msg += f"   Tables: {', '.join(tables[:20])}{'...' if len(tables) > 20 else ''}\n"
                else:
                    error_msg += "   ⚠️  No tables found in 'public' schema!\n"
                    error_msg += "   This suggests:\n"
                    error_msg += "   1. Wrong database (empty database)\n"
                    error_msg += "   2. Migrations not run\n"
                    error_msg += "   3. DATABASE_URL points to different database than backend\n"
                
                error_msg += (
                    f"\n🔧 Solution:\n"
                    f"1. Verify DATABASE_URL in Render matches backend's DATABASE_URL exactly\n"
                    f"2. Check backend service → Environment → DATABASE_URL\n"
                    f"3. Copy the exact DATABASE_URL to Python worker service\n"
                    f"4. Ensure migrations are run: npx prisma migrate deploy\n"
                    f"5. Expected database should have 32+ tables including 'jobs'\n"
                )
                
                raise ValueError(error_msg)
        except Exception as e:
            conn.rollback()
            raise ValueError(
                f"❌ Error verifying database: {str(e)}\n"
                f"Connection: {safe_url}\n"
                f"Please check DATABASE_URL is correct."
            ) from e
        
        return conn
    except psycopg2.OperationalError as e:
        # Provide helpful error message
        error_msg = str(e)
        if "password authentication failed" in error_msg:
            raise ValueError(
                f"❌ Database password authentication failed.\n"
                f"Error: {error_msg}\n\n"
                f"Please check:\n"
                f"1. Your PostgreSQL password is correct\n"
                f"2. DATABASE_URL in python-worker/.env file\n"
                f"3. Format: postgresql://username:password@host:port/database_name\n\n"
                f"Example: postgresql://postgres:mypassword@localhost:5432/finapilot"
            ) from e
        elif "could not connect" in error_msg or "connection refused" in error_msg:
            raise ValueError(
                f"❌ Cannot connect to database server.\n"
                f"Error: {error_msg}\n\n"
                f"Please check:\n"
                f"1. PostgreSQL is running\n"
                f"2. Host and port are correct in DATABASE_URL\n"
                f"3. Database server is accessible"
            ) from e
        else:
            raise ValueError(
                f"❌ Database connection failed.\n"
                f"Error: {error_msg}\n\n"
                f"Please check your DATABASE_URL in python-worker/.env file.\n"
                f"Format: postgresql://username:password@host:port/database_name"
            ) from e
    except Exception as e:
        raise ValueError(
            f"❌ Unexpected error connecting to database.\n"
            f"Error: {str(e)}\n\n"
            f"Please check your DATABASE_URL in python-worker/.env file."
        ) from e

def get_db_cursor(conn, dict_cursor=False):
    """Get database cursor"""
    if dict_cursor:
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()

