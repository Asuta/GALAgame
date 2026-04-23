# Prototype Art Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first playable art pack to the romance map chat game by generating a city map, four region backgrounds, two half-body character illustrations, and lightweight UI textures, then wire them into the current visual panel without changing the core story flow.

**Architecture:** Keep the gameplay state and chat flow unchanged, and introduce a thin visual asset layer that resolves “what image should be shown right now” from existing state. Render the visual panel with normal HTML/CSS layers instead of the current Phaser placeholder, and store generated files under `public/assets` so Vite can serve them directly.

**Tech Stack:** TypeScript, Vite, Vitest, DOM rendering, CSS backgrounds, MCP image generation, static assets under `public/assets`

---

## File Structure

### Files To Create

- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/visual/assetCatalog.ts`
  - Static public-path constants for generated assets plus helper selectors for map, region background, and character layers.
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/tests/visual/assetCatalog.test.ts`
  - Unit tests for visual asset resolution.
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/docs/superpowers/assets/2026-04-23-prototype-art-prompts.md`
  - Saved generation prompts, filenames, and acceptance notes so later re-generation stays consistent.
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/map/city-overview-main.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-school-main.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-hospital-main.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-mall-main.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-home-main.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/characters/lin-cheng-half-body.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/characters/zhou-ran-half-body.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/ui/dialogue-panel-texture.png`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/ui/location-title-plate.png`

### Files To Modify

- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/ui/templates.ts`
  - Replace the Phaser-only placeholder visual area with image-backed layers and visual metadata.
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/styles/app.css`
  - Add layout and styling for background images, character overlays, and light UI texture usage.
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/app/createApp.ts`
  - Remove the unconditional Phaser host bootstrap so the HTML visual stack becomes the source of truth.
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/tests/ui/renderApp.test.ts`
  - Assert that the new visual panel renders map, region backgrounds, and character layers correctly.

### Files Left Untouched

- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/state/store.ts`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/ui/bindings.ts`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/logic/chatClient.ts`
- `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/data/world.ts`

These files already contain the state and story logic we need; the art-pack work should read from them, not rewrite them.

### Task 1: Add A Visual Asset Resolver

**Files:**
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/visual/assetCatalog.ts`
- Test: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/tests/visual/assetCatalog.test.ts`

- [ ] **Step 1: Write the failing resolver tests**

```ts
import { describe, expect, it } from 'vitest';
import { createInitialState, enterRegion, enterScene, startEvent } from '../../src/state/store';
import { worldData } from '../../src/data/world';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { resolveVisualSelection } from '../../src/visual/assetCatalog';

describe('resolveVisualSelection', () => {
  it('returns the city map before a region is selected', () => {
    const state = createInitialState();
    const visual = resolveVisualSelection(state);

    expect(visual.mode).toBe('map');
    expect(visual.backgroundSrc).toBe('/assets/map/city-overview-main.png');
    expect(visual.characterSrc).toBeNull();
  });

  it('returns a region background while exploring inside a region', () => {
    const state = enterRegion(createInitialState(), 'school');
    const visual = resolveVisualSelection(state);

    expect(visual.mode).toBe('region');
    expect(visual.backgroundSrc).toBe('/assets/backgrounds/region-school-main.png');
  });

  it('returns the active character portrait during a character event', () => {
    let state = createInitialState();
    state = enterScene(state, 'classroom');
    state = startEvent(
      state,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      })
    );

    const visual = resolveVisualSelection(state);

    expect(visual.mode).toBe('event');
    expect(visual.backgroundSrc).toBe('/assets/backgrounds/region-school-main.png');
    expect(visual.characterSrc).toBe('/assets/characters/lin-cheng-half-body.png');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run tests/visual/assetCatalog.test.ts`  
Expected: FAIL with `Cannot find module '../../src/visual/assetCatalog'` or `resolveVisualSelection is not exported`

- [ ] **Step 3: Write the minimal resolver implementation**

