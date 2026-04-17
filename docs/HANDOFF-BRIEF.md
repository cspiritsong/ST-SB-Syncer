# ST-SB Syncer Rebuild — LLM Handoff Brief

Status: Planning artifact  
Mode: Read-only reference  
Audience: Any LLM or engineer taking over the rebuild

Commentary: this document exists so a handoff does not lose the logic behind the rebuild plan. It is intentionally more explicit than the compact checklist and more operational than the full spec.

---

## 1. What This Document Is For

This brief tells the next LLM exactly how to approach the `ST-SB Syncer` rebuild without repeating earlier mistakes.

Its job is to prevent three failure modes:

1. treating the current extension prototype as valid when it is not
2. overbuilding before installability is proven
3. assuming extension capabilities that have not been verified

Commentary: this is the "don't panic, don't improvise, don't skip gates" document.

---

## 2. Privacy-Safe Placeholder Map

Use these placeholders instead of personal machine paths:

1. `<repo-root>` = the `ST-SB-Syncer` repository
2. `<st-root>` = the `SillyTavern` install root
3. `<sb-root>` = the `SillyBunny` install root
4. `<host-root>` = whichever app currently has the extension installed
5. `<peer-root>` = the other app root the user wants to mirror with
6. `<root>` = a generic app install root

Important derived paths:

1. `<root>/data/default-user`
2. `<root>/public/scripts/extensions/third-party`

Commentary: do not reintroduce personal absolute paths into planning or user-facing docs.

---

## 3. Current Project Reality

There are effectively two product shapes in this repo:

1. the standalone app
2. the extension prototype

They are not equally valid.

### 3.1 Standalone app status

The standalone app is currently the only trusted implementation.

It already proves:

1. two-way profile/user-data mirroring
2. two-way third-party-extension-folder mirroring
3. conservative merge behavior using newer-file preference

### 3.2 Extension prototype status

The current extension prototype is a research spike, not a valid installable third-party extension.

Main reasons:

1. the extension-facing files live under `extension/` instead of repo root
2. the current design assumed server-plugin-style capability that normal install does not provide
3. installability was not proven before adding deeper features
4. extension structure drifted away from the documented contract

Commentary: the next LLM must not start by "finishing" the current extension prototype. It must start by restructuring the extension correctly.

---

## 4. Facts That Must Be Treated As True

These are not preferences. They are the baseline facts established from docs and source inspection.

### 4.1 ST already handles GitHub repo selection

The host app already asks the user for the GitHub URL and clones that repo.

Implication:

1. do not build logic for "which repo should ST install"
2. assume user pastes repo URL and host clones it

### 4.2 ST expects the extension at the cloned repo root

After install, ST expects:

1. `manifest.json` at the extension root
2. `js` and `css` references relative to that root
3. template files under that root

Implication:

1. a repo with extension files hidden in a subfolder is not correct for normal install

### 4.3 UI extensions and server plugins are separate systems

UI extensions:

1. are browser-side
2. use DOM, fetch, ST context APIs

Server plugins:

1. are Node-side
2. live in `plugins/`
3. require `enableServerPlugins: true`

Implication:

1. a normal third-party install does not magically produce a server plugin

### 4.4 Third-party extension install is not the same as plugin installation

Implication:

1. do not assume a standard install-by-URL flow can place code into `plugins/`
2. do not assume Node filesystem access unless proven through a supported path

Commentary: this is the architectural boundary that caused the original confusion.

---

## 5. The Core User Goal

The user wants seamless movement between `SillyTavern` and `SillyBunny`.

That means:

1. profiles
2. chats
3. presets
4. connections
5. related user-state data
6. third-party extension code

should be mirrored as safely and frictionlessly as possible.

Important nuance:

1. profile-style data and third-party extension code live in different folder trees
2. this split is part of the original bug/problem

Commentary: the product is fundamentally a mirroring tool, not a behavior-changing extension.

---

## 6. What Must Not Break

The rebuild must preserve these principles:

1. the standalone app remains usable until extension parity is proven
2. sync behavior should remain conservative
3. no blind overwrite of newer destination files
4. profile data and third-party extension code remain separate scopes
5. users should only need to point to app roots, not deep internal folders
6. manual path control must remain available even if auto-detection exists

Commentary: these are project invariants, not negotiable implementation details.

---

## 7. What The Next LLM Must Read Before Editing Anything

Before build mode starts, the next LLM should understand these sources.

### 7.1 Repo documents

1. `<repo-root>/extension-prompt.md`
2. `<repo-root>/README.md`

### 7.2 Current extension prototype

1. `<repo-root>/extension/index.js`
2. `<repo-root>/extension/index.mjs`
3. `<repo-root>/extension/manifest.json`

Purpose:

1. understand what was attempted
2. identify assumptions to discard
3. do not treat it as final structure

### 7.3 ST implementation references

