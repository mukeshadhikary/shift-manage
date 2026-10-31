# Japanese Daily Shift Sheet App (勤務シフト表)
# Self-hosted production Dockerfile with Playwright Chromium support

FROM node:22-bookworm-slim

# Install system dependencies for better-sqlite3 compilation and Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    fonts-noto-cjk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Install Playwright Chromium browser
RUN npx playwright install chromium

# Copy application source
COPY . .

# Build Next.js application
RUN npm run build

# Volume for persistent SQLite database
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/shift.db
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
