# MindRoom Element Fork — Changes Since 2039a2a5bb39558a9f54f8b2037d0f4b872efdb8

This document tracks MindRoom-specific changes on top of upstream Element,
using clean, feature-scoped commits.

Rules followed:

- No guessing: behavior claims come from code and tests in this repository.
- Keep changes grouped by feature so rebases onto upstream stay manageable.

## How To Regenerate

- Commit list: `git log --reverse --format="%H %ad %s" --date=short 2039a2a5bb..HEAD`
- Net diff vs base: `git diff --stat 2039a2a5bb..HEAD`
- Per-commit details: `git show <sha>`

## Working Tree

Working tree status (2026-02-23):

- Untracked local helper: `serve.py`

## Commit-by-Commit Changes

### build(dev): add Nix development shell

Files changed:

- `shell.nix`

What changed:

- Added a reproducible Nix development shell for local work.

### feat(mindroom-ui): add branding, auth theming, and thread-first layout defaults

Files changed:

- `config.mindroom.json`
- `res/welcome-mindroom.html`
- `res/themes/element/img/logos/mindroom.svg`
- `res/css/mindroom-overrides.pcss`
- `res/css/shared.pcss`
- `res/css/views/auth/_AuthPage.pcss`
- `res/themes/light/css/light.pcss`
- `src/components/views/auth/AuthPage.tsx`
- `src/components/structures/MainSplit.tsx`
- `src/Lifecycle.ts`
- `src/i18n/strings/en_EN.json`
- `webpack.config.js`
- `test/unit-tests/components/structures/__snapshots__/MainSplit-test.tsx.snap`
- `test/unit-tests/components/structures/__snapshots__/RoomView-test.tsx.snap`

What changed:

- Added MindRoom config and welcome page assets.
- Applied MindRoom auth-page styling and branding.
- Switched defaults for thread-focused right panel sizing.
- Disabled browser compatibility warning gate.

### feat(commands): add MindRoom ! autocomplete with backend-synced command list

Files changed:

- `src/MindRoomCommands.tsx`
- `src/autocomplete/CommandProvider.tsx`
- `src/editor/commands.tsx`
- `src/editor/parts.ts`

What changed:

- Added `!`-prefix MindRoom command autocomplete and aligned suggestions with backend command set.

### feat(renderer): add collapsible block system and tool-ref dropdown rendering

Files changed:

- `res/css/_components.pcss`
- `res/css/views/elements/_CollapsibleBlock.pcss`
- `res/css/views/elements/_ThinkingBlock.pcss`
- `src/Linkify.tsx`
- `src/components/views/elements/CollapsibleBlock.tsx`
- `src/components/views/elements/ThinkingBlock.tsx`
- `src/components/views/messages/CodeBlock.tsx`
- `src/components/views/messages/EventContentBody.tsx`
- `src/components/views/messages/TextualBody.tsx`
- `src/renderer/code-block.tsx`
- `src/renderer/collapsible.tsx`
- `src/renderer/collapsibleBlocks.ts`
- `src/renderer/index.ts`
- `src/renderer/thinking.tsx`
- `src/renderer/utils.tsx`
- `test/unit-tests/renderer/collapsible-test.tsx`

What changed:

- Added generic collapsible block components and renderer plumbing.
- Added tool-ref marker parsing/rendering for MindRoom tool traces.
- Added renderer tests for tool block behavior and parsing edges.

### feat(long-text): hydrate MindRoom v2 sidecars inline with retry/cache and download-original

Files changed:

- `docs/mindroom-long-text.md`
- `res/css/_components.pcss`
- `res/css/views/messages/_MindroomLongTextBody.pcss`
- `src/components/views/context_menus/MessageContextMenu.tsx`
- `src/components/views/messages/IBodyProps.ts`
- `src/components/views/messages/MessageActionBar.tsx`
- `src/components/views/messages/MessageEvent.tsx`
- `src/components/views/messages/MindroomLongTextBody.tsx`
- `src/components/views/messages/TextualBody.tsx`
- `src/i18n/strings/en_EN.json`
- `src/utils/mindroomLongText.ts`
- `test/utils/mindroomLongText-test.tsx`
- `test/unit-tests/components/views/messages/TextualBody-test.tsx`
- `test/unit-tests/components/views/messages/__snapshots__/TextualBody-test.tsx.snap`

What changed:

- Added v2 large-message sidecar hydration (`matrix_event_content_json`) with cache/retry handling.
- Rendered hydrated content inline while preserving preview fallback behavior.
- Added context-menu action to download original sidecar payload.
- Added tests and developer docs for the long-text flow.

### fix(matrix-js-sdk): guard m.replace relation updates against async stale overwrite

Files changed:

- `patches/matrix-js-sdk+40.1.0.patch`
- `docs/matrix-mreplace-race-fix-report.md`

What changed:

- Patched `matrix-js-sdk` relations replacement updates to avoid out-of-order async overwrite races.
- Added investigation and validation report.

### ci(build): add MindRoom image workflow and fork-safe pipeline adjustments

Files changed:

- `.github/workflows/docker-mindroom.yaml`
- `.github/workflows/pull_request.yaml`
- `.github/workflows/pull_request_base_branch.yaml`
- `.github/workflows/sonarqube.yml`
- `Dockerfile`
- `scripts/docker-package.sh`
- `src/utils/RoomUpgrade.ts`

What changed:

- Added MindRoom-targeted Docker CI workflow.
- Added fork-safe conditions for upstream-owned reusable workflow jobs.
- Added configurable Docker build-time config selection.
- Added `upgradeRoom` call typing shim for the additional creators argument.

## Runbook

### Core Guarantees

- Matrix tool telemetry renders from tool-ref markers plus `io.mindroom.tool_trace` metadata.
- MindRoom v2 large messages (`io.mindroom.long_text`) hydrate from JSON sidecars inline.
- Streaming edit updates avoid stale replacement regressions via SDK patching.

### Important Paths

- Message rendering: `src/components/views/messages/EventContentBody.tsx`
- Tool-ref parsing: `src/renderer/collapsible.tsx`
- Long-text hydration: `src/utils/mindroomLongText.ts`
- Long-text body wrapper: `src/components/views/messages/MindroomLongTextBody.tsx`
- SDK patch: `patches/matrix-js-sdk+40.1.0.patch`

### Validation

Recommended local checks:

- `yarn test test/unit-tests/renderer/collapsible-test.tsx`
- `yarn test test/utils/mindroomLongText-test.tsx`
- `yarn test test/unit-tests/components/views/messages/TextualBody-test.tsx`
- `yarn build`
