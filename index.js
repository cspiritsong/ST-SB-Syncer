const extensionName = 'ST-SB-Syncer';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const ENGINE_URL = 'http://localhost:3000';

const defaultSettings = Object.freeze({
    stPath: '',
    sbPath: '',
});

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[extensionName]) {
        extensionSettings[extensionName] = structuredClone(defaultSettings);
    }
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[extensionName], key)) {
            extensionSettings[extensionName][key] = defaultSettings[key];
        }
    }
    return extensionSettings[extensionName];
}

function loadSettings() {
    const settings = getSettings();
    $('#stsb_st_path').val(settings.stPath);
    $('#stsb_sb_path').val(settings.sbPath);
}

function onPathInput() {
    const settings = getSettings();
    const { saveSettingsDebounced } = SillyTavern.getContext();
    settings.stPath = String($('#stsb_st_path').val());
    settings.sbPath = String($('#stsb_sb_path').val());
    saveSettingsDebounced();
}

function suggestPeerPath(sourcePath) {
    if (!sourcePath) return '';
    if (sourcePath.includes('SillyTavern')) {
        return sourcePath.replace(/SillyTavern/g, 'SillyBunny');
    }
    if (sourcePath.includes('SillyBunny')) {
        return sourcePath.replace(/SillyBunny/g, 'SillyTavern');
    }
    return '';
}

function onStPathInput() {
    onPathInput();
    const stPath = String($('#stsb_st_path').val());
    const sbPath = String($('#stsb_sb_path').val());
    if (stPath && !sbPath) {
        const guess = suggestPeerPath(stPath);
        if (guess) {
            const settings = getSettings();
            const { saveSettingsDebounced } = SillyTavern.getContext();
            settings.sbPath = guess;
            $('#stsb_sb_path').val(guess);
            saveSettingsDebounced();
        }
    }
}

function onSbPathInput() {
    onPathInput();
    const sbPath = String($('#stsb_sb_path').val());
    const stPath = String($('#stsb_st_path').val());
    if (sbPath && !stPath) {
        const guess = suggestPeerPath(sbPath);
        if (guess) {
            const settings = getSettings();
            const { saveSettingsDebounced } = SillyTavern.getContext();
            settings.stPath = guess;
            $('#stsb_st_path').val(guess);
            saveSettingsDebounced();
        }
    }
}

const MAX_LOG_ENTRIES = 500;

function appendLog(type, message) {
    const log = document.getElementById('stsb-log');
    if (!log) return;
    const placeholder = log.querySelector('.stsb-log-placeholder');
    if (placeholder) placeholder.remove();

    if (type === 'skip') {
        const counter = document.getElementById('stsb-skip-counter');
        if (counter) {
            counter.textContent = String(parseInt(counter.textContent || '0', 10) + 1);
            return;
        }
        const skipLine = document.createElement('div');
        skipLine.className = 'stsb-log-entry';
        skipLine.innerHTML = `<span class="stsb-log-time">${new Date().toLocaleTimeString('en-US', { hour12: false })}</span> <span class="stsb-log-msg stsb-log-skip">Skipped: <span id="stsb-skip-counter">1</span> files (up to date)</span>`;
        log.appendChild(skipLine);
        log.scrollTop = log.scrollHeight;
        return;
    }

    const skipCounter = document.getElementById('stsb-skip-counter');
    if (skipCounter) {
        const parent = skipCounter.closest('.stsb-log-entry');
        if (parent) parent.remove();
    }

    const now = new Date().toLocaleTimeString('en-US', { hour12: false });
    const row = document.createElement('div');
    row.className = 'stsb-log-entry';
    row.innerHTML = `<span class="stsb-log-time">${now}</span> <span class="stsb-log-msg stsb-log-${type}">${message}</span>`;
    log.appendChild(row);

    while (log.children.length > MAX_LOG_ENTRIES) {
        log.removeChild(log.firstChild);
    }

    log.scrollTop = log.scrollHeight;
}

function setStatus(state) {
    const dot = document.getElementById('stsb-status-dot');
    if (!dot) return;
    dot.className = 'stsb-status-dot' + (state ? (' stsb-status-' + state) : '');
}

function setBtnsDisabled(disabled) {
    document.querySelectorAll('.stsb-syncer-settings .stsb-btn').forEach(btn => {
        btn.disabled = disabled;
    });
}

async function checkEngine() {
    try {
        const res = await fetch(`${ENGINE_URL}/api/ping`);
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok') {
                setStatus('ok');
                document.getElementById('stsb-engine-msg').textContent = 'Sync app is running.';
                document.getElementById('stsb-start-hint').style.display = 'none';
                return true;
            }
        }
    } catch {}
    setStatus('down');
    document.getElementById('stsb-engine-msg').textContent = 'Sync app is not running.';
    document.getElementById('stsb-start-hint').style.display = 'block';
    return false;
}

function copyStartCommand() {
    const repoPath = document.getElementById('stsb-repo-path').value.trim();
    const cmd = repoPath ? `cd ${repoPath} && npm start` : 'cd /path/to/ST-SB-Syncer && npm start';
    navigator.clipboard.writeText(cmd).then(() => {
        toastr.success('Command copied to clipboard.');
    }).catch(() => {
        toastr.error('Failed to copy. Select and copy manually.');
    });
}

function startSync(endpoint, direction) {
    const stPath = String($('#stsb_st_path').val()).trim();
    const sbPath = String($('#stsb_sb_path').val()).trim();

    if (!stPath || !sbPath) {
        toastr.error('Both paths must be filled in before syncing.');
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

    const { Popup, POPUP_RESULT } = SillyTavern.getContext();
    Popup.show.confirm(
        `Sync ${typeLabel} data: ${label}?`,
        'Newer files are copied. Existing newer files are kept untouched.'
    ).then(result => {
        if (result !== POPUP_RESULT.AFFIRMATIVE) return;

        appendLog('info', `══════ Starting ${typeLabel} sync: ${label} ══════`);
        setBtnsDisabled(true);
        setStatus('running');

        const params = new URLSearchParams({ source, destination });
        const es = new EventSource(`${ENGINE_URL}/api/${endpoint}?${params}`);

        es.onmessage = (e) => {
            const { type, message } = JSON.parse(e.data);
            appendLog(type, message);
            if (type === 'done') {
                es.close();
                setBtnsDisabled(false);
                setStatus('ok');
            }
        };

        es.onerror = () => {
            appendLog('error', 'Connection to sync app lost. Is it still running?');
            es.close();
            setBtnsDisabled(false);
            setStatus('down');
        };
    });
}

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);

    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $('#extensions_settings2').append(settingsHtml);

        $('#stsb_st_path').on('input', onStPathInput);
        $('#stsb_sb_path').on('input', onSbPathInput);

        loadSettings();
        checkEngine();

        $('#stsb-sync-st-to-sb').on('click', () => startSync('sync', 'st-to-sb'));
        $('#stsb-sync-sb-to-st').on('click', () => startSync('sync', 'sb-to-st'));
        $('#stsb-ext-st-to-sb').on('click', () => startSync('sync-extensions', 'st-to-sb'));
        $('#stsb-ext-sb-to-st').on('click', () => startSync('sync-extensions', 'sb-to-st'));
        $('#stsb-refresh').on('click', checkEngine);
        $('#stsb-copy-cmd').on('click', copyStartCommand);

        console.log(`[${extensionName}] Loaded successfully.`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});