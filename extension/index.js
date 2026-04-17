import { extension_settings, getContext, saveSettingsDebounced } from '../../../../script.js';

const PLUGIN_BASE = '/api/plugins/st-sb-syncer';

const DEFAULT_SETTINGS = {
    stPath: '',
    sbPath: '',
};

function getSettings() {
    if (!extension_settings.stsbSyncer) {
        extension_settings.stsbSyncer = { ...DEFAULT_SETTINGS };
    }
    return extension_settings.stsbSyncer;
}

function now() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function appendLog(type, message) {
    const log = document.getElementById('stsb-log');
    if (!log) return;
    const placeholder = log.querySelector('.log-placeholder');
    if (placeholder) placeholder.remove();
    const row = document.createElement('div');
    row.className = 'log-entry';
    row.innerHTML =
        `<span class="log-time">${now()}</span>` +
        `<span class="log-msg ${esc(type)}">${esc(message)}</span>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
}

function setStatus(state) {
    const dot = document.getElementById('stsb-status-dot');
    if (!dot) return;
    dot.className = 'status-indicator' + (state ? (' ' + state) : '');
}

function setBtnsDisabled(disabled) {
    const ids = [
        'stsb-sync-st-to-sb', 'stsb-sync-sb-to-st',
        'stsb-ext-st-to-sb', 'stsb-ext-sb-to-st',
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

async function detectHost() {
    try {
        const res = await fetch(`${PLUGIN_BASE}/detect-host`, {
            headers: getRequestHeaders(),
        });
        const data = await res.json();
        return data.hostRoot || '';
    } catch {
        return '';
    }
}

function guessPeerPath(hostRoot) {
    if (!hostRoot) return '';
    if (hostRoot.includes('SillyTavern')) {
        return hostRoot.replace('SillyTavern', 'SillyBunny');
    }
    if (hostRoot.includes('SillyBunny')) {
        return hostRoot.replace('SillyBunny', 'SillyTavern');
    }
    return '';
}

async function onDetectSt() {
    const hostRoot = await detectHost();
    const stInput = document.getElementById('stsb-st-path');
    const sbInput = document.getElementById('stsb-sb-path');
    if (!hostRoot) {
        appendLog('error', 'Could not auto-detect host path.');
        return;
    }
    if (hostRoot.includes('SillyTavern')) {
        stInput.value = hostRoot;
        if (!sbInput.value) {
            sbInput.value = guessPeerPath(hostRoot);
        }
        appendLog('info', `Auto-detected: ${hostRoot}`);
    } else if (hostRoot.includes('SillyBunny')) {
        sbInput.value = hostRoot;
        if (!stInput.value) {
            stInput.value = guessPeerPath(hostRoot);
        }
        appendLog('info', `Auto-detected: ${hostRoot}`);
    } else {
        stInput.value = hostRoot;
        appendLog('info', `Auto-detected: ${hostRoot} (unknown app name)`);
    }
    savePaths();
}

async function onDetectSb() {
    await onDetectSt();
}

function savePaths() {
    const settings = getSettings();
    settings.stPath = document.getElementById('stsb-st-path')?.value || '';
    settings.sbPath = document.getElementById('stsb-sb-path')?.value || '';
    saveSettingsDebounced();
}

function loadPaths() {
    const settings = getSettings();
    const stInput = document.getElementById('stsb-st-path');
    const sbInput = document.getElementById('stsb-sb-path');
    if (stInput && settings.stPath) stInput.value = settings.stPath;
    if (sbInput && settings.sbPath) sbInput.value = settings.sbPath;
}

function startSync(endpoint, direction) {
    const stPath = document.getElementById('stsb-st-path')?.value.trim();
    const sbPath = document.getElementById('stsb-sb-path')?.value.trim();

    if (!stPath || !sbPath) {
        appendLog('error', 'Both paths must be filled in before syncing.');
        return;
    }

    let source, destination, label;
    if (direction === 'st-to-sb') {
        source = stPath;
        destination = sbPath;
        label = 'SillyTavern → SillyBunny';
    } else {
        source = sbPath;
        destination = stPath;
        label = 'SillyBunny → SillyTavern';
    }

    const isExt = endpoint === 'sync-extensions';
    const typeLabel = isExt ? 'extension' : 'profile';

    const confirmed = confirm(
        `Sync ${typeLabel} data: ${label}?\n\n` +
        `Newer files are copied. Existing newer files are kept untouched.`
    );
    if (!confirmed) return;

    appendLog('info', `══════ Starting ${typeLabel} sync: ${label} ══════`);
    setBtnsDisabled(true);
    setStatus('running');

    const params = new URLSearchParams({ source, destination });
    const es = new EventSource(`${PLUGIN_BASE}/${endpoint}?${params}`);

    es.onmessage = (e) => {
        const { type, message } = JSON.parse(e.data);
        appendLog(type, message);
        if (type === 'done') {
            es.close();
            setBtnsDisabled(false);
            setStatus('done');
        }
    };

    es.onerror = () => {
        appendLog('error', 'Connection lost. The sync may have been interrupted.');
        es.close();
        setBtnsDisabled(false);
        setStatus('error');
    };
}

jQuery(async () => {
    const settingsHtml = await renderExtensionTemplateAsync('third-party/ST-SB-Syncer', 'settings');
    $('#extensions_settings2').append(settingsHtml);

    loadPaths();

    document.getElementById('stsb-detect-st')?.addEventListener('click', onDetectSt);
    document.getElementById('stsb-detect-sb')?.addEventListener('click', onDetectSb);

    document.getElementById('stsb-st-path')?.addEventListener('change', savePaths);
    document.getElementById('stsb-sb-path')?.addEventListener('change', savePaths);
    document.getElementById('stsb-st-path')?.addEventListener('input', savePaths);
    document.getElementById('stsb-sb-path')?.addEventListener('input', savePaths);

    document.getElementById('stsb-sync-st-to-sb')?.addEventListener('click', () => startSync('sync', 'st-to-sb'));
    document.getElementById('stsb-sync-sb-to-st')?.addEventListener('click', () => startSync('sync', 'sb-to-st'));
    document.getElementById('stsb-ext-st-to-sb')?.addEventListener('click', () => startSync('sync-extensions', 'st-to-sb'));
    document.getElementById('stsb-ext-sb-to-st')?.addEventListener('click', () => startSync('sync-extensions', 'sb-to-st'));
});