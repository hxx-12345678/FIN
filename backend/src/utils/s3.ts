import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { config } from '../config/env';

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export const uploadToS3 = async (
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
};

/**
 * Stream upload to S3 - handles large files efficiently
 */
export const uploadStreamToS3 = async (
  key: string,
  stream: Readable,
  contentType?: string,
  contentLength?: number
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    Body: stream,
    ContentType: contentType || 'application/octet-stream',
    ContentLength: contentLength,
  });

  await s3Client.send(command);
  return key;
};

export const getSignedUrlForS3 = async (key: string, expiresIn = 3600): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const downloadFromS3 = async (key: string): Promise<Buffer> => {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('Empty response body');
  }

  // Convert stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

