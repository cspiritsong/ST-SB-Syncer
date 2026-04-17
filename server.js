const express = require('express');
const fsp = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const PORT = 3000;

const ITEMS_TO_COPY = [
  'characters',
  'chats',
  'group chats',
  'groups',
  'extensions',
  'worlds',
  'settings.json',
  'secrets.json',
  'themes',
  'backgrounds',
  'User Avatars',
  'assets',
  'instruct',
  'context',
  'QuickReplies',
  'sysprompt',
  'OpenAI Settings',
  'KoboldAI Settings',
  'NovelAI Settings',
  'TextGen Settings',
  'user',
  'vectors',
  'reasoning',
  'movingUI',
];

function expandPath(p) {
  return p.replace(/^~/, process.env.HOME || '');
}

function sse(res, type, message) {
  res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
  if (typeof res.flush === 'function') res.flush();
}

async function firstExistingDir(base, relPaths) {
  const tried = [];

  for (const relPath of relPaths) {
    const candidate = path.join(base, ...relPath);
    tried.push(candidate);
    try {
      const stat = await fsp.stat(candidate);
      if (stat.isDirectory()) {
        return { dir: candidate, tried };
      }
    } catch {
      // Ignore and keep trying
    }
  }

  return { dir: null, tried };
}

async function copyFile(srcPath, dstPath, label, send) {
  try {
    let srcStat;
    try {
      srcStat = await fsp.stat(srcPath);
    } catch (err) {
      send('error', `Cannot read source: ${label} — ${err.code || err.message}`);
      return 'error';
    }

    try {
      const dstStat = await fsp.stat(dstPath);
      if (srcStat.mtimeMs <= dstStat.mtimeMs) {
        send('skip', `Skipped (up to date): ${label}`);
        return 'skipped';
      }
    } catch {
      // Destination doesn't exist — will copy
    }

    try {
      await fsp.mkdir(path.dirname(dstPath), { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        send('error', `Cannot create directory for: ${label} — ${err.message}`);
        return 'error';
      }
    }

    try {
      await fsp.copyFile(srcPath, dstPath);
    } catch (err) {
      send('error', `Cannot copy: ${label} — ${err.code === 'EBUSY' ? 'File is locked (close the app and try again)' : err.message}`);
      return 'error';
    }

    try {
      await fsp.utimes(dstPath, srcStat.atime, srcStat.mtime);
    } catch {
      // Timestamp fix is non-critical, skip silently
    }

    send('copy', `Copied: ${label}`);
    return 'copied';
  } catch (err) {
    send('error', `Unexpected error on ${label}: ${err.message}`);
    return 'error';
  }
}

async function copyDir(srcDir, dstDir, label, send) {
  let copied = 0, skipped = 0, errors = 0;

  try {
    await fsp.mkdir(dstDir, { recursive: true });
    const entries = await fsp.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const src = path.join(srcDir, entry.name);
      const dst = path.join(dstDir, entry.name);
      const lbl = `${label}/${entry.name}`;

      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') {
          continue;
        }
        const r = await copyDir(src, dst, lbl, send);
        copied += r.copied; skipped += r.skipped; errors += r.errors;
      } else {
        const r = await copyFile(src, dst, lbl, send);
        if (r === 'copied') copied++;
        else if (r === 'skipped') skipped++;
        else errors++;
      }
    }
  } catch (err) {
    send('error', `Error reading directory ${label}: ${err.message}`);
    errors++;
  }

  return { copied, skipped, errors };
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/ping', (_req, res) => {
  res.json({ status: 'ok', version: '1.3.0' });
});

// Opens a native macOS folder picker and returns the selected path
app.get('/api/browse', (req, res) => {
  execFile('osascript', [
    '-e', 'set p to POSIX path of (choose folder with prompt "Select folder")\nreturn p'
  ], (err, stdout) => {
    if (err) return res.json({ cancelled: true });
    res.json({ path: stdout.trim().replace(/\/$/, '') });
  });
});

