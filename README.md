# ST-SB Syncer

A tool that syncs data between SillyTavern and SillyBunny. Available as a standalone app and as a work-in-progress SillyTavern/SillyBunny extension.

## Extension (Work In Progress — Stage 1)

The extension is currently at Stage 1: a minimal drawer that proves installability.

### Current status

- Stage 1: Drawer appears after install — **in progress**
- Stage 2: Persistent settings — **not started**
- Stage 3: Host path detection — **not started**
- Stage 4: Capability probe — **not started**
- Stage 5: Architecture decision — **not started**
- Stage 6: Real sync logic — **not started**

See `docs/HANDOFF-BRIEF.md` for the full rebuild plan and stage gates.

### Install (when ready for testing)

1. In SillyTavern or SillyBunny, open the Extensions panel
2. Click **Install Extension**
3. Paste the repo URL:
   ```
   https://github.com/cspiritsong/ST-SB-Syncer
   ```
4. Refresh the page
5. Look for **ST ↔ SB Syncer** in the right-side Extensions panel

### Rebuild documentation

- `docs/INDEX.md` — Start here. Reading order and placeholder map.
- `docs/HANDOFF-BRIEF.md` — What went wrong, what to do first, mistakes to avoid.
- `docs/CHECKLIST.md` — Stage-by-stage execution map with gates.
- `docs/FULL-SPEC.md` — Full specification with rationale, risk register, recovery steps.

### Previous extension attempt

The `extension/` directory contains a previous prototype that is **not install-correct** for standard third-party extension flow. It is kept as reference material only. Do not treat it as the base to extend.

## Standalone App (Currently the working product)

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