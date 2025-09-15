#!/bin/bash

# Docker Compose Script for Remittance MCP Server
# This script manages the Docker Compose setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
DEV_COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE="docker.env"

echo -e "${BLUE}🐳 Remittance MCP Server Docker Compose Script${NC}"
echo "=================================================="
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

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  up          Start the services"
    echo "  up-dev      Start the services in development mode"
    echo "  down        Stop and remove the services"
    echo "  restart     Restart the services"
    echo "  logs        Show logs"
    echo "  logs-f      Follow logs"
    echo "  ps          Show running containers"
    echo "  build       Build the images"
    echo "  clean       Clean up containers and images"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up              # Start production services"
    echo "  $0 up-dev          # Start development services"
    echo "  $0 logs            # View logs"
    echo "  $0 clean           # Clean up everything"
}

# Function to start services
start_services() {
    local mode=$1
    local compose_file=$COMPOSE_FILE
    
    if [ "$mode" = "dev" ]; then
        compose_file=$DEV_COMPOSE_FILE
        echo -e "${BLUE}Starting services in development mode...${NC}"
    else
        echo -e "${BLUE}Starting services in production mode...${NC}"
    fi
    
    docker-compose -f "$compose_file" --env-file "$ENV_FILE" up -d
    
    if [ $? -eq 0 ]; then
        print_status "Services started successfully!"
        echo ""
        echo -e "${BLUE}📋 Service Information:${NC}"
        echo "  Mode: $mode"
        echo "  Compose File: $compose_file"
        echo "  Environment: $ENV_FILE"
        echo ""
        echo -e "${BLUE}🔗 Available Endpoints:${NC}"
        echo "  Health Check: http://localhost:8080/actuator/health"
        echo "  Token Generation: POST http://localhost:8080/auth/token"
        echo "  MCP StreamableHTTP: POST http://localhost:8080/mcp"
        echo "  MCP SSE: GET http://localhost:8080/mcp/sse"
        echo ""
        echo -e "${BLUE}📝 Useful Commands:${NC}"
        echo "  View logs: $0 logs"
        echo "  Follow logs: $0 logs-f"
        echo "  Stop services: $0 down"
        echo "  View containers: $0 ps"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    echo -e "${BLUE}Stopping services...${NC}"
    docker-compose -f "$COMPOSE_FILE" down
    docker-compose -f "$DEV_COMPOSE_FILE" down
    
    print_status "Services stopped successfully!"
}

# Function to show logs
show_logs() {
    local follow=$1
    local compose_file=$COMPOSE_FILE
    
    # Check if dev services are running
    if docker-compose -f "$DEV_COMPOSE_FILE" ps | grep -q "Up"; then
        compose_file=$DEV_COMPOSE_FILE
        echo -e "${BLUE}Showing development logs...${NC}"
    else
        echo -e "${BLUE}Showing production logs...${NC}"
    fi
    
    if [ "$follow" = "true" ]; then
        docker-compose -f "$compose_file" logs -f
    else
        docker-compose -f "$compose_file" logs
    fi
}

# Function to show running containers
show_containers() {
    echo -e "${BLUE}Running containers:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    echo -e "${BLUE}Development containers:${NC}"
    docker-compose -f "$DEV_COMPOSE_FILE" ps
}

# Function to build images
build_images() {
    echo -e "${BLUE}Building images...${NC}"
    docker-compose -f "$COMPOSE_FILE" build
    docker-compose -f "$DEV_COMPOSE_FILE" build
    print_status "Images built successfully!"
}

# Function to clean up
clean_up() {
    echo -e "${BLUE}Cleaning up containers and images...${NC}"
    docker-compose -f "$COMPOSE_FILE" down --rmi all --volumes --remove-orphans
    docker-compose -f "$DEV_COMPOSE_FILE" down --rmi all --volumes --remove-orphans
    print_status "Cleanup completed!"
}

# Main script logic
case "${1:-help}" in
    up)
        start_services "production"
        ;;
    up-dev)
        start_services "dev"
        ;;
    down)
        stop_services
        ;;
    restart)
        stop_services
        start_services "production"
        ;;
    logs)
        show_logs "false"
        ;;
    logs-f)
        show_logs "true"
        ;;
    ps)
        show_containers
        ;;
    build)
        build_images
        ;;
    clean)
        clean_up
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
