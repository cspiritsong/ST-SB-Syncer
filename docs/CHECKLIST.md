# ST-SB Syncer Rebuild — Compact Execution Checklist

Status: Planning artifact  
Mode: Read-only reference  
Intent: Stage-by-stage execution map for the rebuild

---

## 1. Mission

Build `ST-SB Syncer` into a normal installable `SillyTavern` / `SillyBunny` extension without losing the working standalone app.

The end goal is:

1. User pastes GitHub repo URL into `Install Extension`
2. User clicks install
3. Extension appears and works
4. Eventually, the extension can help mirror data between ST and SillyBunny with minimal friction

Commentary: the important thing is that the extension must fit the host app's existing install contract, not invent a new install flow.

---

## 2. Placeholder Map

Use privacy-safe placeholders in all future planning and documentation:

1. `<repo-root>` = the `ST-SB-Syncer` repository
2. `<st-root>` = the `SillyTavern` install root
3. `<sb-root>` = the `SillyBunny` install root
4. `<host-root>` = whichever app currently has the extension installed
5. `<peer-root>` = the other app path the user wants to mirror to or from
6. `<root>` = any generic app install root

Derived important folders:

1. `<root>/data/default-user`
2. `<root>/public/scripts/extensions/third-party`

Commentary: do not use machine-specific personal absolute paths in user-facing planning unless the user explicitly asks.

---

## 3. Hard Rules Before Any Build Work

1. Do not assume the host needs help choosing a GitHub repo.
2. Do not assume a subfolder like `extension/` can serve as the extension root for standard install.
3. Do not assume a UI extension automatically gets server-plugin powers.
4. Do not assume full filesystem mirroring is possible from a pure browser-side extension.
5. Do not jump into sync logic before proving the extension installs and renders correctly.
6. Keep the standalone app intact as fallback until extension parity is proven.
7. Treat the full spec as the master document and this checklist as the execution map.

Commentary: these rules exist because the first extension attempt already violated several of them.

---

## 4. What Is Already Known

1. `SillyTavern` already handles "paste GitHub repo URL, then clone it."
2. After clone, ST expects `manifest.json` at the installed extension root.
3. `js`, `css`, and template paths must resolve relative to that root.
4. UI extensions and server plugins are separate systems.
5. Normal third-party extension install does not also install a server plugin into `plugins/`.
6. The standalone app already proves the desired mirror behavior better than the extension prototype does.

Commentary: this means the extension rebuild must start from extension-structure correctness, not from feature ambition.

---

## 5. Product Scope To Preserve

The product concept has two separate sync domains:

1. Profile and user data under `<root>/data/default-user`
2. Third-party extension code under `<root>/public/scripts/extensions/third-party`

These should remain separate in both implementation and UI.

Commentary: this separation is not just cosmetic. It is part of the root cause of the earlier extension sync confusion.

---

## 6. Current Truth Source

Until the extension proves itself, the standalone app is the reference implementation.

What it already proves:

1. Two-way profile data mirroring
2. Two-way third-party extension folder mirroring
3. Safer merge behavior using "copy newer files only"

What it does not prove:

1. That a stock ST/SB third-party extension can perform the same filesystem work
2. That a UI-only extension can replace the app

Commentary: another LLM should treat the app as the behavior reference, not as legacy baggage.

---

## 7. Stage Order

Implementation should proceed only in this order:

1. Preserve fallback
2. Rebuild root-level installable UI extension
3. Add persistent settings
4. Add host-path convenience UX
5. Probe real extension capability
6. Decide architecture
7. Only then port real sync logic

Commentary: if any stage fails, do not skip ahead. Stop and resolve the failure before continuing.

---

## 8. Stage 0: Preserve The Fallback

Objective: keep the standalone app available and mentally separate from the extension rebuild.

What this stage means:

1. Do not delete or assume retirement of the standalone app
2. Do not treat extension work as authorized to break the app
3. Use the app's current behavior as the expected sync reference

Success condition:

1. The project still has one working fallback even if extension work stalls

Commentary: this stage mostly governs decision-making and risk management.

---

## 9. Stage 1: Rebuild As A Real Root-Level UI Extension

Objective: make the repo install correctly as a third-party extension through the normal GitHub URL flow.

Required extension-facing root files:

