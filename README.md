# ST-SB Syncer

Mirror data between SillyTavern and SillyBunny so switching between them feels seamless.

## Two ways to use it

### Option A: Extension (recommended)

Install inside SillyTavern or SillyBunny. The extension provides a UI with sync buttons. The standalone app runs in the background as the sync engine.

### Option B: Standalone app only

Run the app in a browser tab. Everything works from the web interface. No extension needed.

---

## Setup

### Step 1: Clone and install the app

You only do this once.

```bash
git clone https://github.com/cspiritsong/ST-SB-Syncer.git
cd ST-SB-Syncer
npm install
```

### Step 2: Start the sync app

Every time you want to sync, run this in a terminal:

```bash
npm start
```

Leave it running. It provides the sync engine at `http://localhost:3000`.

### Step 3 (extension only): Install the extension

1. Open SillyTavern or SillyBunny
2. Go to the Extensions panel
3. Click **Install Extension**
4. Paste: `https://github.com/cspiritsong/ST-SB-Syncer`
5. Click Install
6. Refresh the page
7. Find **ST ↔ SB Syncer** in the Extensions panel on the right

The extension needs the app running to sync. If the extension shows a red dot, start the app (Step 2) then click the refresh button.

---

## How to sync

### Using the extension

1. Open the ST ↔ SB Syncer drawer in Extensions
2. Enter your SillyTavern path (e.g. `/Users/you/SillyTavern`)
3. Enter your SillyBunny path — it auto-fills if the name matches
4. Click a sync button:
   - **ST → SillyBunny** or **SillyBunny → ST** for profiles, chats, settings, presets
   - **Ext ST → SB** or **Ext SB → ST** for third-party extension code
5. Watch the log for progress

### Using the standalone app

1. Run `npm start`
2. Open `http://localhost:3000` in your browser
3. Enter both paths
4. Click a sync button
5. Watch the log for progress

---

## What gets synced

**Profile and chat data** (from `data/default-user/`):

characters, chats, group chats, groups, extensions, worlds, settings.json, secrets.json, themes, backgrounds, User Avatars, assets, instruct, context, QuickReplies, sysprompt, OpenAI Settings, KoboldAI Settings, NovelAI Settings, TextGen Settings, user, vectors, reasoning, movingUI

**Third-party extension code** (from `public/scripts/extensions/third-party`):

Synced separately because it lives in a different folder than profile data.

## Merge behaviour

Files are **never blindly overwritten**. If a file already exists at the destination, the one with the newer modification date is kept. Older files are skipped.

---

## Architecture

The extension is the UI layer. The standalone app is the sync engine. They work together:

- Extension talks to the app at `http://localhost:3000`
- The app does all the actual file mirroring
- The extension shows status, logs, and buttons

This split exists because a browser-side extension cannot directly copy files between two app installations. The standalone app can.

---

## Troubleshooting

**Extension shows red dot / "Sync app is not running"**

Start the app: open a terminal and run `npm start` from the ST-SB-Syncer directory. Then click the refresh button in the extension.

**Extension installed but no drawer appears**

Refresh the page. If still missing, check the browser console (F12) for errors.

**Paths not auto-filling**

Auto-fill works by swapping "SillyTavern" and "SillyBunny" in the path. If your install paths don't follow this pattern, type them manually.

**Extension sync freezes**

This was fixed in the latest version. Make sure you're on the newest release by clicking Update in the Extensions panel.

---

## Rebuild documentation

For developers continuing this project:

- `docs/INDEX.md` — Reading order and placeholder map
- `docs/HANDOFF-BRIEF.md` — What went wrong, what to do first, mistakes to avoid
- `docs/CHECKLIST.md` — Stage-by-stage execution map with gates
- `docs/FULL-SPEC.md` — Full specification with rationale, risk register, recovery steps