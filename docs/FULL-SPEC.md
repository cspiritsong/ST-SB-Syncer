# ST-SB Syncer Rebuild — Full Specification

Status: Planning only  
Mode: Read-only  
Intent: Privacy-safe fallback document for a full extension rebuild

## 1. Purpose

`ST-SB Syncer` exists to make moving between `SillyTavern` and `SillyBunny` frictionless by mirroring user data in both directions.

The intended long-term product is:

1. A normal installable extension
2. Installable from a GitHub repo URL
3. Usable in either `SillyTavern` or `SillyBunny`
4. Simple enough that users do not need to understand internal folder layouts beyond app roots

The standalone app remains the working reference and fallback until the extension proves parity.

Commentary: the standalone app is not the destination product, but it is the current source of truth for behavior.

---

## 2. Core Understanding To Lock In

The install-flow problem is not:

- "How does SillyTavern know which GitHub repo to pull from?"

That part is already handled by the host app.

The real problems are:

1. What repo structure must exist after clone for ST/SB to load the extension?
2. What exact data paths should be mirrored?
3. Can a pure UI extension do the mirror work?
4. If not, what is the least painful architecture that still preserves the intended user experience?

Commentary: this distinction matters because it keeps the rebuild focused on extension structure and capability, not on inventing a repo installer that already exists.

---

## 3. Non-Negotiable Facts

### 3.1 Repo URL selection is already solved by ST/SB

Users paste a GitHub repo URL into `Install Extension`, and the host app clones that repo.

References:
- `https://docs.sillytavern.app/extensions/`
- `<st-root>/src/endpoints/extensions.js:94-118`

Commentary: we do not need any code that asks "where is the GitHub repo?" beyond what the host already provides.

### 3.2 The repo must match the extension contract after clone

After clone, ST expects:

1. `manifest.json` at the extension root
2. `js` and `css` paths in the manifest relative to that same root
3. HTML templates under that same extension root when referenced

References:
- `<st-root>/public/scripts/extensions.js:518-521`
- `<st-root>/public/scripts/extensions.js:762-764`
- `<st-root>/public/scripts/extensions.js:794-802`

Commentary: this is why a manifest buried in a subfolder is wrong for standard install.

### 3.3 UI extensions and server plugins are separate systems

UI extensions:
- run in the browser
- extend the UI
- use browser-side APIs and ST context APIs

Server plugins:
- run in Node.js
- live under `plugins/`
- load only when `enableServerPlugins: true`

References:
- `https://docs.sillytavern.app/for-contributors/writing-extensions/`
- `https://docs.sillytavern.app/for-contributors/server-plugins/`

Commentary: these are not the same install mechanism and should not be treated as if they are.

### 3.4 Normal third-party extension install does not also install a server plugin

A standard third-party install clones into the extension directory, not into `plugins/`.

Commentary: this means a normal "paste GitHub URL, click install" flow does not automatically give Node-side filesystem power.

### 3.5 The rebuild should be proof-first and iterative

The extension prompt is directionally correct:

1. Build the smallest thing first
2. Prove install and visibility
3. Add one thing at a time
4. Stop and verify after each stage

Reference:
- `<repo-root>/extension-prompt.md`

Commentary: for this project, skipping these gates is how we get a complicated but invalid extension.

---

## 4. Product Goal

The target user outcome is:

1. User installs the extension from a GitHub URL inside either `SillyTavern` or `SillyBunny`
2. The extension appears in the Extensions settings UI
3. The extension can identify the current host and let the user point at the peer install
4. The tool mirrors the correct data categories in both directions
5. Switching between the two apps feels seamless

Commentary: the UX target is still "installable and easy," but correctness comes before convenience.

---

## 5. What Needs To Be Mirrored

There are two distinct sync domains.

### 5.1 Profile and user data

Lives under:

- `<root>/data/default-user`

This includes the profile-style content currently mirrored by the standalone app.

### 5.2 Third-party extension code

