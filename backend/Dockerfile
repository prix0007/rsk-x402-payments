# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S x402user -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create .env file with default values (can be overridden)
RUN echo "PORT=3000\n\
NODE_ENV=production\n\
NETWORK=local\n\
PRIVATE_KEY=0x1111111111111111111111111111111111111111111111111111111111111111\n\
RPC_URL=http://127.0.0.1:8545\n\
API_BASE_URL=http://localhost:3000\n\
CORS_ORIGIN=*" > .env

# Change ownership to nodejs user
RUN chown -R x402user:nodejs /app

# Switch to non-root user
USER x402user

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    http.get('http://localhost:3000/health', (res) => { \
      if (res.statusCode === 200) { process.exit(0); } \
      else { process.exit(1); } \
    }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "start"]