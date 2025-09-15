#!/bin/bash

# Docker Build Script for Remittance MCP Server
# This script builds and runs the Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="remittance-mcp-server"
CONTAINER_NAME="remittance-mcp-server"
PORT="8080"
ENV_FILE="docker.env"

echo -e "${BLUE}🐳 Remittance MCP Server Docker Build Script${NC}"
echo "=============================================="
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Environment file $ENV_FILE not found. Creating from template..."
    cp env.example "$ENV_FILE"
    print_status "Created $ENV_FILE from template. Please review and modify as needed."
fi

# Build the Docker image
echo -e "${BLUE}Building Docker image...${NC}"
docker build -t "$IMAGE_NAME" .

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo -e "${YELLOW}Stopping and removing existing container...${NC}"
    docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true
fi

# Run the container
echo -e "${BLUE}Starting container...${NC}"
docker run -d \
    --name "$CONTAINER_NAME" \
    --env-file "$ENV_FILE" \
    -p "$PORT:$PORT" \
    -v "$(pwd)/logs:/app/logs" \
    --restart unless-stopped \
    "$IMAGE_NAME"

if [ $? -eq 0 ]; then
    print_status "Container started successfully!"
    echo ""
    echo -e "${BLUE}📋 Container Information:${NC}"
    echo "  Name: $CONTAINER_NAME"
    echo "  Image: $IMAGE_NAME"
    echo "  Port: $PORT"
    echo "  Environment: $ENV_FILE"
    echo ""
    echo -e "${BLUE}🔗 Available Endpoints:${NC}"
    echo "  Health Check: http://localhost:$PORT/actuator/health"
    echo "  Token Generation: POST http://localhost:$PORT/auth/token"
    echo "  MCP StreamableHTTP: POST http://localhost:$PORT/mcp"
    echo "  MCP SSE: GET http://localhost:$PORT/mcp/sse"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo "  View logs: docker logs $CONTAINER_NAME"
    echo "  Follow logs: docker logs -f $CONTAINER_NAME"
    echo "  Stop container: docker stop $CONTAINER_NAME"
    echo "  Remove container: docker rm $CONTAINER_NAME"
    echo "  Shell access: docker exec -it $CONTAINER_NAME sh"
    echo ""
    print_status "Remittance MCP Server is now running in Docker!"
else
    print_error "Failed to start container"
    exit 1
fi
