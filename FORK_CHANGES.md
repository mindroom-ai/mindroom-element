# MindRoom Element Fork — Changes Since 352feb278789dcf95774e6f5f5695f870f2cb2e3

This document tracks MindRoom-specific changes on top of upstream Element,
using clean, feature-scoped commits.

Rules followed:

- No guessing: behavior claims come from code and tests in this repository.
- Keep changes grouped by feature so rebases onto upstream stay manageable.

## How To Regenerate

- Commit list: `BASE=$(git merge-base HEAD upstream/develop) && git log --reverse --format="%H %ad %s" --date=short "$BASE"..HEAD`
- Net diff vs base: `BASE=$(git merge-base HEAD upstream/develop) && git diff --stat "$BASE"..HEAD`
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
- `webpack.config.ts`
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

### feat(mindroom): surface ai_run metadata in timeline info tooltip

Files changed:

- `res/css/views/messages/_MessageActionBar.pcss`
- `src/components/views/messages/MessageActionBar.tsx`
- `src/utils/mindroomAiRun.ts`
- `src/utils/mindroomLongText.ts`
- `test/unit-tests/components/views/messages/MessageActionBar-test.tsx`
- `test/unit-tests/utils/mindroomAiRun-test.ts`
- `test/unit-tests/utils/mindroomLongText-test.ts`

What changed:

- Added typed extraction/parsing for `io.mindroom.ai_run` metadata from timeline events.
- Added a subtle info button on message rows; its hover tooltip shows run
  context and usage metrics (status, model/provider, token counts, timing, and
  tool count).
- Wired metadata lookup through replacement-aware message content so edited
  events still surface run information.
- Added unit coverage for metadata parsing and tooltip rendering.

### chore(brand): refresh logo and favicon assets

Files changed:

- `FORK_CHANGES.md`
- `res/themes/element/img/logos/mindroom-favicon.png`
- `res/vector-icons/24.png`
- `res/vector-icons/120.png`
- `res/vector-icons/144.png`
- `res/vector-icons/152.png`
- `res/vector-icons/180.png`
- `res/vector-icons/512.png`
- `res/vector-icons/1024.png`

What changed:

- Refreshed the generated favicon/vector icon set from a favicon-specific MindRoom PNG for better small-size legibility.

Why:

- The favicon/icon pipeline should use the simplified high-contrast mark rather than the larger transparent app logo.

### ci(release): auto-tag develop pushes with mindroom suffix

Files changed:

- `.github/workflows/auto-mindroom-release.yml`
- `README.md`
- `package.json`
- `scripts/fork_release_tag.py`

What changed:

- Added a fork-specific release workflow that runs on `develop` branch pushes.
- Added base-version-aware release tag computation in `scripts/fork_release_tag.py`.
- Added `pnpm run release:next-tag` to preview the computed tag locally.
- Documented release tag format and environment variable overrides in `README.md`.

## Runbook

### Core Guarantees

- Matrix tool telemetry renders from tool-ref markers plus `io.mindroom.tool_trace` metadata.
- MindRoom v2 large messages (`io.mindroom.long_text`) hydrate from JSON sidecars inline.
- MindRoom run telemetry (`io.mindroom.ai_run`) is available in a non-obtrusive message info tooltip.
- `develop` branch pushes auto-publish GitHub releases with tags in `v<base_version>-mindroom.<n>` format.
- `m.replace` stale-update race handling now comes from upstream `matrix-js-sdk` (no local patch file).

### Important Paths

- Message rendering: `src/components/views/messages/EventContentBody.tsx`
- Tool-ref parsing: `src/renderer/collapsible.tsx`
- Long-text hydration: `src/utils/mindroomLongText.ts`
- Long-text body wrapper: `src/components/views/messages/MindroomLongTextBody.tsx`
- AI run metadata parser: `src/utils/mindroomAiRun.ts`
- AI run tooltip host: `src/components/views/messages/MessageActionBar.tsx`
- Release tag helper: `scripts/fork_release_tag.py`
- Release workflow: `.github/workflows/auto-mindroom-release.yml`
- Branding assets: `res/themes/element/img/logos/`, `res/vector-icons/`, and `res/img/element-desktop-logo.png`

### Validation

Recommended local checks:

- `yarn test test/unit-tests/renderer/collapsible-test.tsx`
- `yarn test test/utils/mindroomLongText-test.tsx`
- `yarn test test/unit-tests/components/views/messages/TextualBody-test.tsx`
- `yarn test test/unit-tests/utils/mindroomAiRun-test.ts`
- `yarn test test/unit-tests/components/views/messages/MessageActionBar-test.tsx`
- `yarn build`