```ts
import { worldData } from '../data/world';
import type { GameState } from '../state/store';

export interface VisualSelection {
  mode: 'map' | 'region' | 'event';
  backgroundSrc: string;
  characterSrc: string | null;
  locationLabel: string;
}

const REGION_BACKGROUNDS: Record<string, string> = {
  school: '/assets/backgrounds/region-school-main.png',
  hospital: '/assets/backgrounds/region-hospital-main.png',
  mall: '/assets/backgrounds/region-mall-main.png',
  home: '/assets/backgrounds/region-home-main.png'
};

const CHARACTER_PORTRAITS: Record<string, string> = {
  林澄: '/assets/characters/lin-cheng-half-body.png',
  周然: '/assets/characters/zhou-ran-half-body.png'
};

export const resolveVisualSelection = (state: GameState): VisualSelection => {
  const currentRegion = worldData.regions.find((region) => region.id === state.navigation.currentRegionId) ?? null;
  const activeCharacter = state.event.activeEvent?.cast[0] ?? null;

  if (!currentRegion) {
    return {
      mode: 'map',
      backgroundSrc: '/assets/map/city-overview-main.png',
      characterSrc: null,
      locationLabel: '世界地图'
    };
  }

  return {
    mode: state.ui.mode === 'event' ? 'event' : 'region',
    backgroundSrc: REGION_BACKGROUNDS[currentRegion.id] ?? '/assets/map/city-overview-main.png',
    characterSrc: activeCharacter ? CHARACTER_PORTRAITS[activeCharacter] ?? null : null,
    locationLabel: currentRegion.name
  };
};
```

- [ ] **Step 4: Run the resolver test to verify it passes**

Run: `pnpm exec vitest run tests/visual/assetCatalog.test.ts`  
Expected: PASS with `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/visual/assetCatalog.ts tests/visual/assetCatalog.test.ts
git commit -m "feat: add visual asset resolver"
```

### Task 2: Generate And Save The First Art Pack

**Files:**
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/docs/superpowers/assets/2026-04-23-prototype-art-prompts.md`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/map/city-overview-main.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-school-main.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-hospital-main.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-mall-main.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/backgrounds/region-home-main.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/characters/lin-cheng-half-body.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/characters/zhou-ran-half-body.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/ui/dialogue-panel-texture.png`
- Create: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/public/assets/ui/location-title-plate.png`

- [ ] **Step 1: Write the prompt record file before generating images**

```md
# Prototype Art Prompts

## Shared Direction

- Style: anime mobile romance game illustration
- Mood: soft evening light, modern campus love story, delicate and restrained
- Palette: pink-purple-blue dusk tones, warm indoor highlights
- Framing: mobile portrait friendly, safe negative space for UI overlays

## Character Prompt: Lin Cheng

Teenage schoolgirl, anime mobile romance game half-body portrait, soft dusk rim light, calm and restrained expression, long dark hair, modern school uniform, subtle pink-purple-blue lighting, transparent background, clean line art, polished gacha-game character art, portrait composition, facing slightly toward camera left, no text, no watermark

## Character Prompt: Zhou Ran

Teenage boy, anime mobile romance game half-body portrait, relaxed but observant expression, neat modern casual school-age styling, soft evening light, transparent background, clean line art, polished gacha-game supporting character art, portrait composition, facing slightly toward camera right, no text, no watermark

## Map Prompt

Anime romance adventure world map for a mobile visual novel, stylized city overview, clearly separated school, hospital, shopping mall, and protagonist home landmarks, soft twilight colors, elegant game background illustration, top-down but painterly, mobile portrait crop, clean readable landmarks, no labels, no text, no watermark

## Region Prompt Pattern

