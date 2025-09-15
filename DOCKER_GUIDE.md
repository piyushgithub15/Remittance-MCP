# 🐳 Docker Guide for Remittance MCP Server

This guide explains how to build, run, and manage the Remittance MCP Server using Docker.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git (for cloning the repository)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd Remittance-MCP
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example docker.env

# Edit configuration as needed
nano docker.env
```

### 3. Run with Docker Compose

```bash
# Start production services
./scripts/docker-compose.sh up

# Or start development services
./scripts/docker-compose.sh up-dev
```

## 🛠️ Available Commands

### Docker Compose Script

```bash
# Start services
./scripts/docker-compose.sh up          # Production mode
./scripts/docker-compose.sh up-dev      # Development mode

# Stop services
./scripts/docker-compose.sh down

# View logs
./scripts/docker-compose.sh logs        # View logs
./scripts/docker-compose.sh logs-f      # Follow logs

# Manage containers
./scripts/docker-compose.sh ps          # Show running containers
./scripts/docker-compose.sh restart     # Restart services

# Build and cleanup
./scripts/docker-compose.sh build       # Build images
./scripts/docker-compose.sh clean       # Clean up everything
```

### Direct Docker Commands

```bash
# Build image
docker build -t remittance-mcp-server .

# Run container
docker run -d \
  --name remittance-mcp-server \
  --env-file docker.env \
  -p 8080:8080 \
  -v $(pwd)/logs:/app/logs \
  remittance-mcp-server

# View logs
docker logs remittance-mcp-server

# Stop container
docker stop remittance-mcp-server
```

## 📁 File Structure

```
Remittance-MCP/
├── Dockerfile                 # Production Docker image
├── Dockerfile.dev            # Development Docker image
├── docker-compose.yml        # Production compose file
├── docker-compose.dev.yml    # Development compose file
├── nginx.conf                # Nginx reverse proxy config
├── docker.env                # Docker environment variables
├── .dockerignore             # Docker ignore file
└── scripts/
    ├── docker-build.sh       # Build script
    └── docker-compose.sh     # Compose management script
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | `kX8jBUle1vefPPoGrG58ZDDU+f+l9PBJUPWoqT3xgEE=` |
| `JWT_EXPIRES_IN` | JWT expiration time | `1h` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment mode | `production` |
| `LOG_LEVEL` | Logging level | `info` |
| `CALLBACK_VOICE_URL` | Voice callback URL | `http://localhost:8080/voice/` |
| `CALLBACK_TEXT_URL` | Text callback URL | `http://localhost:8080/text/` |

### Ports

- **8080**: Main application port
- **9229**: Debug port (development only)
- **80**: Nginx HTTP port (with nginx profile)
- **443**: Nginx HTTPS port (with nginx profile)

## 🏗️ Build Options

### Production Build

```bash
# Build optimized production image
docker build -t remittance-mcp-server .

# Features:
# - Node.js 18 Alpine (smaller image)
# - Non-root user for security
# - Production dependencies only
# - Health checks
# - Signal handling with dumb-init
```

### Development Build

```bash
# Build development image
docker build -f Dockerfile.dev -t remittance-mcp-server:dev .

# Features:
# - All dependencies (including dev)
# - Hot reload support
# - Debug port exposed
# - Volume mounting for live code changes
```

## 🌐 Networking

### Default Network

All services run on the `remittance-network` bridge network:

```yaml
networks:
  remittance-network:
    driver: bridge
```

### Service Communication

- **remittance-mcp-server**: Main application (port 8080)
- **nginx**: Reverse proxy (ports 80/443)
- **Services communicate via service names**

## 📊 Monitoring and Health Checks

### Health Check Endpoint

```bash
# Check application health
curl http://localhost:8080/actuator/health

# Expected response:
{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Docker Health Checks

```bash
# View container health status
docker ps

# View health check logs
docker inspect remittance-mcp-server | grep -A 10 Health
```

## 🔒 Security Features

### Container Security

- **Non-root user**: Runs as `remittance` user (UID 1001)
- **Minimal base image**: Alpine Linux for smaller attack surface
- **No unnecessary packages**: Only required dependencies
- **Signal handling**: Proper signal handling with dumb-init

### Network Security

- **Rate limiting**: Nginx rate limiting for API endpoints
- **CORS protection**: Configured CORS policies
- **Helmet.js**: Security headers in Express app

### JWT Security

- **Configurable secrets**: Environment-based JWT secrets
- **Token expiration**: Configurable token lifetime
- **Algorithm specification**: HS256 algorithm only

## 🚀 Production Deployment

### 1. Environment Setup

```bash
# Set production environment variables
export NODE_ENV=production
export JWT_SECRET=your-super-secret-key
export CALLBACK_VOICE_URL=https://your-domain.com/voice/
export CALLBACK_TEXT_URL=https://your-domain.com/text/
```

### 2. SSL/TLS Configuration

```bash
# Enable nginx with SSL
./scripts/docker-compose.sh up --profile production

# Place SSL certificates in ./ssl/
# - cert.pem (certificate)
# - key.pem (private key)
```

### 3. Monitoring

```bash
# View logs
docker-compose logs -f

# Monitor resource usage
docker stats

# Check health status
curl https://your-domain.com/actuator/health
```

## 🐛 Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker logs remittance-mcp-server

# Check environment variables
docker exec -it remittance-mcp-server env

# Verify port availability
netstat -tulpn | grep 8080
```

#### Permission Issues

```bash
# Fix log directory permissions
sudo chown -R 1001:1001 logs/

# Rebuild with proper permissions
docker-compose down
docker-compose up --build
```

#### Network Issues

```bash
# Check network connectivity
docker network ls
docker network inspect remittance-network

# Test service communication
docker exec -it remittance-mcp-server curl http://localhost:8080/actuator/health
```

### Debug Mode

```bash
# Run in debug mode
docker run -it --rm \
  --env-file docker.env \
  -p 8080:8080 \
  -p 9229:9229 \
  remittance-mcp-server:dev \
  node --inspect=0.0.0.0:9229 src/server.js
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Alpine Linux](https://alpinelinux.org/)

## 🤝 Contributing

When adding new features or modifying the Docker setup:

1. Update the relevant Dockerfile
2. Test with both production and development modes
3. Update this documentation
4. Ensure security best practices are maintained

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
