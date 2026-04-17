import fs from 'node:fs';
import path from 'node:path';
import fsp from 'node:fs/promises';

export const info = {
    id: 'st-sb-syncer',
    name: 'ST-SB Syncer Plugin',
    description: 'Syncs profiles, chats, settings, presets, and third-party extensions between SillyTavern and SillyBunny.',
};

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

const THIRD_PARTY_CANDIDATES = [
    ['public', 'scripts', 'extensions', 'third-party'],
    ['public', 'scripts', 'extensions', 'third_party'],
];

function sendSse(res, type, message) {
    res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
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
        } catch {}
    }
    return { dir: null, tried };
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
        } catch {}
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

async function detectHostRoot() {
    const markers = ['package.json', 'server.js', 'config.yaml'];
    let current = import.meta.url;
    if (current.startsWith('file://')) {
        current = path.dirname(new URL(current).pathname);
    }
    for (let i = 0; i < 20; i++) {
        let match = true;
        for (const marker of markers) {
            try {
                await fsp.access(path.join(current, marker));
            } catch {
                match = false;
                break;
            }
        }
        if (match) return current;
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return null;
}

export async function init(router) {
    let cachedHostRoot = null;

    router.get('/detect-host', async (_req, res) => {
        try {
            if (!cachedHostRoot) {
                cachedHostRoot = await detectHostRoot();
            }
            res.json({ hostRoot: cachedHostRoot });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/sync', async (req, res) => {
        const { source, destination, scope } = req.query;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const send = (type, message) => sendSse(res, type, message);

        if (!source || !destination) {
            send('error', 'Missing source or destination path.');
            send('done', '');
            return res.end();
        }

        const srcBase = path.join(source, 'data', 'default-user');
        const dstBase = path.join(destination, 'data', 'default-user');

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

    router.get('/sync-extensions', async (req, res) => {
        const { source, destination } = req.query;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const send = (type, message) => sendSse(res, type, message);

        if (!source || !destination) {
            send('error', 'Missing source or destination path.');
            send('done', '');
            return res.end();
        }

        const srcResolved = await firstExistingDir(source, THIRD_PARTY_CANDIDATES);
        if (!srcResolved.dir) {
            send('error', 'Source third-party extension folder not found.');
            send('error', `Checked: ${srcResolved.tried.join(' | ')}`);
            send('done', '');
            return res.end();
        }

        const dstResolved = await firstExistingDir(destination, THIRD_PARTY_CANDIDATES);
        const dstExtDir = dstResolved.dir || path.join(destination, ...THIRD_PARTY_CANDIDATES[0]);
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
            if (entry.name === '.gitkeep') {
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
}