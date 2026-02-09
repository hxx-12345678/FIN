# Use a combined Node/Python image for efficiency
FROM nikolaik/python-nodejs:python3.12-nodejs20-slim

WORKDIR /app

# Install system dependencies for scientific Python libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 1. Setup Backend
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/
WORKDIR /app/backend
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# 2. Setup Python Worker
WORKDIR /app
COPY python-worker/requirements.txt ./python-worker/
RUN pip install --no-cache-dir -r ./python-worker/requirements.txt
COPY python-worker/ ./python-worker/

# 3. Unified Start Script
WORKDIR /app
RUN echo '#!/bin/bash\n\
echo "🚀 Starting FinaPilot Unified Service..."\n\
\n\
# Run database migrations\n\
echo "🔄 Running database migrations..."\n\
cd /app/backend && npx prisma migrate resolve --applied 20260209053640_add_computation_trace || true\n\
cd /app/backend && npx prisma migrate deploy\n\
\n\
# Start Python Worker in background\n\
echo "🐍 Starting Python Worker..."\n\
cd /app/python-worker && python3 worker.py &\n\
\n\
# Start Node.js Backend in foreground\n\
echo "📦 Starting Node.js Backend..."\n\
cd /app/backend && npm start' > /app/start.sh && chmod +x /app/start.sh

# Expose the API port
EXPOSE 8000

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

# Start the unified service
CMD ["/app/start.sh"]
