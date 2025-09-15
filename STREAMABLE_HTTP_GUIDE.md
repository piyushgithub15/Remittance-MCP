# Stateless MCP Server with StreamableHTTP Transport

This guide demonstrates how to implement a stateless MCP (Model Context Protocol) server using the StreamableHTTP transport, following the official MCP documentation.

## 🏗️ Architecture

### Stateless vs Stateful Modes

**Stateless Mode:**
- No session management
- Each request is independent
- Perfect for serverless environments
- Lower memory usage
- Better for horizontal scaling

**Stateful Mode:**
- Maintains session state
- Better for streaming scenarios
- Requires session cleanup
- Higher memory usage

## 📋 Implementation

### 1. Server Setup

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Create MCP server
const mcpServer = new Server({
  name: 'remittance-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Set up stateless endpoints
app.post('/mcp', async (req, res) => {
  try {
    // Create new transport instance for each request (stateless)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true // JSON responses for simple request/response
    });

    // Connect server to transport
    await mcpServer.connect(transport);
    
    // Handle request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Required Headers

The StreamableHTTP transport requires specific headers:

```javascript
const response = await fetch('http://localhost:8080/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream' // Required!
  },
  body: JSON.stringify(request)
});
```

### 3. MCP Protocol Flow

#### Initialize Request
```javascript
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};
```

#### Tools List Request
```javascript
const toolsRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
};
```

#### Tool Call Request
```javascript
const callRequest = {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'queryExchangeRate',
    arguments: {
      toCountry: 'CN',
      toCurrency: 'CNY'
    }
  }
};
```

## 🚀 Usage Examples

### Basic Tool Call

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "queryExchangeRate",
      "arguments": {
        "toCountry": "CN",
        "toCurrency": "CNY"
      }
    }
  }'
```

### Initialize Server

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "tools": {}
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

## 🔧 Configuration Options

### StreamableHTTPServerTransport Options

```javascript
const transport = new StreamableHTTPServerTransport({
  // Stateless mode - no session management
  sessionIdGenerator: undefined,
  
  // Enable JSON responses for simple request/response
  enableJsonResponse: true,
  
  // Optional: Session callbacks (not used in stateless mode)
  onsessioninitialized: (sessionId) => {
    console.log('Session initialized:', sessionId);
  },
  
  onsessionclosed: (sessionId) => {
    console.log('Session closed:', sessionId);
  }
});
```

### Stateful Mode (for SSE streaming)

```javascript
const transport = new StreamableHTTPServerTransport({
  // Stateful mode - with session management
  sessionIdGenerator: () => require('crypto').randomUUID(),
  
  // Use SSE streaming
  enableJsonResponse: false,
  
  // Session callbacks
  onsessioninitialized: (sessionId) => {
    console.log('Session initialized:', sessionId);
  },
  
  onsessionclosed: (sessionId) => {
    console.log('Session closed:', sessionId);
  }
});
```

## 📊 Performance Characteristics

### Stateless Mode Benefits

- ✅ **Memory Efficient**: No persistent state
- ✅ **Scalable**: Easy horizontal scaling
- ✅ **Serverless Ready**: Perfect for AWS Lambda, Vercel, etc.
- ✅ **Simple**: No session management complexity
- ✅ **Reliable**: Each request is independent

### When to Use Stateless vs Stateful

**Use Stateless When:**
- Building REST-like APIs
- Serverless deployments
- Simple request/response patterns
- High concurrency requirements
- Microservices architecture

**Use Stateful When:**
- Real-time streaming
- Long-running conversations
- Complex multi-step workflows
- WebSocket-like behavior
- Interactive applications

## 🧪 Testing

### Run the Test Suite

```bash
# Start the server
npm start

# Run stateless MCP tests
node scripts/test-streamable-http.js
```

### Test Results

The test suite demonstrates:
- ✅ Stateless operation (no session management)
- ✅ JSON responses for simple request/response
- ✅ Concurrent request handling
- ✅ Proper error handling
- ✅ MCP protocol compliance

## 🔗 Available Endpoints

| Endpoint | Method | Description | Mode |
|----------|--------|-------------|------|
| `/mcp` | POST | Stateless MCP requests | Stateless |
| `/mcp/sse` | GET | Stateful SSE streaming | Stateful |
| `/mcp/session/:id` | DELETE | Session cleanup | Stateful |
| `/mcp/messages` | POST | Legacy HTTP API | Legacy |
| `/auth/token` | POST | JWT token generation | Auth |
| `/actuator/health` | GET | Health check | Health |

## 🛠️ Development

### Project Structure

```
src/
├── server.js              # Main server with StreamableHTTP transport
├── tools/                 # MCP tool implementations
│   ├── queryExchangeRate.js
│   ├── transferMoney.js
│   └── remittanceOrderQuery.js
└── utils/                 # Utilities
    ├── jwt.js
    └── validation.js
```

### Key Files

- `src/server.js` - Main server implementation
- `scripts/test-streamable-http.js` - Test suite
- `STREAMABLE_HTTP_GUIDE.md` - This documentation

## 📚 References

- [MCP StreamableHTTP Specification](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/server/streamableHttp.ts)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Node.js MCP SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

## 🎯 Best Practices

1. **Always include required headers** - `Accept: application/json, text/event-stream`
2. **Use stateless mode for simple APIs** - Better performance and scalability
3. **Handle errors gracefully** - Proper error responses for all scenarios
4. **Test concurrent requests** - Ensure stateless behavior works correctly
5. **Monitor performance** - Track memory usage and response times
6. **Use proper HTTP status codes** - Follow REST conventions
7. **Implement proper logging** - For debugging and monitoring

This implementation provides a robust, scalable, and efficient stateless MCP server using the StreamableHTTP transport, perfect for modern serverless and microservices architectures.
