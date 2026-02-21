"""Database connection utilities"""
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse, unquote, urlencode

# Load environment variables from .env file
load_dotenv()

def get_db_connection():
    """Get PostgreSQL connection from DATABASE_URL with improved reliability for Render"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable not set.\n"
            "Please set DATABASE_URL in your environment or .env file."
        )
    
    # Strip whitespace which frequently causes "Name or service not known" errors
    database_url = database_url.strip()
    
    # Render compatibility: ensure postgresql:// scheme
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
        
    # Parse for logging and specific checks
    try:
        parsed = urlparse(database_url)
        hostname = parsed.hostname
        port = parsed.port
        database_name = parsed.path.lstrip('/') if parsed.path else 'postgres'
        
        # Build safe URL for logging (hide password)
        if parsed.username and parsed.password:
            safe_url = f"{parsed.scheme}://{parsed.username}:***@{hostname}{f':{port}' if port else ''}/{database_name}"
        else:
            safe_url = f"{parsed.scheme}://{hostname}{f':{port}' if port else ''}/{database_name}"
    except Exception as e:
        safe_url = "[Error parsing URL for logging]"
        hostname = "unknown"
        print(f"DEBUG: Failed to parse DATABASE_URL: {e}")

    debug_mode = os.getenv('DB_DEBUG', 'false').lower() == 'true'
    
    # Retry logic for transient DNS/connection issues (common on Render startup)
    import time
    max_retries = 3
    retry_delay = 2 # seconds
    
    last_error = None
    for attempt in range(max_retries):
        try:
            # CRITICAL: Use the connection string directly. 
            # This is significantly more robust than manual parameter parsing
            # as it correctly handles SSL modes, query params, and complex hostnames.
            conn = psycopg2.connect(database_url, connect_timeout=10)
            
            # Set autocommit to avoid transaction issues
            conn.set_session(autocommit=True)
            
            # Verify and set search path
            with conn.cursor() as cursor:
                cursor.execute("SET search_path TO public;")
                
                # Verified connection - we can return now
                if debug_mode:
                    print(f"Successfully connected to {hostname}")
                
                # Reset to transaction mode for normal operations
                conn.set_session(autocommit=False)
                return conn
                
        except (psycopg2.OperationalError, Exception) as e:
            last_error = e
            error_msg = str(e)
            
            # Check for DNS/Resolution errors
            is_dns_error = "could not translate host name" in error_msg or "Name or service not known" in error_msg
            
            if is_dns_error and attempt < max_retries - 1:
                if debug_mode:
                    print(f"DNS lookup failed for {hostname} (attempt {attempt + 1}/{max_retries}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                continue
                
            # If we're here, we've either exhausted retries or it's not a DNS error
            # Prepare a helpful error message for common Render issues
            render_internal_msg = ""
            if hostname and hostname.endswith("-a") and is_dns_error:
                render_internal_msg = (
                    f"\n\nDIAGNOSIS: You are using a Render INTERNAL hostname ({hostname}).\n"
                    "This only works if the worker and database are in the SAME Render Region.\n"
                    "FIX: Use the EXTERNAL Database URL (it ends in .render.com) if they are in different regions."
                )
            
            if attempt == max_retries - 1:
                raise ValueError(
                    f"ERROR: Database connection failed after {max_retries} attempts.\n"
                    f"Last Error: {error_msg}\n"
                    f"Attempted host: {hostname}{render_internal_msg}\n\n"
                    f"Please verify DATABASE_URL is correct."
                ) from e
            
            # If it's not a DNS error, don't retry (e.g. auth failure)
            raise ValueError(
                f"ERROR: Database connection failed.\n"
                f"Error: {error_msg}\n\n"
                f"Verify: host={hostname}, db={database_name}, user={parsed.username}"
            ) from e

def get_db_cursor(conn, dict_cursor=False):
    """Get database cursor"""
    if dict_cursor:
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()
