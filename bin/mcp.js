#!/usr/bin/env node
// taskery MCP 서버 — 명령 정의표(commands.js)의 명령을 같은 이름·같은 인자의 MCP 도구로 띄운다
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { COMMANDS, execute } = require('./commands');
const L = require('./lib');

// 서버를 띄운 폴더의 본진을 처음에 한 번 정한다 — 세션이 워크트리를 오가도, 워크트리가 지워져도 같은 본진을 쓴다
const startCwd = process.cwd();
let main = null;
try {
  main = L.findMain(startCwd);
} catch (e) {
  main = null;
}

function schemaOf(cmd) {
  const shape = {};
  for (const a of cmd.args) {
    let t;
    if (a.type === 'bool') t = z.boolean();
    else if (a.type === 'list') t = z.array(z.string());
    else t = z.union([z.string(), z.number()]).transform(String);
    shape[a.name] = t.optional().describe(a.desc);
  }
  return shape;
}

const server = new McpServer({ name: 'taskery', version: L.getPackageVersion() });

for (const cmd of COMMANDS) {
  server.registerTool(cmd.name, { description: cmd.summary, inputSchema: schemaOf(cmd) }, async (args) => {
    try {
      const out = await execute(cmd, args || {}, { cwd: startCwd, main: main || L.findMain(startCwd) });
      return { content: [{ type: 'text', text: out || '완료' }] };
    } catch (e) {
      const text = e instanceof L.TaskeryError ? e.message : `taskery ${cmd.name} 실패: ${e.message}`;
      return { content: [{ type: 'text', text }], isError: true };
    }
  });
}

server.connect(new StdioServerTransport()).catch((e) => {
  console.error(`taskery mcp 실패: ${e.message}`);
  process.exit(1);
});
