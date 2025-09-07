// Print Playwright summary and persist to files for environments
// where stdout is not reliably surfaced by the runner.
// Reads Frontend/playwright-results.json and writes:
//  - Frontend/playwright-summary.txt
//  - Frontend/playwright-summary.md

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  // Assume we are run from Frontend working directory
  const cwd = process.cwd();
  const resultsPath = path.join(cwd, 'playwright-results.json');

  let report;
  try {
    const raw = await readFile(resultsPath, 'utf8');
    report = JSON.parse(raw);
  } catch {
    const msg = '[playwright-summary] No playwright-results.json found. Did tests run with json reporter?';
    // Write a minimal marker so users know why summary is missing
    await writeFile(path.join(cwd, 'playwright-summary.txt'), msg).catch(() => {});
    return;
  }

  const agg = { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, failures: [] };
  const failuresDetailed = [];

  const walk = (suite) => {
    if (!suite) return;
    if (suite.suites) suite.suites.forEach(walk);
    if (suite.tests) {
      for (const t of suite.tests) {
        agg.total += 1;
        const res = t.results?.[0] || {};
        const status = res.status || t.outcome || 'unknown';
        if (status === 'passed') agg.passed += 1;
        else if (status === 'skipped') agg.skipped += 1;
        else agg.failed += 1;
        agg.durationMs += res.duration || 0;
        if (status !== 'passed') {
          const title = (t.titlePath?.join(' › ') || t.title || '').trim();
          const error = (res.error?.message || (t.errors?.[0]?.message) || '').split('\n')[0];
          const attachments = (res.attachments || []).map(a => ({ name: a.name, path: a.path })).filter(a => a.path);
          agg.failures.push({ title, error });
          failuresDetailed.push({ title, error, attachments });
        }
      }
    }
  };

  if (report.suites) report.suites.forEach(walk);

  const header = `Playwright Summary\n` +
    `Total: ${agg.total}  Passed: ${agg.passed}  Failed: ${agg.failed}  Skipped: ${agg.skipped}\n` +
    `Duration: ${(agg.durationMs / 1000).toFixed(1)}s\n`;

  let bodyTxt = '';
  let bodyMd = '';
  if (agg.failed > 0) {
    bodyTxt += '\nFailures:\n';
    bodyMd += '\n### Failures\n';
    for (const f of failuresDetailed) {
      bodyTxt += `- ${f.title}${f.error ? ` :: ${f.error}` : ''}\n`;
      bodyMd += `- ${f.title}${f.error ? ` :: ${f.error}` : ''}\n`;
      if (f.attachments?.length) {
        for (const att of f.attachments) {
          bodyTxt += `    attachment: ${att.name} -> ${att.path}\n`;
          bodyMd += `    attachment: ${att.name} -> ${att.path}\n`;
        }
      }
    }
  }

  const txt = header + bodyTxt;
  const md = `# Playwright Summary\n\n` +
    `- Total: ${agg.total}\n- Passed: ${agg.passed}\n- Failed: ${agg.failed}\n- Skipped: ${agg.skipped}\n- Duration: ${(agg.durationMs / 1000).toFixed(1)}s\n` +
    bodyMd;

  const outTxt = path.join(cwd, 'playwright-summary.txt');
  const outMd = path.join(cwd, 'playwright-summary.md');
  await writeFile(outTxt, txt).catch(() => {});
  await writeFile(outMd, md).catch(() => {});

  // Best-effort print (in case stdout is visible)
  console.log(txt);
}

main().catch((e) => {
  try { console.error('[playwright-summary] error', e?.message || String(e)); } catch {}
});

