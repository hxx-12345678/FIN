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
    
    # psycopg2 requires 'postgres://' not 'postgresql://'
    # Convert if needed
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgres://', 1)
    
    # Try direct connection (psycopg2 handles connection strings well)
    try:
        conn = psycopg2.connect(database_url)
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