1. `<st-root>/src/endpoints/extensions.js`
2. `<st-root>/public/scripts/extensions.js`
3. `<st-root>/src/plugin-loader.js`

Purpose:

1. confirm install behavior
2. confirm extension root expectations
3. confirm separation from server plugins

### 7.4 ST docs

1. `https://docs.sillytavern.app/extensions/`
2. `https://docs.sillytavern.app/for-contributors/`
3. `https://docs.sillytavern.app/for-contributors/writing-extensions/`
4. `https://docs.sillytavern.app/for-contributors/server-plugins/`
5. `https://docs.sillytavern.app/for-contributors/function-calling/`

Commentary: the next LLM does not need to rediscover everything from scratch, but it must internalize these boundaries before changing code.

---

## 8. The Correct Starting Assumption

The right starting assumption is:

> The current extension attempt is not the base to iterate on.
> The repo must first become a valid root-level third-party UI extension.

That means the first success condition is not "sync works."

The first success condition is:

1. install from GitHub URL works
2. refresh works
3. drawer appears
4. no console errors

Commentary: if the next LLM starts by implementing sync again, it is already off course.

---

## 9. Required Stage Order

The rebuild must happen in this order:

1. Preserve fallback
2. Rebuild root-level UI extension
3. Add persistent settings
4. Add host-path convenience UX
5. Probe real capability
6. Choose final architecture
7. Port real sync logic

No stage should be skipped.

No later stage should begin if the previous stage has not been proven.

Commentary: this is the most important operational rule in the document.

---

## 10. Stage-by-Stage Handoff Instructions

### Stage 0: Preserve Fallback

Goal:

1. Keep the standalone app as the reference implementation and safety net

What to do:

1. treat the app as the behavior baseline
2. do not remove or deprecate it yet
3. do not let extension work destroy the only trusted path

What not to do:

1. do not assume the app can be retired soon
2. do not mix "app cleanup" with extension rebuild work

Exit condition:

1. standalone app remains available as fallback during all extension work

Commentary: this is a risk-control stage, not a feature stage.

### Stage 1: Rebuild As A Real Root-Level UI Extension

Goal:

1. Make the repo install correctly as a normal third-party extension

What to build at repo root:

1. `manifest.json`
2. `index.js`
3. `settings.html`
4. `style.css`

What the UI should contain:

1. extension title
2. short success message
3. maybe one line confirming it loaded

What not to include yet:

1. no real sync buttons
2. no filesystem logic
3. no server-plugin logic
4. no complex path handling
5. no claims of actual sync capability

Implementation intent:

1. use the documented extension loading pattern
2. use the documented template rendering approach
3. append to `#extensions_settings2`
4. use the actual installed folder name consistently

Exit condition:

1. install by GitHub URL works
2. refresh works
3. drawer appears
4. no console errors

Required post-stage notes:

1. exact installed folder name
2. exact template path pattern used
3. whether the drawer rendered in the expected UI location
4. any warnings or oddities seen during install

Commentary: this stage is just "prove the extension exists in reality."

### Stage 2: Add Persistent Settings

Goal:

1. Prove the extension can store user settings reliably

What to add:

1. ST root path field
2. SillyBunny root path field
3. default settings initialization
4. save behavior
5. reload behavior after refresh

Preferred implementation style:

1. prefer `SillyTavern.getContext()`
2. use `extensionSettings`
3. use `saveSettingsDebounced()`

What not to add yet:

1. auto-detect logic
2. real path validation
3. real sync actions
4. capability-claiming UI

Exit condition:

1. user enters values
2. refresh happens
3. values persist
4. no console errors

Required post-stage notes:

1. settings storage key used
2. whether persistence behaves the same in ST and SillyBunny
3. whether refresh changes layout or stored values unexpectedly

Commentary: this stage proves the extension can hold state before trying to do work.

### Stage 3: Add Host-Path Convenience UX

Goal:

1. Make the extension easier to use without promising real sync yet

What to add:

1. host-path auto-detect attempt if possible
2. peer-path guess if obvious
3. manual override for both fields at all times

Behavior rules:

1. detection is convenience only
2. manual edits always win
3. failed detection must not break the UI
4. guessed values must remain editable

What not to add yet:

1. real sync execution
2. silent overwriting of user-entered paths
3. strong claims that detection is always correct

Exit condition:

1. detection helps when possible
2. manual override still works
3. failure leaves the drawer usable
4. no console errors

Required post-stage notes:

1. what signal was used for detection
2. how peer path guessing works
3. known failure cases
4. whether ST and SillyBunny behave differently

Commentary: detection is sugar, not truth.

### Stage 4: Capability Probe

Goal:

1. Determine what a pure UI extension can actually do

Questions to answer:

1. can the extension validate selected app roots meaningfully?
2. can it access enough functionality to perform actual mirroring?
3. is it limited to being a control surface only?
4. is there any docs-compliant route to real sync from a normal installed extension?

Deliverable of this stage:

