# ST-SB Syncer

A tool that syncs data between SillyTavern and SillyBunny. Available as a standalone app and as a SillyTavern/SillyBunny extension.

## Extension (Recommended)

Install as a third-party extension in either SillyTavern or SillyBunny:

1. Enable server plugins in `config.yaml`:
   ```yaml
   enableServerPlugins: true
   ```
2. In the Extensions panel, click **Install Extension** and paste the repo URL:
   ```
   https://github.com/cspiritsong/ST-SB-Syncer
   ```
3. Restart the app. A new **ST ↔ SB Syncer** panel appears in Extensions.
4. Click **Detect** to auto-fill paths, or type them manually.
5. Click a sync button to mirror data.

The extension installs both the client-side UI (loaded as a third-party extension) and the server plugin (placed in the host's `plugins/` directory) which provides the filesystem sync API.

## Standalone App (Fallback)

### Requirements

- Node.js (v16 or later)

### Setup

```bash
cd ~/ST-SB-Syncer
npm install
```

### Running

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

### Usage

1. Set the paths to your SillyTavern and SillyBunny installations
2. Click **Browse…** to pick a folder with a native dialog, or type the path directly
3. Click either sync button:
   - **Copy ST → SillyBunny** — SillyTavern is the source
   - **Copy SillyBunny → ST** — SillyBunny is the source
4. For third-party extension code, use one of the **Sync Extensions** buttons
   - **Sync Extensions ST → SillyBunny**
   - **Sync Extensions SillyBunny → ST**
    
   This mirrors extension files from `public/scripts/extensions/third-party` (with fallback path detection).
5. Watch the log window for real-time progress and a final summary

## What gets synced

Files and folders copied from `data/default-user/` in the source to `data/default-user/` in the destination:

`characters`, `chats`, `group chats`, `groups`, `extensions`, `worlds`, `settings.json`, `secrets.json`, `themes`, `backgrounds`, `User Avatars`, `assets`, `instruct`, `context`, `QuickReplies`, `sysprompt`, `OpenAI Settings`, `KoboldAI Settings`, `NovelAI Settings`, `TextGen Settings`, `user`, `vectors`, `reasoning`, `movingUI`

Third-party extension code is synced separately from:

`public/scripts/extensions/third-party`

## Merge behaviour

Files are **never blindly overwritten** — if a file already exists at the destination, the one with the newer modification date is kept. Older files are skipped.