Lives separately under:

- `<root>/public/scripts/extensions/third-party`

This is the important split that explains why extension sync did not behave like profile sync.

### 5.3 Product rule

The rebuild should continue to treat these as separate sync scopes:

1. Profile and user data
2. Third-party extension code

Commentary: keeping these separate in the UI and code is simpler and more honest than pretending they are one folder tree.

---

## 6. Current State Audit

### 6.1 What is currently working

The standalone app is currently the only working product shape.

It already proves:

1. Two-way profile data mirroring
2. Two-way third-party extension folder mirroring
3. Safer merge behavior using newer-file preference

### 6.2 What is currently not valid as a normal installable extension

The current extension prototype is a research spike, not a releasable ST/SB third-party extension.

Reasons:

1. `manifest.json` is inside `extension/`, not at repo root
2. The UI entry files are also inside `extension/`, not at repo root
3. The client code is not aligned with the documented `getContext()`-first style
4. The current design assumes server-plugin behavior that a normal third-party install does not provide

### 6.3 Specific known breakages in the current prototype

Known invalid assumptions:

1. Repo subfolder as extension root
2. Silent server-plugin availability from normal install
3. Mixed client/server architecture before install proof
4. Overbuilding before basic extension loading was verified

Commentary: the current extension work was useful discovery work, but it should not be treated as the base to keep layering on.

---

## 7. Architectural Conclusion

### 7.1 First objective

The extension must first become a valid, docs-compliant third-party UI extension.

That means:

1. Repo root must act as extension root
2. The extension must install through standard GitHub URL flow
3. The drawer must appear before any real sync logic is attempted

### 7.2 Important uncertainty

It is still unproven whether a pure UI extension can safely and meaningfully perform full local filesystem mirroring across two app roots.

That question must remain open until tested.

### 7.3 Working principle

Optimize for:

1. Installability first
2. Correct docs-compliant structure second
3. Real sync capability only after install and UI are proven

Commentary: this is the safest path because it avoids building features on top of an extension that may not even load correctly.

---

## 8. Product Model

### 8.1 Long-term target

One shared extension repo installable in either `SillyTavern` or `SillyBunny`.

### 8.2 Temporary fallback

The standalone app stays alive until the extension proves:

1. Reliable install
2. Stable UI
3. Correct path handling
4. Safe sync behavior
5. Practical parity with the standalone app

Commentary: the app is the fallback and reference implementation, not dead weight.

---

## 9. Rebuild Strategy

### Stage 0: Preserve the fallback

Objective: keep the standalone app as the working reference.

Requirements:

1. Do not rely on the extension replacing the app yet
2. Use the standalone app as the truth source for sync scope and merge behavior
3. Treat the app as the safety net during extension work

Success criteria:

1. The app remains available if extension work stalls

Commentary: this stage is mostly a rule, not a code task.

### Stage 1: Build a true root-level UI extension

Objective: make the repo install correctly through ST/SB's normal extension flow.

Required root files:

1. `manifest.json`
2. `index.js`
3. `settings.html`
4. `style.css`

Design rules:

1. Use repo root as the extension root
2. Use exact folder-name-based template loading
3. Append UI to `#extensions_settings2`
4. Use the minimum visible drawer pattern first
5. Do not include real sync yet

Success gate:

1. User pastes repo URL
2. User clicks install
3. Refresh succeeds
4. Drawer appears
5. No console errors

Commentary: this is the first hard gate. If this fails, nothing beyond it matters.

### Stage 2: Add persistent settings only

Objective: prove local extension state works.

Add only:

1. Two path fields
2. Settings persistence
3. Reload behavior

Use:

1. `SillyTavern.getContext()`
2. `extensionSettings`
3. `saveSettingsDebounced()`

Success gate:

1. User enters values
2. Refresh happens
3. Values persist
4. No console errors

Commentary: this proves the extension can hold state before trying to do useful work.

### Stage 3: Add host-detection UX only

