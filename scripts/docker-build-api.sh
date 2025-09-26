#!/bin/bash

# Docker Build Script for REST API Server
# Usage: ./scripts/docker-build-api.sh [dev|prod] [tag]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
TAG="latest"
DOCKERFILE="Dockerfile.api.dev"
COMPOSE_FILE="docker-compose.api.dev.yml"

# Parse arguments
if [ $# -ge 1 ]; then
    ENVIRONMENT=$1
fi

if [ $# -ge 2 ]; then
    TAG=$2
fi

# Set environment-specific values
if [ "$ENVIRONMENT" = "prod" ]; then
    DOCKERFILE="Dockerfile.api"
    COMPOSE_FILE="docker-compose.api.yml"
    echo -e "${BLUE}Building production image...${NC}"
elif [ "$ENVIRONMENT" = "dev" ]; then
    echo -e "${BLUE}Building development image...${NC}"
else
    echo -e "${RED}Invalid environment. Use 'dev' or 'prod'${NC}"
    exit 1
fi

# Build image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -f $DOCKERFILE -t remittance-api:$TAG .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully: remittance-api:$TAG${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Optional: Run with docker-compose
read -p "Do you want to start the services with docker-compose? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting services with docker-compose...${NC}"
    docker-compose -f $COMPOSE_FILE up -d --build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Services started successfully${NC}"
        echo -e "${BLUE}API Server: http://localhost:8070${NC}"
        echo -e "${BLUE}Health Check: http://localhost:8070/actuator/health${NC}"
        echo -e "${BLUE}MongoDB Express: http://localhost:8081${NC}"
        echo -e "${YELLOW}To view logs: docker-compose -f $COMPOSE_FILE logs -f${NC}"
    else
        echo -e "${RED}❌ Failed to start services${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 Build process completed!${NC}"
