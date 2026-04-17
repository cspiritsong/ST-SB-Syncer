# ST-SB Syncer Rebuild Documentation Pack

Status: Planning artifacts  
Mode: These documents are read-only planning references, not implementation instructions.

## Reading Order

If you are a new LLM or engineer picking up this project, read in this order:

1. **Handoff Brief** (`HANDOFF-BRIEF.md`) — Start here. This tells you what the project is, what went wrong, and what to do first.
2. **Compact Execution Checklist** (`CHECKLIST.md`) — Read second. This is the stage-by-stage execution map.
3. **Full Spec** (`FULL-SPEC.md`) — Read last. Use this when you need detailed reasoning, constraints, risk analysis, or conflict resolution.

## Files

| File | Purpose | When to read |
|------|---------|-------------|
| `HANDOFF-BRIEF.md` | LLM handoff instructions, mistakes to avoid, stage-by-stage directions | First. Always. |
| `CHECKLIST.md` | Compact execution checklist with gates and exit conditions | Second. During build. |
| `FULL-SPEC.md` | Full specification with rationale, risk register, recovery steps | Third. When you need depth. |

## Placeholder Legend

All three documents use privacy-safe placeholders instead of personal machine paths:

| Placeholder | Meaning |
|---|---|
| `<repo-root>` | The `ST-SB-Syncer` repository |
| `<st-root>` | The `SillyTavern` install root |
| `<sb-root>` | The `SillyBunny` install root |
| `<host-root>` | Whichever app currently has the extension installed |
| `<peer-root>` | The other app root the user wants to mirror with |
| `<root>` | Any generic app install root |

Important derived paths:

- `<root>/data/default-user`
- `<root>/public/scripts/extensions/third-party`

## Critical Reminder

The current `extension/` directory contains a research spike, not a valid installable extension.  
The next build move is a **root-level Stage 1 rebuild**, not extending the current prototype.

Do not start with sync logic.  
Do not assume server-plugin powers.  
Start with: install, refresh, drawer appears, no console errors.