Objective: improve usability without attempting sync yet.

Behavior:

1. Try to infer the current host path
2. Suggest the peer path when obvious
3. Keep both paths editable at all times

Success gate:

1. Detection helps when possible
2. Manual override always works
3. Detection failure does not break the extension

Commentary: detection is convenience, not a trusted source of truth.

### Stage 4: Add capability probing, not full sync

Objective: learn what a pure UI extension can actually do.

This stage should answer:

1. Can the extension validate the selected paths meaningfully?
2. Can it access enough host capabilities to do real mirroring?
3. Is a pure UI implementation realistic?

Success gate:

1. The extension can produce a clear capability result
2. The architecture decision can be made from evidence rather than guessing

Commentary: this is the stage that prevents us from promising something the runtime cannot actually support.

### Stage 5: Decide final architecture

Only after Stage 4.

There are three realistic outcomes.

Option A: Pure UI extension can do enough
Current confidence: low

Option B: Extension becomes the UI layer and the app remains the sync engine
Current confidence: medium to high

Option C: Require host-level server plugin capability
Current confidence as final UX: low

Commentary: Option B is currently the most believable compromise, but it should still be treated as a conclusion to earn, not assume.

### Stage 6: Port real sync logic only after the architecture decision

Order:

1. Profile and user data sync
2. Third-party extension code sync
3. Status and log reporting
4. Safety protections

Commentary: sync is the final stage, not the first.

---

## 10. Behavioral Rules That Should Not Change

### 10.1 Sync scopes remain separate

Keep separate actions for:

1. Profile and user data
2. Third-party extension code

### 10.2 Merge behavior remains conservative

Use:

1. Copy newer files only
2. Keep newer destination files
3. No blind overwrite
4. No destructive deletion by default

### 10.3 User path model stays simple

Ask users for app roots, not deep internal folders.

Derived paths should remain:

1. `<root>/data/default-user`
2. `<root>/public/scripts/extensions/third-party`

### 10.4 User-facing behavior should stay clear

The extension should:

1. Prefer auto-detect when it can
2. Always allow manual override
3. Explain what is being synced
4. Fail clearly when paths are invalid

Commentary: these rules already align with the intent of the standalone app and should survive any architectural changes.

---

## 11. Repo Shape Recommendation For The Rebuild

The rebuild should conceptually treat the repo like this:

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

Why this layout:

1. ST/SB third-party install expects extension files at repo root
2. The standalone app can still coexist in the same repo
3. This is the smallest structural correction that matches the documented extension contract

Commentary: the repo can remain a dual-purpose repo during transition, as long as the extension-facing files live at the root.

---

## 12. Things The Rebuild Must Avoid

Do not assume:

1. A normal third-party extension can silently become a server plugin
2. ST will load `manifest.json` from a subfolder
3. A pure browser-side extension can automatically do full filesystem mirroring
4. We should jump straight to feature-complete sync before proving install
5. The current extension prototype is safe to extend without restructuring first

Commentary: these are the traps already discovered during the first attempt.

---

## 13. Test Gates

### Gate 1: Install gate

Checklist:

1. Extension installs from GitHub URL
2. Refresh works
3. Drawer appears
4. No console errors

### Gate 2: Settings gate

Checklist:

1. Path fields exist
2. Values persist
3. Refresh preserves them
4. No console errors

### Gate 3: Detection gate

Checklist:

1. Host detection behaves predictably
2. Manual edits always work
3. Failure does not break the extension

### Gate 4: Capability gate

Checklist:

1. Actual extension capabilities are clearly understood
2. Architecture can be chosen from evidence
3. No hidden assumptions remain

### Gate 5: Sync gate

Checklist:

1. Profile sync works both directions
2. Third-party extension sync works both directions
3. Behavior matches safety expectations
4. No regressions compared with the standalone app

Commentary: these gates should be treated as stop points, not suggestions.

---

## 14. Definition Of Done

The extension version is complete only if all of the following are true:

1. It installs through the normal GitHub URL flow
2. It works in both `SillyTavern` and `SillyBunny`
3. It supports both auto-detect convenience and manual path editing
4. It safely mirrors the agreed data scopes
5. Users only need to understand app root paths
6. It is at least as trustworthy as the standalone app
7. It is simpler to use than the standalone app

The standalone app should only be retired after all of that is proven.

Commentary: "extension exists" is not enough. It has to beat or match the app in trust and simplicity.

---

## 15. Risk Register

### Risk 1: Pure UI extension may not have enough filesystem power

Impact: high  
Likelihood: high

Mitigation:

1. Do not promise full sync before capability proof
2. Keep the standalone app alive as fallback

### Risk 2: Incorrect repo structure may cause immediate install failure

Impact: high  
Likelihood: high

Mitigation:

1. Rebuild root-level extension files first
2. Test install before adding features

### Risk 3: Folder-name mismatch may break template loading

Impact: medium  
Likelihood: medium

Mitigation:

1. Use the exact installed folder name
2. Keep naming consistent with the repo basename

### Risk 4: Overbuilding too early may waste time and create confusion

Impact: high  
Likelihood: high

Mitigation:

1. Follow strict stage gates
2. Stop and verify after each stage

Commentary: these are not hypothetical risks; they reflect what has already gone wrong once.

---

## 16. Recovery Sequence If Work Stops Midway

If implementation halts unexpectedly, resume in this exact order:

1. Preserve standalone app as working fallback
2. Rebuild the extension as a root-level UI-only Stage 1 extension
3. Prove install and drawer visibility
4. Add only persistent settings
5. Add only host-path UX
6. Perform capability probing
7. Decide final architecture
8. Only then attempt real sync inside the extension or through a companion architecture

Commentary: this is the safest restart sequence because each step depends on the previous one actually working.

---

## 17. Immediate Next Step When Build Mode Resumes

The next implementation step should be:

1. Rebuild the extension as a root-level, docs-compliant, Stage 1 UI extension
2. Do not implement real sync yet
3. Do not depend on server-plugin behavior yet
4. Prove install and visible drawer first

Commentary: if build mode starts, this should be the first move and nothing more.

---

## 18. Open Questions To Resolve During Rebuild

These remain intentionally open until proven:

1. Can a pure UI extension perform any meaningful local filesystem mirror operations across two app roots?
2. If not, should the final user-facing product be:
   - a pure extension UI over a companion app, or
   - a plugin-plus-extension setup with a host-side requirement?
3. Should the standalone app remain in the same repo long-term, or later move into its own location?

Commentary: the architecture choice should come from runtime evidence, not wishful thinking.

---

## 19. Reference Set

Docs:

1. `https://docs.sillytavern.app/extensions/`
2. `https://docs.sillytavern.app/for-contributors/`
3. `https://docs.sillytavern.app/for-contributors/writing-extensions/`
4. `https://docs.sillytavern.app/for-contributors/server-plugins/`
5. `https://docs.sillytavern.app/for-contributors/function-calling/`

Local references:

1. `<repo-root>/extension-prompt.md`
2. `<repo-root>/README.md`
3. `<repo-root>/extension/index.js`
4. `<repo-root>/extension/index.mjs`
5. `<repo-root>/extension/manifest.json`

SillyTavern implementation references:

1. `<st-root>/src/endpoints/extensions.js`
2. `<st-root>/public/scripts/extensions.js`
3. `<st-root>/src/plugin-loader.js`

Commentary: these references are the factual basis for the rebuild plan and should be treated as the primary sources.

---

## 20. Final Planning Summary

The current standalone app is the working product.  
The current extension attempt is useful research, but not a valid installable extension.  
The correct next move is not "finish the current extension."  
The correct next move is:

1. rebuild the extension at repo root
2. prove it installs
3. prove the drawer appears
4. then add features one gate at a time

Commentary: this is the cleanest and safest reset point.