Anime romance visual novel background, modern [REGION] environment, soft atmospheric lighting, delicate detail, empty scene prepared for character overlay, mobile portrait composition, clean focal depth, no people, no text, no watermark
```

- [ ] **Step 2: Generate and save the two character portraits**

Use the MCP image generator with these filenames:

```text
public/assets/characters/lin-cheng-half-body.png
public/assets/characters/zhou-ran-half-body.png
```

Acceptance checks:

- Transparent or near-transparent cutout result
- Clean silhouette against dark and light backgrounds
- Same overall rendering quality and palette family

- [ ] **Step 3: Generate and save the map and four region backgrounds**

Use the MCP image generator with these filenames:

```text
public/assets/map/city-overview-main.png
public/assets/backgrounds/region-school-main.png
public/assets/backgrounds/region-hospital-main.png
public/assets/backgrounds/region-mall-main.png
public/assets/backgrounds/region-home-main.png
```

Region substitutions for the prompt pattern:

```text
[REGION]=high school classroom corridor hybrid, warm sunset campus mood
[REGION]=quiet hospital interior, cool white lights and emotional stillness
[REGION]=shopping mall interior with cafe-adjacent softness, evening glow
[REGION]=cozy apartment home interior, private night mood and soft lamp light
```

Acceptance checks:

- All images read well in a portrait crop
- Enough empty space for an overlaid portrait on one side
- No hard perspective distortions that fight the UI

- [ ] **Step 4: Generate and save the two UI texture assets**

Use the MCP image generator with these filenames:

```text
public/assets/ui/dialogue-panel-texture.png
public/assets/ui/location-title-plate.png
```

Prompt guidance:

```text
Subtle anime romance game UI texture, translucent glass-like panel texture, pink-purple-blue highlights, no text, seamless or center-safe composition

Elegant anime romance game title plate ornament, decorative but restrained, silver and lilac trim, transparent background, centered horizontal plaque, no text
```

- [ ] **Step 5: Verify the assets exist at the expected paths**

Run: `Get-ChildItem -Recurse public/assets | Select-Object FullName`  
Expected: A file list containing all nine generated asset paths

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/assets/2026-04-23-prototype-art-prompts.md public/assets
git commit -m "feat: add prototype art pack assets"
```

### Task 3: Render The New Visual Stack In The UI

**Files:**
- Modify: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/ui/templates.ts`
- Modify: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/styles/app.css`
- Modify: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/src/app/createApp.ts`
- Modify: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/tests/ui/renderApp.test.ts`

- [ ] **Step 1: Extend the UI tests to assert image-backed visuals**

```ts
it('renders the city map image before region selection', () => {
  const state = createInitialState();
  document.body.innerHTML = '<div id="app"></div>';

  renderApp(document.querySelector('#app') as HTMLDivElement, state);

  const background = document.querySelector('[data-testid="visual-background"]') as HTMLImageElement;
  expect(background).not.toBeNull();
  expect(background.getAttribute('src')).toBe('/assets/map/city-overview-main.png');
});

it('renders a character portrait during a fixed-character event', () => {
  let state = createInitialState();
  state = startEvent(
    state,
    buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    })
  );

  document.body.innerHTML = '<div id="app"></div>';
  renderApp(document.querySelector('#app') as HTMLDivElement, state);

  const portrait = document.querySelector('[data-testid="visual-character"]') as HTMLImageElement | null;
  expect(portrait?.getAttribute('src')).toBe('/assets/characters/lin-cheng-half-body.png');
});
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `pnpm exec vitest run tests/ui/renderApp.test.ts`  
Expected: FAIL because `visual-background` and `visual-character` are not rendered yet

- [ ] **Step 3: Replace the visual panel markup with image layers**

```ts
import { resolveVisualSelection } from '../visual/assetCatalog';

export const createAppMarkup = (state: GameState): string => {
  const visual = resolveVisualSelection(state);

  return `
    <div class="phone-frame">
      <section class="visual-panel" data-testid="visual-panel">
        <div class="visual-card">
          <p class="visual-label">${visual.locationLabel}</p>
          <div class="visual-stage">
            <img
              class="visual-background"
              data-testid="visual-background"
              src="${visual.backgroundSrc}"
              alt="${visual.locationLabel}"
            />
            ${visual.characterSrc
              ? `<img
                  class="visual-character"
                  data-testid="visual-character"
                  src="${visual.characterSrc}"
                  alt=""
                />`
              : ''}
            <div class="visual-shade"></div>
          </div>
        </div>
      </section>
      ...
    </div>
  `;
};
```

- [ ] **Step 4: Update the styles for layered art and light UI textures**

```css
.visual-card {
  position: relative;
  overflow: hidden;
  padding: 12px;
  background:
    linear-gradient(180deg, rgba(9, 8, 20, 0.18), rgba(9, 8, 20, 0.42)),
    rgba(255, 255, 255, 0.08);
}