1. `manifest.json`
2. `index.js`
3. `settings.html`
4. `style.css`

What this stage should do:

1. Move the extension concept to repo root
2. Make the repo itself the extension root
3. Implement only the minimum visible drawer
4. Use the documented ST extension patterns
5. Load templates from the correct folder-name-based path
6. Append UI to `#extensions_settings2`

What this stage should not do:

1. No real sync logic
2. No filesystem mirroring
3. No server-plugin assumptions
4. No complicated detection logic
5. No feature bundling

Success gate:

1. User pastes repo URL
2. User clicks install
3. Refresh works
4. Drawer appears
5. No console errors

Required record after success:

1. Confirm exact installed folder name
2. Confirm template path used
3. Confirm whether the drawer appears in the expected right-side extension panel
4. Record any console warnings even if the drawer appears

Commentary: this is the first hard gate. If Stage 1 fails, the extension is not real yet.

---

## 10. Stage 2: Add Persistent Settings Only

Objective: prove that the extension can hold user settings safely and reliably.

Add only:

1. A field for the ST root path
2. A field for the SillyBunny root path
3. Default settings initialization
4. Save behavior
5. Reload behavior after refresh

Preferred implementation direction:

1. Use `SillyTavern.getContext()`
2. Use `extensionSettings`
3. Use `saveSettingsDebounced()`

What not to add yet:

1. Path validation logic beyond basic field handling
2. Auto-detect logic
3. Sync buttons that claim real functionality
4. Capability probing

Success gate:

1. User enters values
2. Page refreshes
3. Values persist
4. No console errors
5. No broken UI state

Required record after success:

1. Which storage key is used for settings
2. Whether settings persist in both ST and SillyBunny
3. Whether refresh changes the drawer state or field contents unexpectedly

Commentary: persistence is the first proof that the extension can hold useful state without becoming fragile.

---

## 11. Stage 3: Add Host Detection UX Only

Objective: improve usability without pretending real sync is already solved.

Add only:

1. Auto-detect attempt for current host path if possible
2. Simple peer-path guess when obvious
3. Manual override for both fields at all times

Rules:

1. Detection must be optional convenience
2. Manual edits must always win
3. Failure to auto-detect must not break the extension
4. The UI should clearly allow correction of guesses

What not to add yet:

1. Real sync operations
2. Strong claims that detection is guaranteed
3. Hidden logic that silently overwrites user-entered values

Success gate:

1. Detection helps when possible
2. Manual override still works
3. Detection failure leaves the UI usable
4. No console errors

Required record after success:

1. What signal was used for host detection
2. How peer path guessing works
3. Known failure cases for detection
4. Whether behavior differs between ST and SillyBunny

Commentary: detection should be treated as convenience sugar, not core architecture.

---

## 12. Stage 4: Capability Probe

Objective: determine what a pure UI extension can actually do before promising full sync.

Questions this stage must answer:

1. Can the extension validate the chosen paths meaningfully?
2. Can it access enough host-side functionality to perform real filesystem mirroring?
3. Can it only act as a UI layer?
4. Is there any docs-compliant path to real sync from a standard installed extension?

What this stage should produce:

1. A clear capability summary
2. A list of what is proven possible
3. A list of what is blocked
4. A recommendation for final architecture based on evidence

Possible outcomes:

1. Pure UI extension can do enough
2. Extension can only be a front-end control layer
3. Real sync needs a server-side or external companion layer

Success gate:

1. Architecture can be chosen from evidence
2. No major technical assumption remains hidden

Required record after success:

1. Final conclusion on pure UI feasibility
2. Supporting reasoning
3. Any host-specific differences between ST and SillyBunny

Commentary: this is the stage that prevents wishful implementation.

---

## 13. Stage 5: Architecture Decision

Make this decision only after Stage 4.

Possible final architectures:

1. Pure UI extension
2. Installable extension UI plus standalone app as sync engine
3. Extension plus required server-plugin capability

Current planning bias:

1. Pure UI extension as complete replacement: low confidence
2. Extension UI over standalone app engine: medium to high confidence
3. Server-plugin requirement as final user model: low confidence

Decision rule:

1. Choose the simplest architecture that is actually proven workable
2. Do not choose based on elegance alone
3. User experience matters, but unsupported assumptions matter more

Required record after success:

1. Which architecture was chosen
2. Why the other options were rejected
3. What user setup flow this implies

