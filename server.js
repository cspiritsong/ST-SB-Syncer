const express = require('express');
const fsp = require('fs').promises;
const path = require('path');
const { execFile, exec } = require('child_process');

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
}

async function copyFile(srcPath, dstPath, label, send) {
  try {
    const srcStat = await fsp.stat(srcPath);

    try {
      const dstStat = await fsp.stat(dstPath);
      if (srcStat.mtimeMs <= dstStat.mtimeMs) {
        send('skip', `Skipped (up to date): ${label}`);
        return 'skipped';
      }
    } catch {
      // Destination doesn't exist — will copy
    }

    await fsp.mkdir(path.dirname(dstPath), { recursive: true });
    await fsp.copyFile(srcPath, dstPath);
    await fsp.utimes(dstPath, srcStat.atime, srcStat.mtime);
    send('copy', `Copied: ${label}`);
    return 'copied';
  } catch (err) {
    send('error', `Error copying ${label}: ${err.message}`);
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

app.use(express.static(path.join(__dirname, 'public')));

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

// SSE endpoint — clones missing extensions from their GitHub origins
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

  const srcExtDir = path.join(expandPath(source), 'data', 'default-user', 'extensions');
  const dstExtDir = path.join(expandPath(destination), 'data', 'default-user', 'extensions');

  try {
    await fsp.access(srcExtDir);
  } catch {
    send('error', `Source extensions folder not found: ${srcExtDir}`);
    send('done', '');
    return res.end();
  }

  await fsp.mkdir(dstExtDir, { recursive: true });

  send('info', `Source:      ${srcExtDir}`);
  send('info', `Destination: ${dstExtDir}`);
  send('info', '─'.repeat(60));

  const entries = await fsp.readdir(srcExtDir, { withFileTypes: true });
  const folders = entries.filter(e => e.isDirectory());

  let cloned = 0, skipped = 0, manual = 0;

  for (const folder of folders) {
    const name = folder.name;
    const gitConfigPath = path.join(srcExtDir, name, '.git', 'config');

    let url = null;
    try {
      const configText = await fsp.readFile(gitConfigPath, 'utf8');
      const match = configText.match(/\[remote "origin"\][^\[]*url\s*=\s*(\S+)/s);
      if (match) url = match[1].trim();
    } catch {
      // No .git/config — not a git repo
    }

    if (!url) {
      send('warn', `⚠ No GitHub URL found for: ${name} — install manually`);
      manual++;
      continue;
    }

    const dstFolder = path.join(dstExtDir, name);
    let dstExists = false;
    try {
      await fsp.access(dstFolder);
      dstExists = true;
    } catch { /* doesn't exist */ }

    if (dstExists) {
      // Check if destination has a git remote URL
      const dstGitConfigPath = path.join(dstFolder, '.git', 'config');
      let dstHasGit = false;
      try {
        await fsp.access(dstGitConfigPath);
        dstHasGit = true;
      } catch { /* no .git/config */ }

      if (!dstHasGit) {
        send('warn', `⚠ Skipped (no git config, may be custom): ${name}`);
        skipped++;
        continue;
      }

      // Has git config — delete and reclone
      send('info', `Reinstalling: ${name}`);
      await fsp.rm(dstFolder, { recursive: true, force: true });
    }

    await new Promise((resolve) => {
      exec(`git clone ${url} "${dstFolder}"`, (err) => {
        if (err) {
          send('error', `Error cloning ${name}: ${err.message.split('\n')[0]}`);
        } else {
          send('copy', `Cloned: ${name}`);
          cloned++;
        }
        resolve();
      });
    });
  }

  send('info', '─'.repeat(60));
  const manualPart = manual > 0 ? ` | Manual install needed: ${manual}` : '';
  send('summary', `Done — Cloned: ${cloned} | Skipped: ${skipped}${manualPart}`);
  send('done', '');
  res.end();
});

app.listen(PORT, () => {
  console.log(`ST-SB Syncer running at http://localhost:${PORT}`);
});
