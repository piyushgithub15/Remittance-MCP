#!/usr/bin/env node

/**
 * MCP Server Entry Point
 * 
 * This is the main entry point for the MCP server when run via MCP inspector
 * or other MCP clients. It starts the server in MCP mode (HTTP transport).
 */

import { RemittanceMCPServer } from './server.js';

// Start the MCP server with HTTP transport
const mcpServer = new RemittanceMCPServer();
mcpServer.run().catch(console.error);