1. proven possible actions
2. blocked actions
3. unknowns that remain
4. recommended architecture based on evidence

What not to do:

1. do not jump from a partial capability to a full sync promise
2. do not infer filesystem powers from UI success
3. do not choose architecture before this report exists

Exit condition:

1. architecture can be selected from evidence instead of hope

Commentary: this is the truth-finding stage.

### Stage 5: Architecture Decision

Goal:

1. Choose the final product shape based on Stage 4 evidence

Allowed outcomes:

1. pure UI extension can do enough
2. extension acts as installable UI and standalone app remains the sync engine
3. extension requires server-plugin capability and an explicit host-level requirement

Decision criteria:

1. prefer the simplest architecture that is actually proven
2. prefer user trust over elegance
3. avoid hidden host requirements unless unavoidable
4. do not pretend a UI extension can do Node-side work if it cannot

Required decision record:

1. chosen architecture
2. rejected alternatives
3. reasons for rejection
4. user setup flow implied by the choice

Commentary: this is the most important design checkpoint in the rebuild.

### Stage 6: Port Real Sync Logic

Goal:

1. Implement actual sync only after the architecture is decided

Port order:

1. profile/user data sync
2. third-party extension-code sync
3. log/status reporting
4. safety and error handling

Behavioral rules to preserve:

1. profile and extension sync remain separate scopes
2. merge behavior stays conservative
3. newer destination files are not blindly overwritten
4. destructive deletion is not the default

Exit condition:

1. profile sync works both directions
2. extension-code sync works both directions
3. behavior matches or exceeds standalone app trust
4. no regressions against the app

Required post-stage notes:

1. implemented sync scopes
2. trigger flow in UI
3. failure modes and how they are surfaced
4. known limitations that remain

Commentary: this is intentionally the last stage.

---

## 11. Exact Mistakes The Next LLM Must Avoid

1. Do not keep building on the `extension/` subfolder structure as if it were install-correct.
2. Do not assume a standard third-party extension install also creates a server plugin.
3. Do not start with sync logic.
4. Do not build a large UI before proving the drawer loads.
5. Do not merge profile sync and extension-code sync into one vague feature.
6. Do not remove the standalone app as fallback.
7. Do not expose personal absolute paths in docs or explanations.
8. Do not call the extension "working" just because files exist in the repo.
9. Do not choose architecture before the capability probe.
10. Do not skip stage gates because the implementation "probably works."

Commentary: these are the concrete anti-patterns already surfaced in this project.

---

## 12. What Counts As Success At Each Gate

### Gate 1: Install gate

Success means:

1. install from GitHub URL works
2. refresh works
3. drawer appears
4. no console errors

### Gate 2: Settings gate

Success means:

1. path fields exist
2. values persist
3. refresh preserves them
4. no console errors

### Gate 3: Detection gate

Success means:

1. detection behaves predictably
2. manual edits always work
3. failure does not break UI

### Gate 4: Capability gate

Success means:

1. extension powers are clearly understood
2. architecture decision is evidence-based
3. no major unknown is being ignored

### Gate 5: Sync gate

Success means:

1. profile sync works both directions
2. extension-code sync works both directions
3. merge behavior is safe
4. no regressions compared with the standalone app

Commentary: if a gate is not clearly passed, treat it as failed and stop.

---

## 13. Recommended Repo Mental Model During Rebuild

Another LLM should think of the repo like this:

1. it temporarily contains both a standalone app and an extension effort
2. the extension-facing root must match ST's install expectations
3. the old `extension/` directory is reference material, not final shape
4. the app remains the trusted behavioral benchmark

Commentary: the repo can be transitional, but the extension-facing surface must still be correct.

---

## 14. Recovery Rule If The Rebuild Goes Sideways

If anything becomes confusing, broken, or uncertain, reset to this order:

1. confirm standalone app remains the fallback
2. confirm extension root structure is correct
3. re-prove install and drawer visibility
4. re-prove settings persistence
5. re-prove detection UX
6. re-run capability reasoning
7. only then continue

Commentary: this is the safe rollback path for planning and implementation.

---

## 15. What Another LLM Should Say Before Starting Build Work

Before touching code, the next LLM should effectively confirm:

1. it understands the standalone app is the current truth source
2. it understands the current extension prototype is not install-correct
3. it will rebuild the extension at repo root
4. it will stop after Stage 1 and verify install before adding more
5. it will not assume server-plugin powers
6. it will use privacy-safe placeholders in planning

Commentary: this confirmation is useful because it forces the next model to align with the plan before acting.

---

## 16. Final Handoff Summary

If another LLM inherits this project, the safest interpretation is:

1. The app works.
2. The extension idea is valid.
3. The current extension implementation is not yet valid.
4. The next real move is a root-level Stage 1 rebuild.
5. The first proof is install plus visible drawer.
6. Real sync is a later stage, not the starting point.

Commentary: if the next LLM remembers only one thing, it should remember this section.