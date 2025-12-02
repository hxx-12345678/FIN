"""S3 utilities for file upload/download"""
import os
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError
from typing import Optional

# Load environment variables from .env file
load_dotenv()

def get_s3_client():
    """Get S3 client (returns None if S3 not configured)"""
    if not os.getenv('S3_BUCKET_NAME'):
        return None
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
    )

def upload_to_s3(key: str, file_path: str, bucket: Optional[str] = None) -> Optional[str]:
    """Upload file to S3 (returns None if S3 not configured)"""
    s3_client = get_s3_client()
    bucket = bucket or os.getenv('S3_BUCKET_NAME')
    
    if not bucket or not s3_client:
        return None  # S3 not configured, skip upload
    
    try:
        s3_client.upload_file(file_path, bucket, key)
        return key
    except ClientError as e:
        raise Exception(f"Failed to upload to S3: {str(e)}")

def upload_bytes_to_s3(key: str, data: bytes, content_type: str = 'application/octet-stream', bucket: Optional[str] = None) -> Optional[str]:
    """Upload bytes to S3 (returns None if S3 not configured)"""
    s3_client = get_s3_client()
    bucket = bucket or os.getenv('S3_BUCKET_NAME')
    
    if not bucket or not s3_client:
        return None  # S3 not configured, skip upload
    
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key
    except ClientError as e:
        raise Exception(f"Failed to upload to S3: {str(e)}")

def download_from_s3(key: str, bucket: Optional[str] = None) -> Optional[bytes]:
    """Download file from S3 (returns None if S3 not configured)"""
    s3_client = get_s3_client()
    bucket = bucket or os.getenv('S3_BUCKET_NAME')
    
    if not bucket or not s3_client:
        return None  # S3 not configured, return None
    
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        return response['Body'].read()
    except ClientError as e:
        raise Exception(f"Failed to download from S3: {str(e)}")

def get_signed_url(key: str, expires_in: int = 3600, bucket: Optional[str] = None) -> Optional[str]:
    """Generate signed URL for S3 object (returns None if S3 not configured)"""
    s3_client = get_s3_client()
    bucket = bucket or os.getenv('S3_BUCKET_NAME')
    
    if not bucket or not s3_client:
        return None  # S3 not configured, return None
    
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': key},
            ExpiresIn=expires_in,
        )
        return url
    except ClientError as e:
        raise Exception(f"Failed to generate signed URL: {str(e)}")