// SSE endpoint — starts sync and streams log events to the client
app.get('/api/sync', async (req, res) => {
  const { source, destination } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (type, message) => sse(res, type, message);

  if (!source || !destination) {
    send('error', 'Missing source or destination path.');
    send('done', '');
    return res.end();
  }

  const srcBase = path.join(expandPath(source), 'data', 'default-user');
  const dstBase = path.join(expandPath(destination), 'data', 'default-user');

  try {
    await fsp.access(srcBase);
  } catch {
    send('error', `Source path not found: ${srcBase}`);
    send('error', 'Make sure the app is installed at the specified path.');
    send('done', '');
    return res.end();
  }

  await fsp.mkdir(dstBase, { recursive: true });

  send('info', `Source:      ${srcBase}`);
  send('info', `Destination: ${dstBase}`);
  send('info', `Syncing ${ITEMS_TO_COPY.length} items...`);
  send('info', '─'.repeat(60));

  let totalCopied = 0, totalSkipped = 0, totalErrors = 0;

  for (const item of ITEMS_TO_COPY) {
    const srcPath = path.join(srcBase, item);
    const dstPath = path.join(dstBase, item);

    let stat;
    try {
      stat = await fsp.stat(srcPath);
    } catch {
      // Item doesn't exist in source — skip silently
      continue;
    }

    if (stat.isDirectory()) {
      const r = await copyDir(srcPath, dstPath, item, send);
      totalCopied += r.copied;
      totalSkipped += r.skipped;
      totalErrors += r.errors;
    } else {
      const r = await copyFile(srcPath, dstPath, item, send);
      if (r === 'copied') totalCopied++;
      else if (r === 'skipped') totalSkipped++;
      else totalErrors++;
    }
  }

  send('info', '─'.repeat(60));
  const errPart = totalErrors > 0 ? ` | Errors: ${totalErrors}` : '';
  send('summary', `Done — Copied: ${totalCopied} | Skipped: ${totalSkipped}${errPart}`);
  send('done', '');
  res.end();
});

// SSE endpoint — syncs third-party extension code folders
app.get('/api/sync-extensions', async (req, res) => {
  const { source, destination } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (type, message) => sse(res, type, message);

  if (!source || !destination) {
    send('error', 'Missing source or destination path.');
    send('done', '');
    return res.end();
  }

  const srcRoot = expandPath(source);
  const dstRoot = expandPath(destination);

  const extensionDirCandidates = [
    ['public', 'scripts', 'extensions', 'third-party'],
    ['public', 'scripts', 'extensions', 'third_party'],
  ];

  const srcResolved = await firstExistingDir(srcRoot, extensionDirCandidates);
  if (!srcResolved.dir) {
    send('error', 'Source third-party extension folder not found.');
    send('error', `Checked: ${srcResolved.tried.join(' | ')}`);
    send('done', '');
    return res.end();
  }

  const dstResolved = await firstExistingDir(dstRoot, extensionDirCandidates);
  const dstExtDir = dstResolved.dir || path.join(dstRoot, ...extensionDirCandidates[0]);
  const srcExtDir = srcResolved.dir;

  try {
    await fsp.access(srcExtDir);
    await fsp.mkdir(dstExtDir, { recursive: true });
  } catch (err) {
    send('error', `Unable to prepare extension folders: ${err.message}`);
    send('done', '');
    return res.end();
  }

  send('info', `Source:      ${srcExtDir}`);
  send('info', `Destination: ${dstExtDir}`);
  send('info', 'Mode: copy newer files only (safe merge)');
  send('info', '─'.repeat(60));

  const entries = await fsp.readdir(srcExtDir, { withFileTypes: true });
  let totalCopied = 0, totalSkipped = 0, totalErrors = 0;

  for (const entry of entries) {
    if (entry.name === '.gitkeep' || entry.name === '.git' || entry.name === 'node_modules') {
      continue;
    }

    const srcPath = path.join(srcExtDir, entry.name);
    const dstPath = path.join(dstExtDir, entry.name);

    if (entry.isDirectory()) {
      const r = await copyDir(srcPath, dstPath, `extensions/${entry.name}`, send);
      totalCopied += r.copied;
      totalSkipped += r.skipped;
      totalErrors += r.errors;
    } else {
      const r = await copyFile(srcPath, dstPath, `extensions/${entry.name}`, send);
      if (r === 'copied') totalCopied++;
      else if (r === 'skipped') totalSkipped++;
      else totalErrors++;
    }
  }

  send('info', '─'.repeat(60));
  const errPart = totalErrors > 0 ? ` | Errors: ${totalErrors}` : '';
  send('summary', `Done — Copied: ${totalCopied} | Skipped: ${totalSkipped}${errPart}`);
  send('done', '');
  res.end();
});

app.listen(PORT, () => {
  console.log(`ST-SB Syncer running at http://localhost:${PORT}`);
});