.visual-stage {
  position: relative;
  height: calc(100% - 28px);
  border-radius: 14px;
  overflow: hidden;
  background: #221c3b;
}

.visual-background,
.visual-character {
  position: absolute;
  inset: 0;
}

.visual-background {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.visual-character {
  inset: auto 0 0 auto;
  width: min(62%, 240px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.35));
}

.visual-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(12, 10, 26, 0.04), rgba(12, 10, 26, 0.32));
}

.dialogue-panel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04)),
    url('/assets/ui/dialogue-panel-texture.png') center/cover no-repeat;
}
```

- [ ] **Step 5: Remove the unconditional Phaser bootstrap**

```ts
import { createInitialState } from '../state/store';
import { bindUi } from '../ui/bindings';
import { renderApp } from '../ui/renderApp';

export const createApp = (root: HTMLDivElement): void => {
  renderApp(root, createInitialState());
  bindUi(root);
};
```

- [ ] **Step 6: Run the focused UI tests to verify they pass**

Run: `pnpm exec vitest run tests/ui/renderApp.test.ts tests/ui/inputBehavior.test.ts`  
Expected: PASS with all tests green

- [ ] **Step 7: Commit**

```bash
git add src/ui/templates.ts src/styles/app.css src/app/createApp.ts tests/ui/renderApp.test.ts
git commit -m "feat: render generated art pack in visual panel"
```

### Task 4: Verify End-To-End And Tighten Any Gaps

**Files:**
- Modify if needed: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/tests/ui/renderApp.test.ts`
- Modify if needed: `C:/Users/youdo/.codex/worktrees/c5e0/GalaGmae/tests/visual/assetCatalog.test.ts`

- [ ] **Step 1: Run the full automated test suite**

Run: `pnpm exec vitest run`  
Expected: PASS with the existing tests plus the new visual resolver tests

- [ ] **Step 2: Run the production build**

Run: `pnpm build`  
Expected: PASS with a successful `vite build` output and no missing asset-path errors

- [ ] **Step 3: Manually verify the three visual states in the dev server**

Run: `pnpm dev`  
Expected:

```text
- Initial screen shows the city map image
- After clicking a region button, the visual panel switches to that region background
- After opening a classroom or cafe event, the matching portrait appears over the background
```

- [ ] **Step 4: If a regression appears, add one targeted test before fixing**

```ts
it('falls back to region-only art when an event has no mapped portrait', () => {
  let state = createInitialState();
  state = enterRegion(state, 'mall');
  const visual = resolveVisualSelection(state);

  expect(visual.backgroundSrc).toBe('/assets/backgrounds/region-mall-main.png');
  expect(visual.characterSrc).toBeNull();
});
```

- [ ] **Step 5: Commit the verification fix or final state**

```bash
git add tests/visual/assetCatalog.test.ts tests/ui/renderApp.test.ts
git commit -m "test: cover prototype art pack fallbacks"
```

## Self-Review

### Spec Coverage

- World map art: Task 2 and Task 3
- Four region backgrounds: Task 2 and Task 3
- Two half-body portraits: Task 2 and Task 3
- Light UI art enhancement: Task 2 and Task 3
- Low-intrusion integration: Task 1 and Task 3
- Verification and build safety: Task 4

### Placeholder Scan

- No `TODO`, `TBD`, or “similar to above” references remain
- Each code-changing task includes concrete file paths and code blocks
- Each verification step includes a command and an expected result

### Type Consistency

- `resolveVisualSelection` is the single exported visual selector used by the UI and tested directly
- Asset keys match the committed filenames under `public/assets`
- UI tests assert the exact `data-testid` names introduced in Task 3
