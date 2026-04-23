# Settings Page Model Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move model selection into the separate settings page while keeping the current model visible in the main game header.

**Architecture:** Reuse the existing settings page as the single place for user-configurable options. Keep model persistence in the current settings storage flow, remove the main-page model dropdown interaction, and render selectable model options alongside the stream speed slider.

**Tech Stack:** TypeScript, Vitest, Vite, DOM rendering via string templates

---

### Task 1: Add failing UI tests

**Files:**
- Modify: `tests/ui/renderApp.test.ts`
- Modify: `tests/ui/bindings.test.ts`

- [ ] Add a render test asserting the settings page contains model options and the game page no longer renders a model dropdown menu.
- [ ] Run `pnpm run test -- --run tests/ui/renderApp.test.ts tests/ui/bindings.test.ts` and confirm the new assertions fail for the missing settings-page model list.

### Task 2: Render model selection inside settings

**Files:**
- Modify: `src/ui/templates.ts`
- Modify: `src/styles/app.css`

- [ ] Add a model selection card to the settings page with active-state styling and keep the header model label read-only on the main page.
- [ ] Remove the main-page dropdown menu markup and any toggle affordance no longer needed there.

### Task 3: Wire model selection and persistence

**Files:**
- Modify: `src/ui/bindings.ts`
- Modify: `src/state/store.ts`

- [ ] Update bindings so settings-page model buttons call the existing model setter and persist immediately.
- [ ] Remove obsolete main-page model-menu toggle handling if it is no longer used.

### Task 4: Verify end to end

**Files:**
- Modify: `tests/state/modelSelection.test.ts`

- [ ] Add or adjust state tests only if needed for the simplified model-selection behavior.
- [ ] Run `pnpm run test -- --run` and `pnpm run build` and confirm everything passes.