Commentary: this is the most important decision point in the whole rebuild.

---

## 14. Stage 6: Port Real Sync Logic

Only begin this stage after the architecture decision is complete.

Port in this order:

1. Profile and user data sync
2. Third-party extension code sync
3. User-facing status and logging
4. Safety protections and merge summaries

Rules to preserve:

1. Keep profile data sync and extension code sync as separate scopes
2. Keep merge behavior conservative
3. Prefer copying newer files only
4. Do not blindly overwrite newer destination files
5. Do not default to destructive deletion

Success gate:

1. Profile sync works both directions
2. Extension-code sync works both directions
3. Behavior matches the standalone app's trusted behavior
4. No unwanted overwrites
5. No regressions in either host

Required record after success:

1. Which sync scopes were implemented
2. How each scope is triggered in the UI
3. What errors or partial-failure conditions are handled
4. Any remaining limitations

Commentary: sync is the last stage because it depends on all prior proof points.

---

## 15. Repo Shape To Aim For During Rebuild

The rebuild should conceptually result in this extension-facing layout:

```
ST-SB-Syncer/
  manifest.json
  index.js
  settings.html
  style.css
  README.md
  server.js
  package.json
  package-lock.json
  public/
```

Interpretation:

1. The repo root serves as the extension root for install-by-URL
2. The standalone app can still coexist in the same repo during transition
3. The extension-facing files must be at repo root, not hidden in `extension/`

Commentary: this is the minimal structural correction that aligns with how ST actually loads extensions.

---

## 16. Things Another LLM Must Not Do

1. Do not extend the current `extension/` subfolder model as if it were valid for install-by-URL
2. Do not assume a normal extension install creates `plugins/` entries
3. Do not build a giant sync UI before proving the drawer loads
4. Do not remove the standalone app before extension parity is proven
5. Do not merge profile sync and extension-code sync into one vague feature
6. Do not use machine-specific personal paths in user-facing planning
7. Do not claim the extension is working merely because files exist in the repo

Commentary: if another LLM ignores this section, it will likely recreate the same failure pattern.

---

## 17. Test Gates Summary

Gate 1: Install gate

1. Install from GitHub URL works
2. Refresh works
3. Drawer appears
4. No console errors

Gate 2: Settings gate

1. Path fields exist
2. Values persist
3. Refresh preserves them
4. No console errors

Gate 3: Detection gate

1. Host detection behaves predictably
2. Manual edits always work
3. Failure does not break extension

Gate 4: Capability gate

1. Real extension capability is clearly understood
2. Architecture decision is evidence-based
3. No hidden assumptions remain

Gate 5: Sync gate

1. Profile sync works both directions
2. Third-party extension sync works both directions
3. Merge behavior is safe
4. No regressions against the standalone app

Commentary: these are stop points, not optional milestones.

---

## 18. Definition Of Done

The extension can only be considered done when all of these are true:

1. It installs through the standard GitHub URL flow
2. It works in both `SillyTavern` and `SillyBunny`
3. It supports both auto-detect convenience and manual path editing
4. It safely mirrors the intended scopes
5. Users only need to understand app root paths
6. It is at least as trustworthy as the standalone app
7. It is easier to use than the standalone app

Only after that should the standalone app be considered for retirement.

Commentary: "exists as an extension" is not the same as "finished product."

---

## 19. Handoff Notes For Another LLM

If another LLM takes over, it should assume:

1. The standalone app is currently the only trusted working implementation
2. The extension prototype in `extension/` is research, not final architecture
3. The next valid implementation move is Stage 1 root-level extension rebuild
4. The first goal is install plus visible drawer, nothing more
5. Architecture must be chosen after capability probing, not before
6. The user values commentary and explanation, not just terse steps
7. Privacy-safe placeholders should be used instead of personal machine paths

Commentary: this section exists so context survives a model handoff cleanly.

---

## 20. Immediate Next Step When Build Mode Starts

When build mode is explicitly authorized, the first move should be:

1. Rebuild the extension as a root-level, docs-compliant Stage 1 UI extension
2. Do not implement real sync yet
3. Do not depend on server-plugin behavior yet
4. Prove install and visible drawer first

Commentary: if build mode starts and the implementation goes beyond this immediately, it is probably skipping the safest path.