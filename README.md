# ST-SB Syncer

A local web app that syncs data between SillyTavern and SillyBunny.

## Requirements

- Node.js (v16 or later)

## Setup

```bash
cd ~/ST-SB-Syncer
npm install
```

## Running

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

## Usage

1. Set the paths to your SillyTavern and SillyBunny installations (defaults: `~/SillyTavern` and `~/SillyBunny`)
2. Click **Browse…** to pick a folder with a native dialog, or type the path directly
3. Click either sync button:
   - **Copy ST → SillyBunny** — SillyTavern is the source
   - **Copy SillyBunny → ST** — SillyBunny is the source
4. Watch the log window for real-time progress and a final summary

## What gets synced

Files and folders copied from `data/default-user/` in the source to `data/default-user/` in the destination:

`characters`, `chats`, `group chats`, `groups`, `extensions`, `worlds`, `settings.json`, `secrets.json`, `themes`, `backgrounds`, `User Avatars`, `assets`, `instruct`, `context`, `QuickReplies`, `sysprompt`, `OpenAI Settings`, `KoboldAI Settings`, `NovelAI Settings`, `TextGen Settings`, `user`, `vectors`

## Merge behaviour

Files are **never blindly overwritten** — if a file already exists at the destination, the one with the newer modification date is kept. Older files are skipped.
