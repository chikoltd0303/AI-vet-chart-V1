// Minimal MCP-like stdio server stub for Playwright control.
// No external deps; communicates via JSON-RPC 2.0 over stdio.
// Methods:
//  - initialize: returns capabilities
//  - runTests { args?: string[] }
//  - openTrace { path: string }
//  - codegen { url?: string }

import { spawn } from 'node:child_process';
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';

const capabilities = {
  tools: [
    { name: 'runTests', description: 'Run Playwright tests', inputSchema: { type: 'object', properties: { args: { type: 'array', items: { type: 'string' } } } } },
    { name: 'openTrace', description: 'Open Playwright trace viewer', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
    { name: 'codegen', description: 'Launch Playwright codegen', inputSchema: { type: 'object', properties: { url: { type: 'string' } } } },
    { name: 'listArtifacts', description: 'List Playwright artifacts and reports', inputSchema: { type: 'object', properties: { roots: { type: 'array', items: { type: 'string' } } } } },
    { name: 'readArtifact', description: 'Read artifact file content', inputSchema: { type: 'object', properties: { path: { type: 'string' }, encoding: { type: 'string', enum: ['base64', 'utf8'] }, maxBytes: { type: 'number' } }, required: ['path'] } },
  ],
};

function respond(id, result, error) {
  const msg = { jsonrpc: '2.0', id };
  if (error) msg.error = { code: -32000, message: String(error) };
  else msg.result = result;
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function handle(method, params, id) {
  try {
    if (method === 'initialize') {
      return respond(id, { capabilities });
    }
    if (method === 'runTests') {
      const args = Array.isArray(params?.args) ? params.args : [];
      const res = await runCommand('npx', ['playwright', 'test', ...args]);
      // Try to read structured JSON report if available
      let summary = null;
      try {
        const jsonPath = process.cwd() + '/playwright-results.json';
        const raw = await readFile(jsonPath, 'utf8');
        const report = JSON.parse(raw);
        // Aggregate basic stats
        const agg = { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, failures: [], traces: [] };
        const walk = (suite) => {
          if (!suite) return;
          if (suite.suites) suite.suites.forEach(walk);
          if (suite.tests) {
            for (const t of suite.tests) {
              agg.total += 1;
              const status = t.results?.[0]?.status || t.outcome || 'unknown';
              if (status === 'passed') agg.passed += 1;
              else if (status === 'skipped') agg.skipped += 1;
              else agg.failed += 1;
              const r0 = t.results?.[0] || {};
              const dur = r0.duration || 0;
              agg.durationMs += dur;
              if (status !== 'passed') {
                const err = r0.error?.message || t.errors?.[0]?.message || '';
                const title = t.titlePath?.join(' › ') || t.title;
                const atts = (r0.attachments || []).map(a => ({ name: a.name, path: a.path })).filter(a => a.path);
                agg.failures.push({ title, error: err, attachments: atts });
                const trace = atts.find(a => (a.name || '').toLowerCase().includes('trace'));
                if (trace) agg.traces.push({ title, path: trace.path });
              }
            }
          }
        };
        if (report.suites) report.suites.forEach(walk);
        // Optionally inline small attachments (base64) to avoid runner-hiding stdout
        if (params?.inlineAttachments) {
          const maxBytes = typeof params.inlineAttachments === 'object' && typeof params.inlineAttachments.maxBytes === 'number'
            ? params.inlineAttachments.maxBytes
            : 256 * 1024; // default 256KB per file
          const inlined = [];
          for (const f of agg.failures) {
            for (const a of f.attachments || []) {
              try {
                const abs = path.resolve(process.cwd(), a.path);
                const buf = await readFile(abs);
                if (buf.length <= maxBytes) {
                  inlined.push({ title: f.title, name: a.name, path: a.path, size: buf.length, base64: buf.toString('base64') });
                }
              } catch {}
            }
          }
          agg.inlined = inlined;
        }
        summary = agg;
      } catch {}
      return respond(id, { code: res.code, stdout: res.stdout, stderr: res.stderr, summary });
    }
    if (method === 'openTrace') {
      const p = params?.path;
      if (!p) throw new Error('path is required');
      const res = await runCommand('npx', ['playwright', 'show-trace', p]);
      return respond(id, { code: res.code });
    }
    if (method === 'codegen') {
      const url = params?.url || 'http://localhost:3000';
      const res = await runCommand('npx', ['playwright', 'codegen', url]);
      return respond(id, { code: res.code });
    }
    if (method === 'listArtifacts') {
      const roots = params?.roots && Array.isArray(params.roots) ? params.roots : [
        'playwright-report', 'playwright-artifacts', 'playwright-results.json', 'playwright-summary.txt', 'playwright-summary.md'
      ];
      const cwd = process.cwd();
      const result = [];
      async function walk(dir) {
        const absDir = path.resolve(cwd, dir);
        let entries;
        try { entries = await readdir(absDir, { withFileTypes: true }); } catch { return; }
        for (const ent of entries) {
          const abs = path.join(absDir, ent.name);
          const rel = path.relative(cwd, abs);
          if (ent.isDirectory()) {
            await walk(rel);
          } else {
            try {
              const s = await stat(abs);
              result.push({ path: rel, size: s.size, mtimeMs: s.mtimeMs });
            } catch {}
          }
        }
      }
      for (const r of roots) {
        const abs = path.resolve(cwd, r);
        try {
          const s = await stat(abs);
          if (s.isDirectory()) await walk(r);
          else result.push({ path: r, size: s.size, mtimeMs: s.mtimeMs });
        } catch {}
      }
      return respond(id, { items: result.sort((a,b)=>a.path.localeCompare(b.path)) });
    }
    if (method === 'readArtifact') {
      const p = params?.path; const enc = params?.encoding || 'base64'; const maxBytes = params?.maxBytes || (512 * 1024);
      if (!p) throw new Error('path is required');
      const cwd = process.cwd();
      const abs = path.resolve(cwd, p);
      // restrict to Frontend dir (cwd) subpaths
      if (!abs.startsWith(cwd)) throw new Error('path must be under project directory');
      const data = await readFile(abs);
      const slice = data.slice(0, maxBytes);
      const content = enc === 'utf8' ? slice.toString('utf8') : slice.toString('base64');
      return respond(id, { path: p, size: data.length, returnedBytes: slice.length, encoding: enc, content });
    }
    return respond(id, null, 'Method not found');
  } catch (e) {
    return respond(id, null, e?.message || String(e));
  }
}

// Read NDJSON lines from stdin
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handle(msg.method, msg.params, msg.id);
    } catch (e) {
      // ignore parse errors
    }
  }
});

process.stdin.on('end', () => process.exit(0));
