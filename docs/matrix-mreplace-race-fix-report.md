# Message Edit Rendering Bug Investigation Report

## Scope

Investigated why rapid `m.replace` edits sometimes render stale content in Element (especially in streaming-like scenarios with many quick edits), then implemented and validated a fix.

## Repository / Branch Context

- Workspace: `/home/basnijholt/Work/mindroom-element-worktrees/element-edit-bug`
- App: Element Web fork (`mindroom-element`)
- Relevant dependency: `matrix-js-sdk` (`40.1.0`, lock resolved to commit `f136f6ddf7668b8a4c40dbfd4658f22afa1b668c`)

## What I Investigated

### 1. Edit ingestion and aggregation in matrix-js-sdk

Inspected:

- `node_modules/matrix-js-sdk/src/models/relations.ts`
- `node_modules/matrix-js-sdk/src/models/relations-container.ts`
- `node_modules/matrix-js-sdk/src/models/event.ts`
- `node_modules/matrix-js-sdk/src/models/thread.ts`

Key findings:

- Edit application ultimately goes through `Relations` (`relationType === m.replace`) and then `targetEvent.makeReplaced(...)`.
- `addEvent`, `removeEvent`, `onBeforeRedaction`, and `setTargetEvent` each do async work (`await getLastReplacement()`) before applying replacement.
- These async replacement updates were unsynchronized.

### 2. React render path in Element

Inspected:

- `src/components/structures/TimelinePanel.tsx`
- `src/components/structures/MessagePanel.tsx`
- `src/components/views/rooms/EventTile.tsx`
- `src/components/views/messages/MessageEvent.tsx`
- `src/components/views/messages/TextualBody.tsx`

Key findings:

- `TimelinePanel` listens to `MatrixEventEvent.Replaced` and calls `forceUpdate()`, so UI updates are driven by SDK replacement state.
- `MessagePanel` passes `replacingEventId={mxEv.replacingEventId()}` down to tiles.
- If the SDK ends up with a stale replacing event, React faithfully renders stale content.

### 3. Custom MindRoom code paths

Inspected:

- `src/components/views/messages/TextualBody.tsx`
- `src/utils/mindroomLongText.ts`
- `src/renderer/collapsible.tsx`

Finding:

- No primary stale-edit source found there; these paths are downstream consumers of replacement state.

## Root Cause

### Race condition in `Relations` replacement updates

In `matrix-js-sdk/src/models/relations.ts`, replacement updates were computed/applied in async flows without a freshness guard:

- `await getLastReplacement()` may block (notably on decryption)
- while blocked, newer edits may arrive and be correctly applied
- then the older async task resumes and overwrites `targetEvent` with an older edit

This produces exactly the symptom: message content can regress to an intermediate/older edit and stay there until another recomputation (refresh/reload/other timeline operations).

### Why rapid streaming-like edits make this worse

Rapid edit cadence increases overlap between concurrent async replacement computations. In encrypted rooms, variable decryption timing amplifies this race.

## Reproduction Evidence (local)

I created a focused temporary regression test (removed after validation) that:

1. adds an older edit whose decryption promise is artificially delayed,
2. adds a newer edit that applies immediately,
3. resolves the older decryption late.

Before fix:

- assertion failed (`Received "$edit1"`, expected `"$edit2"`) showing stale overwrite.

After fix:

- test passed; latest edit remained selected.

## Implemented Fix

Persistent patch added:

- `patches/matrix-js-sdk+40.1.0.patch`

Patched file:

- `node_modules/matrix-js-sdk/src/models/relations.ts`

### Change summary

1. Added monotonic update token:

- `private replacementUpdateId = 0;`

2. Introduced guarded helper:

- `updateTargetEventReplacement()`
- captures current `updateId`, awaits `getLastReplacement()`, and applies only if still latest
- prevents older async completions from overriding newer replacements
- avoids emitting needless `Event.replaced` when there is no replacement and none currently applied

3. Switched all replacement-update call sites to helper:

- `addEvent`
- `removeEvent`
- `onBeforeRedaction`
- `setTargetEvent`

## Why this fix is correct

`m.replace` must satisfy "latest wins" semantics from the consumer perspective. Previously, async completion order could violate this. The update token enforces ordering by _logical update recency_, not promise resolution timing.

## Upstream context checked

- Element issue: https://github.com/element-hq/element-web/issues/30617 (opened Aug 25, 2025; closed Aug 28, 2025)
- matrix-js-sdk PR: https://github.com/matrix-org/matrix-js-sdk/pull/4980 (merged Aug 28, 2025)

Note: PR #4980 addresses a thread-initialization edit aggregation race. The race fixed here is different: out-of-order async replacement application after awaiting replacement resolution/decryption.

## Validation performed

1. Regression reproduction test:

- Fails pre-fix (older edit incorrectly wins)
- Passes post-fix

2. Patch install validation:

- `yarn patch-package --patch-dir patches` applies successfully including `matrix-js-sdk@40.1.0`

## Deliverables

- Fix patch: `patches/matrix-js-sdk+40.1.0.patch`
- This report: `.claude/REPORT.md`

## Recommended next step

Upstream this exact `Relations` async ordering fix to `matrix-org/matrix-js-sdk` with a permanent unit test in SDK `spec/unit/relations.spec.ts` so the regression is covered in CI.
