const extensionName = 'ST-SB-Syncer';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);

    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $('#extensions_settings2').append(settingsHtml);

        console.log(`[${extensionName}] Loaded successfully.`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});