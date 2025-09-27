# Docker Deployment Guide for X402 Backend

This guide covers Docker deployment for the X402 Payments Backend Server.

## Files Overview

- **`Dockerfile`** - Multi-stage build configuration with Node.js 20+ Alpine
- **`docker-compose.yml`** - Orchestration for backend + optional blockchain node
- **`.dockerignore`** - Excludes unnecessary files from build context
- **`docker-test.js`** - Automated testing script for Docker deployment

## Quick Start

```bash
# 1. Start the backend
npm run docker:up

# 2. Test deployment
npm run docker:test

# 3. View logs
npm run docker:logs

# 4. Stop everything
npm run docker:down
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build Docker image |
| `npm run docker:run` | Run container with .env file |
| `npm run docker:up` | Start with docker-compose |
| `npm run docker:down` | Stop docker-compose |
| `npm run docker:logs` | View container logs |
| `npm run docker:dev` | Start with local blockchain |
| `npm run docker:test` | Test container endpoints |

## Environment Configuration

### Default Values (built into container)
```env
PORT=3000
NODE_ENV=production
NETWORK=local
PRIVATE_KEY=0x1111111111111111111111111111111111111111111111111111111111111111
RPC_URL=http://127.0.0.1:8545
API_BASE_URL=http://localhost:3000
CORS_ORIGIN=*
```

### Override with Custom .env
```bash
# Create custom .env file
cp .env.example .env

# Edit values
nano .env

# Start with custom config
npm run docker:up
```

### Runtime Environment Variables
```bash
docker run -p 3000:3000 \
  -e NETWORK=testnet \
  -e PRIVATE_KEY=your_actual_private_key \
  -e RPC_URL=https://public-node.testnet.rsk.co \
  x402-backend
```

## Network Configuration

### Local Development
```bash
# Default - uses local Hardhat network
npm run docker:up
```

### Rootstock Testnet
```bash
# Set environment for testnet
docker run -p 3000:3000 \
  -e NETWORK=testnet \
  -e PRIVATE_KEY=your_testnet_private_key \
  x402-backend
```

### Rootstock Mainnet
```bash
# Set environment for mainnet
docker run -p 3000:3000 \
  -e NETWORK=mainnet \
  -e PRIVATE_KEY=your_mainnet_private_key \
  x402-backend
```

## Development Features

### Local Blockchain + Backend
```bash
# Starts both backend and local Ethereum node
npm run docker:dev

# Access points:
# - Backend: http://localhost:3000
# - Blockchain: http://localhost:8545
# - WebSocket: ws://localhost:8546
```

### Health Monitoring
```bash
# Check container health
docker ps

# View health check logs
docker inspect x402-backend | grep Health

# Manual health test
curl http://localhost:3000/health
```

## Security Features

- **Non-root user**: Container runs as `x402user` (UID 1001)
- **Alpine Linux**: Minimal attack surface
- **Health checks**: Automatic container monitoring
- **Clean builds**: Uses .dockerignore to exclude sensitive files

## Troubleshooting

### Container Won't Start
```bash
# Check logs
npm run docker:logs

# Check container status
docker ps -a

# Rebuild image
npm run docker:build
```

### Network Issues
```bash
# Check port mapping
docker port <container_id>

# Test endpoints
npm run docker:test

# Check RPC connectivity
curl http://localhost:3000/api
```

### Performance Issues
```bash
# Check resource usage
docker stats

# View detailed container info
docker inspect x402-backend
```

## Production Deployment

### Build Optimization
- Multi-stage build reduces image size
- Only production dependencies included
- Source code copied after dependencies for better caching

### Security Checklist
- [ ] Use custom private key (not default)
- [ ] Set proper CORS_ORIGIN
- [ ] Use HTTPS in production
- [ ] Monitor container health
- [ ] Regular security updates

### Scaling
```bash
# Scale backend instances
docker-compose up --scale x402-backend=3

# Use load balancer
# Configure nginx/traefik for multiple instances
```

## Advanced Usage

### Custom Dockerfile
```dockerfile
# Extend base image
FROM x402-backend:latest

# Add custom configurations
COPY custom-config.json /app/
ENV CUSTOM_CONFIG=custom-config.json
```

### Volume Mounts
```bash
# Mount custom configuration
docker run -p 3000:3000 \
  -v $(pwd)/custom.env:/app/.env:ro \
  x402-backend
```

### Network Configuration
```bash
# Create custom network
docker network create x402-network

# Run with custom network
docker run --network x402-network x402-backend
```