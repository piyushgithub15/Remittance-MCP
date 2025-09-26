# Docker Guide for REST API Server

This guide covers Docker deployment for the Remittance REST API Server.

## Files Overview

### Docker Files
- **`Dockerfile.api`** - Production Dockerfile for REST API
- **`Dockerfile.api.dev`** - Development Dockerfile with hot reload
- **`docker-compose.api.yml`** - Production Docker Compose setup
- **`docker-compose.api.dev.yml`** - Development Docker Compose setup
- **`nginx.api.conf`** - Nginx reverse proxy configuration

## Quick Start

### Development Environment
```bash
# Start development environment
docker-compose -f docker-compose.api.dev.yml up --build

# Run in background
docker-compose -f docker-compose.api.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.api.dev.yml logs -f remittance-api-dev
```

### Production Environment
```bash
# Start production environment
docker-compose -f docker-compose.api.yml up --build

# Run in background
docker-compose -f docker-compose.api.yml up -d --build

# View logs
docker-compose -f docker-compose.api.yml logs -f remittance-api
```

## Docker Commands

### Build Images
```bash
# Build production image
docker build -f Dockerfile.api -t remittance-api:latest .

# Build development image
docker build -f Dockerfile.api.dev -t remittance-api:dev .
```

### Run Containers
```bash
# Run production container
docker run -d \
  --name remittance-api \
  -p 8070:8070 \
  -e MONGODB_URI=mongodb://localhost:27017/remittance \
  -e JWT_SECRET=your-secret-key \
  remittance-api:latest

# Run development container with volume mounting
docker run -d \
  --name remittance-api-dev \
  -p 8070:8070 \
  -v $(pwd)/src:/app/src \
  -e NODE_ENV=development \
  remittance-api:dev
```

## Environment Variables

### Required Variables
```bash
NODE_ENV=production
PORT=8070
MONGODB_URI=mongodb://mongodb:27017/remittance
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
```

### Optional Variables
```bash
CALLBACK_VOICE_URL=http://localhost:8080/voice/
CALLBACK_VOICE_TOKEN=yourVoiceToken
CALLBACK_TEXT_URL=http://localhost:8080/text/
CALLBACK_TEXT_TOKEN=yourTextToken
```

## Services Overview

### 1. Remittance API Server
- **Port**: 8070
- **Health Check**: `/actuator/health`
- **Features**: REST API, JWT authentication, MongoDB integration

### 2. MongoDB Database
- **Port**: 27017
- **Admin UI**: Available via mongo-express
- **Data Persistence**: Docker volume

### 3. MongoDB Express (Admin UI)
- **Port**: 8081
- **Credentials**: admin/password
- **URL**: http://localhost:8081

### 4. Nginx Reverse Proxy
- **Port**: 80 (HTTP)
- **Features**: Rate limiting, CORS, SSL termination
- **Load Balancing**: Ready for multiple API instances

## API Endpoints

### Health Check
```bash
curl http://localhost:8070/actuator/health
```

### Authentication
```bash
# Generate JWT token
curl -X POST http://localhost:8070/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "scope": "read"}'
```

### API Examples
```bash
# Query exchange rate
curl -X POST http://localhost:8070/api/exchange-rate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toCountry": "CN", "toCurrency": "CNY"}'

# Get beneficiaries
curl -X POST http://localhost:8070/api/beneficiaries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"country": "CN", "limit": 10}'
```

## Development Workflow

### 1. Start Development Environment
```bash
docker-compose -f docker-compose.api.dev.yml up --build
```

### 2. Make Code Changes
- Edit files in `src/` directory
- Changes are automatically reflected (hot reload)
- Check logs: `docker-compose -f docker-compose.api.dev.yml logs -f`

### 3. Test API
```bash
# Run test script
npm run test-server

# Run transaction status tests
npm run test-transaction-status
```

### 4. Database Management
- Access MongoDB Express: http://localhost:8081
- Connect directly: `mongosh mongodb://admin:password@localhost:27017/remittance`

## Production Deployment

### 1. Environment Setup
```bash
# Create production environment file
cp env.example .env.production

# Edit environment variables
nano .env.production
```

### 2. Deploy with Docker Compose
```bash
# Start production stack
docker-compose -f docker-compose.api.yml up -d --build

# Check status
docker-compose -f docker-compose.api.yml ps

# View logs
docker-compose -f docker-compose.api.yml logs -f
```

### 3. SSL/HTTPS Setup
```bash
# Add SSL certificates to nginx volume
# Update nginx.api.conf for HTTPS
# Restart nginx container
```

## Monitoring & Logs

### View Logs
```bash
# All services
docker-compose -f docker-compose.api.yml logs

# Specific service
docker-compose -f docker-compose.api.yml logs remittance-api

# Follow logs
docker-compose -f docker-compose.api.yml logs -f remittance-api
```

### Health Checks
```bash
# API health
curl http://localhost:8070/actuator/health

# MongoDB health
docker exec remittance-mongodb mongosh --eval "db.adminCommand('ping')"

# Container status
docker-compose -f docker-compose.api.yml ps
```

### Performance Monitoring
```bash
# Container stats
docker stats

# Resource usage
docker system df

# Clean up
docker system prune
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :8070

# Kill process
kill -9 PID

# Or use different port
docker run -p 8071:8070 remittance-api:latest
```

#### 2. MongoDB Connection Issues
```bash
# Check MongoDB container
docker logs remittance-mongodb

# Test connection
docker exec remittance-mongodb mongosh --eval "db.adminCommand('ping')"

# Restart MongoDB
docker-compose -f docker-compose.api.yml restart mongodb
```

#### 3. API Not Starting
```bash
# Check API logs
docker logs remittance-api

# Check environment variables
docker exec remittance-api env | grep -E "(MONGODB|JWT)"

# Restart API
docker-compose -f docker-compose.api.yml restart remittance-api
```

#### 4. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Rebuild with proper permissions
docker-compose -f docker-compose.api.yml up --build --force-recreate
```

### Debug Mode
```bash
# Run container in debug mode
docker run -it --rm \
  --name remittance-api-debug \
  -p 8070:8070 \
  -e NODE_ENV=development \
  -e DEBUG=* \
  remittance-api:dev

# Or with docker-compose
docker-compose -f docker-compose.api.dev.yml run --rm remittance-api-dev
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use Docker secrets for production
- Rotate JWT secrets regularly

### 2. Network Security
- Use Docker networks for service isolation
- Implement proper firewall rules
- Use HTTPS in production

### 3. Container Security
- Run as non-root user
- Keep base images updated
- Scan images for vulnerabilities

### 4. Database Security
- Use strong passwords
- Enable authentication
- Regular backups

## Scaling

### Horizontal Scaling
```yaml
# docker-compose.api.yml
services:
  remittance-api:
    deploy:
      replicas: 3
    # ... other config
```

### Load Balancing
- Nginx configuration supports multiple upstream servers
- Use Docker Swarm or Kubernetes for orchestration
- Implement health checks for automatic failover

## Backup & Recovery

### Database Backup
```bash
# Backup MongoDB
docker exec remittance-mongodb mongodump --out /backup

# Copy backup from container
docker cp remittance-mongodb:/backup ./mongodb-backup
```

### Application Backup
```bash
# Backup application data
docker run --rm -v remittance_logs:/data -v $(pwd):/backup alpine tar czf /backup/logs-backup.tar.gz -C /data .
```

This Docker setup provides a complete, production-ready environment for the Remittance REST API Server with proper security, monitoring, and scaling capabilities.
