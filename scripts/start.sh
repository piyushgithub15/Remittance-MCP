#!/bin/bash

# Remittance MCP Server Startup Script

set -e

echo "🚀 Starting Remittance MCP Server..."
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "✅ Created .env file from template. Please review and update as needed."
    else
        echo "❌ env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Parse command line arguments
MODE="http"
MCP_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --mcp)
            MCP_MODE=true
            MODE="mcp"
            shift
            ;;
        --dev)
            MODE="dev"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --mcp     Start as MCP server (stdio transport)"
            echo "  --dev     Start in development mode with watch"
            echo "  --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                # Start HTTP server"
            echo "  $0 --mcp          # Start MCP server"
            echo "  $0 --dev          # Start in development mode"
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Generate a test token
echo "🔑 Generating test JWT token..."
TOKEN=$(node scripts/generate-token.js test-user read 2>/dev/null | grep -A1 "Generated Token:" | tail -1)
if [ -n "$TOKEN" ]; then
    echo "✅ Test token generated: ${TOKEN:0:20}..."
else
    echo "⚠️  Could not generate test token. You may need to generate one manually."
fi

# Start the server
echo ""
echo "🎯 Starting server in $MODE mode..."
echo ""

if [ "$MODE" = "mcp" ]; then
    echo "📡 MCP Server Mode (stdio transport)"
    echo "   This mode is for MCP client integration."
    echo "   The server will communicate via stdin/stdout."
    echo ""
    node src/server.js --mcp
elif [ "$MODE" = "dev" ]; then
    echo "🔧 Development Mode (with watch)"
    echo "   Server will restart automatically on file changes."
    echo "   HTTP endpoints available at http://localhost:8080"
    echo ""
    npm run dev
else
    echo "🌐 HTTP Server Mode"
    echo "   Server running at http://localhost:8080"
    echo "   Health check: http://localhost:8080/actuator/health"
    echo "   MCP messages: http://localhost:8080/mcp/messages"
    echo ""
    if [ -n "$TOKEN" ]; then
        echo "🧪 Test the API:"
        echo "   curl -H \"Authorization: Bearer $TOKEN\" \\"
        echo "        -H \"Content-Type: application/json\" \\"
        echo "        -d '{\"method\":\"queryExchangeRate\",\"params\":{\"toCountry\":\"CN\",\"toCurrency\":\"CNY\"}}' \\"
        echo "        http://localhost:8080/mcp/messages"
        echo ""
    fi
    node src/server.js
fi
