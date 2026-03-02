# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains core Element app logic; MindRoom-specific code is concentrated in `src/renderer/`, `src/utils/mindroom*.ts`, and `src/components/views/messages/`.
- `res/` stores static assets and PostCSS styles (`res/css/**`).
- `test/unit-tests/` and `test/utils/` contain Jest tests; `playwright/` contains end-to-end tests.
- `docs/` contains feature and contributor docs (notably `docs/mindroom-long-text.md`).
- `FORK_CHANGES.md` is the source of truth for fork-only deltas from upstream Element.
- `../mindroom` is an essential reference for payload contracts (`io.mindroom.tool_trace`, `io.mindroom.long_text`, `io.mindroom.ai_run`), especially in `src/mindroom/tool_events.py`, `src/mindroom/matrix/message_content.py`, and `src/mindroom/constants.py`.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm start`: run the local dev server (`nx start`).
- `pnpm build`: create production bundles.
- `pnpm lint`: run type, JS, style, and workflow linting.
- `pnpm test`: run unit tests (`nx test:unit`).
- `pnpm test test/unit-tests/renderer/collapsible-test.tsx`: run a focused test file.
- `pnpm test:playwright`: run end-to-end tests.

## Coding Style & Naming Conventions
- Write new code in TypeScript (`.ts`/`.tsx`).
- Use 4-space indentation and LF line endings (`.editorconfig`).
- Use `camelCase` for variables/functions and `UpperCamelCase` for components/classes.
- Avoid `export default` for new modules.
- Before pushing, run `pnpm lint` (or `pnpm lint:js-fix` for local auto-fixes).

## Testing Guidelines
- Jest test files must match `test/**/*-test.[tj]s?(x)`.
- Keep tests close to the behavior area (renderer, utils, or message components).
- For forked features, add coverage for rendering and hydration paths tied to MindRoom metadata keys.
- Aim for high coverage on new behavior (80%+ where practical, per upstream contribution guidance).

## Commit & Pull Request Guidelines
- Use conventional, feature-scoped commit subjects (for example: `feat(renderer): ...`, `feat(long-text): ...`, `ci(build): ...`).
- Keep commits narrowly scoped to ease rebases onto `element-hq/element-web` `develop`.
- Update `FORK_CHANGES.md` when changing fork-specific behavior.
- PRs should include a concise problem/solution summary, linked issues, test plan, and before/after screenshots for UI changes.
