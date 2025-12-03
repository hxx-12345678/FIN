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
        conn = psycopg2.connect(database_url)
        
        # Set search_path to 'public' explicitly to ensure we're using the right schema
        with conn.cursor() as cursor:
            cursor.execute("SET search_path TO public;")
            conn.commit()
        
        # Verify jobs table exists
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs'
                );
            """)
            table_exists = cursor.fetchone()[0]
            if not table_exists:
                # Try to list all tables to help debug
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)
                tables = [row[0] for row in cursor.fetchall()]
                raise ValueError(
                    f"❌ 'jobs' table does not exist in database!\n"
                    f"Database: {parsed.path or 'unknown'}\n"
                    f"Schema: public\n"
                    f"Found {len(tables)} tables: {', '.join(tables[:10])}{'...' if len(tables) > 10 else ''}\n\n"
                    f"Please ensure:\n"
                    f"1. DATABASE_URL points to the correct database\n"
                    f"2. Database migrations have been run (npx prisma migrate deploy)\n"
                    f"3. DATABASE_URL matches the backend's DATABASE_URL"
                )
        
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

