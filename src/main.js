import express from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { server } from './server.js';

const app = express();
app.use(express.json());

const transports = {};

const apiKeyFromHeaders = (headers) => (headers['authorization'] || '').split(' ')[1];

const transportFromReq = async (req) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && transports[sessionId]) {
    return transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      },
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1'],
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    await server.connect(transport);
    return transport;
  }
}

app.post('/mcp', async (req, res) => {
  const transport = await transportFromReq(req);
  if (!transport) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const apiKey = apiKeyFromHeaders(req.headers);
  if (!apiKey) {
    res.status(400).send('Missing API key');
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);

const port = process.env.PORT || 3000;

console.log(`Listen on ${port}`);
app.listen(port);
