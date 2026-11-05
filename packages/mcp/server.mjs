#!/usr/bin/env node
import{StdioServerTransport}from'@modelcontextprotocol/sdk/server/stdio.js';
import{createHauntkitServer}from'./index.mjs';
const server=createHauntkitServer();
await server.connect(new StdioServerTransport());

