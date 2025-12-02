# FinaPilot Local Development Setup

## Overview
This guide helps you run FinaPilot locally without cloud dependencies like S3. The system will work entirely with your local database.

## Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL 14+
- Git

## Quick Start

### 1. Database Setup

```bash
# Create database
createdb fina_pilot

# Or using psql
psql -U postgres
CREATE DATABASE fina_pilot;
\q
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:password@localhost:5432/fina_pilot
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:3000

# S3 is optional - leave blank for local development
# S3_BUCKET_NAME=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1

# Optional: OpenAI for AI-CFO features
# OPENAI_API_KEY=your-key-here

# Optional: Sentry for error tracking
# SENTRY_DSN=

# Optional: Redis for caching (will use in-memory if not configured)
# REDIS_URL=redis://localhost:6379
EOF

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Start backend
npm run dev
```

Backend will run on http://localhost:8000

### 3. Python Worker Setup

```bash
cd python-worker

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/fina_pilot

# S3 is optional - leave blank for local development
# S3_BUCKET_NAME=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1

# Worker settings
WORKER_CONCURRENCY=4
WORKER_ID=local-worker-1
EOF

# Start worker
python worker.py
```

### 4. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Start frontend
npm run dev
```

Frontend will run on http://localhost:3000

## Local Development Features

### Without S3
- Files are stored in memory cache (30 min TTL)
- Perfect for development and testing
- No cloud costs
- Faster local testing

### With S3 (Optional)
- Set S3_BUCKET_NAME and AWS credentials in .env
- Files will be stored in S3
- Useful for testing production-like behavior

## Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Python Worker Tests
```bash
cd python-worker
python -m pytest
```

### Test Excel Import
1. Go to http://localhost:3000
2. Sign up for an account
3. Upload a CSV or XLSX file
4. Map columns
5. View imported transactions

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env files
- Verify database exists: `psql -l`

### Port Already in Use
- Backend: Change PORT in backend/.env
- Frontend: Use `npm run dev -- -p 3001`

### Worker Not Processing Jobs
- Ensure worker.py is running
- Check DATABASE_URL in python-worker/.env
- View logs in terminal

### Excel Import Not Working
- Files stored in memory for 30 minutes
- Refresh if "upload key expired" error
- Check worker logs for processing errors

## Development Workflow

1. **Make Backend Changes**
   - Edit files in `backend/src`
   - Server auto-restarts with nodemon
   - Test endpoint: `curl http://localhost:8000/health`

2. **Make Worker Changes**
   - Edit files in `python-worker/jobs`
   - Restart worker manually (Ctrl+C, then `python worker.py`)
   - Check logs for job processing

3. **Make Frontend Changes**
   - Edit files in `client`
   - Next.js auto-reloads browser
   - View at http://localhost:3000

4. **Database Changes**
   - Edit `backend/prisma/schema.prisma`
   - Run `npx prisma migrate dev --name your_migration_name`
   - Run `npx prisma generate`

## Production Deployment

See `DEPLOYMENT.md` for production deployment with:
- AWS S3/MinIO for file storage
- Redis for caching
- Docker containers
- Load balancers
- Monitoring (Sentry, Prometheus)

## Support

- Check logs in terminal windows
- Review `IMPLEMENTATION_STATUS.md` for feature status
- See `API_GUIDE.md` for API documentation


