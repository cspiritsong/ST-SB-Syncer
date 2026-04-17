const extensionName = 'ST-SB-Syncer';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

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

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);

    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $('#extensions_settings2').append(settingsHtml);

        $('#stsb_st_path').on('input', onStPathInput);
        $('#stsb_sb_path').on('input', onSbPathInput);

        loadSettings();

        console.log(`[${extensionName}] Loaded successfully.`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});