import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.vercel', '.netlify', 'coverage']);
const allowedFiles = new Set(['.env.example']);
const findings = [];

function isTracked(relativePath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relativePath], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findLegacyServiceRoleTokens(content) {
  const matches = content.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g) || [];
  return matches.some((token) => {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(decoded).role === 'service_role';
    } catch {
      return false;
    }
  });
}

const patterns = [
  { name: 'Supabase secret key', regex: /sb_secret_[A-Za-z0-9_-]{12,}/ },
  { name: 'Private key material', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub personal access token', regex: /gh[pousr]_[A-Za-z0-9_]{30,}/ },
  { name: 'Stripe secret key', regex: /sk_(?:live|test)_[A-Za-z0-9]{20,}/ },
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(root, full);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) await walk(full);
      continue;
    }
    if (!entry.isFile() || allowedFiles.has(entry.name)) continue;
    if (/^\.env(?:\..+)?$/.test(entry.name)) {
      if (isTracked(relative)) findings.push({ file: relative, rule: 'Environment file is tracked by Git' });
      continue;
    }
    if (/\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|zip|pdf|docx?)$/i.test(entry.name)) continue;
    let content;
    try { content = await readFile(full, 'utf8'); } catch { continue; }
    for (const rule of patterns) {
      if (rule.regex.test(content)) findings.push({ file: relative, rule: rule.name });
    }
    if (findLegacyServiceRoleTokens(content)) findings.push({ file: relative, rule: 'Legacy Supabase service_role JWT' });
  }
}

await walk(root);
if (findings.length) {
  console.error('Potential secret exposure found:');
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.rule}`);
  process.exitCode = 1;
} else {
  console.log('No known secret patterns found in the scanned working tree.');
  console.log('This check does not scan remote Git history. Run a history-aware secret scanner before publishing.');
}
