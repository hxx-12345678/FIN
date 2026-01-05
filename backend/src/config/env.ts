import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.S3_BUCKET_NAME || '',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    },
    okta: {
      domain: process.env.OKTA_DOMAIN || '',
      clientId: process.env.OKTA_CLIENT_ID || '',
      clientSecret: process.env.OKTA_CLIENT_SECRET || '',
    },
    quickbooks: {
      clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    },
    xero: {
      clientId: process.env.XERO_CLIENT_ID || '',
      clientSecret: process.env.XERO_CLIENT_SECRET || '',
    },
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || '',
  },
  upload: {
    maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10), // 100MB
  },
  monteCarlo: {
    ttlDays: parseInt(process.env.MONTECARLO_TTL_DAYS || '30', 10),
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
  llm: {
    provider: process.env.LLM_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'fallback'),
    apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '',
    model: process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.5-flash',
    baseUrl: process.env.LLM_BASE_URL || '',
  },
};

