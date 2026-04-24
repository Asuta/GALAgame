# Continue Story Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `继续剧情` button that appears only during active events and advances the current event without player-authored text.

**Architecture:** Reuse the existing active-event turn pipeline in `src/ui/bindings.ts` so auto-continue shares streaming, phase advancement, and event settlement behavior with normal sends. Update the template to render a dedicated button only for visible active events, then cover both rendering and click behavior with focused UI tests.

**Tech Stack:** TypeScript, Vitest, DOM-based UI rendering/binding tests

---

### Task 1: Lock the UI contract with failing tests

**Files:**
- Modify: `tests/ui/renderApp.test.ts`
- Modify: `tests/ui/bindings.test.ts`

- [ ] **Step 1: Write the failing render and binding tests**
- [ ] **Step 2: Run targeted tests to verify they fail**
- [ ] **Step 3: Implement the minimal UI and binding changes**
- [ ] **Step 4: Re-run targeted tests to verify they pass**
- [ ] **Step 5: Run the full test suite and build**
- [ ] **Step 6: Commit**
