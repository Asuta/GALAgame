# Romance Map Chat Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile portrait web game prototype where players explore a city map, enter one-level sub-scenes, start romance story events, chat in natural language, and manually compress story memory.

**Architecture:** Use `Vite + TypeScript` for the app shell, `Phaser` for the top visual scene area, and DOM UI for the bottom dialogue/control panel. Keep game state in a small store with three layers: navigation state, event/dialogue state, and memory state; start with mock dialogue responses and deterministic event data before wiring any real model API.

**Tech Stack:** `Vite`, `TypeScript`, `Phaser 3`, `Vitest`, `@testing-library/dom`, `jsdom`

---

## File Structure

- Create: `package.json` — project scripts and dependencies
- Create: `tsconfig.json` — TypeScript config for app and tests
- Create: `vite.config.ts` — Vite config
- Create: `index.html` — app entry
- Create: `src/main.ts` — bootstraps app
- Create: `src/styles/app.css` — portrait layout and UI styles
- Create: `src/app/createApp.ts` — top-level DOM composition and event wiring
- Create: `src/game/createPhaserHost.ts` — Phaser game bootstrap with resizable portrait canvas
- Create: `src/game/scenes/MapScene.ts` — top-area scene rendering map and location markers
- Create: `src/data/world.ts` — world, regions, sub-scenes, and events mock data
- Create: `src/data/types.ts` — shared domain types
- Create: `src/state/store.ts` — core state transitions
- Create: `src/state/selectors.ts` — derived view data helpers
- Create: `src/logic/dialogue.ts` — mock story response generator
- Create: `src/logic/memory.ts` — memory compression helpers
- Create: `src/ui/renderApp.ts` — DOM renderer for bottom panel
- Create: `src/ui/templates.ts` — small HTML template helpers
- Create: `src/ui/bindings.ts` — UI event handlers -> store actions
- Create: `tests/state/store.test.ts` — state transition tests
- Create: `tests/logic/memory.test.ts` — memory compression tests
- Create: `tests/logic/dialogue.test.ts` — mock dialogue tests
- Create: `tests/ui/renderApp.test.ts` — DOM rendering tests

## Task 1: Scaffold the project and verify the shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles/app.css`

- [ ] **Step 1: Write the failing shell test**

Create `tests/ui/renderApp.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

describe('app shell', () => {
  it('exposes a portrait root mount point', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector('#app');
    expect(root).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails without test tooling**

Run: `npm test -- --run tests/ui/renderApp.test.ts`
Expected: FAIL because `package.json` and Vitest config do not exist yet.

- [ ] **Step 3: Write minimal project scaffolding**

Create `package.json`:

```json
{
  "name": "romance-map-chat-game",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@types/node": "^24.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "types": ["vitest/globals", "jsdom"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  }
});
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Romance Map Chat Game</title>
    <script type="module" src="/src/main.ts"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

Create `src/main.ts`:

```ts
import './styles/app.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app mount point');
}

root.innerHTML = '<div class="app-shell">Loading...</div>';
```

Create `src/styles/app.css`:

```css
:root {
  color-scheme: dark;
  font-family: "Segoe UI", sans-serif;
  background: #120f1f;
  color: #f7f2ff;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  min-height: 100%;
  width: 100%;
}

body {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1630 0%, #0f1020 100%);
}

.app-shell {
  min-height: 100vh;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm install`
Then run: `npm test -- --run tests/ui/renderApp.test.ts`
Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.ts src/styles/app.css tests/ui/renderApp.test.ts
git commit -m "feat: scaffold portrait game shell"
```

## Task 2: Build domain data and state transitions

**Files:**
- Create: `src/data/types.ts`
- Create: `src/data/world.ts`
- Create: `src/state/store.ts`
- Create: `src/state/selectors.ts`
- Test: `tests/state/store.test.ts`

- [ ] **Step 1: Write the failing state test**

Create `tests/state/store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialState, enterRegion, enterScene, startEvent, endEvent } from '../../src/state/store';

describe('store transitions', () => {
  it('moves from world map to region scene to event and back', () => {
    let state = createInitialState();

    state = enterRegion(state, 'school');
    expect(state.navigation.currentRegionId).toBe('school');

    state = enterScene(state, 'classroom');
    expect(state.navigation.currentSceneId).toBe('classroom');

    state = startEvent(state, 'after-school-classroom');
    expect(state.event.activeEventId).toBe('after-school-classroom');
    expect(state.ui.mode).toBe('event');

    state = endEvent(state);
    expect(state.event.activeEventId).toBeNull();
    expect(state.ui.mode).toBe('explore');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/state/store.test.ts`
Expected: FAIL because store modules do not exist.

- [ ] **Step 3: Write minimal domain types and store**

Create `src/data/types.ts`:

```ts
export type Mode = 'explore' | 'event';

export interface Region {
  id: string;
  name: string;
  sceneIds: string[];
}

export interface Scene {
  id: string;
  regionId: string;
  name: string;
  description: string;
  eventIds: string[];
}

export interface StoryEvent {
  id: string;
  title: string;
  sceneId: string;
  cast: string[];
  intro: string;
  repeatable: boolean;
}

export interface WorldData {
  regions: Region[];
  scenes: Scene[];
  events: StoryEvent[];
}
```

Create `src/data/world.ts`:

```ts
import type { WorldData } from './types';

export const worldData: WorldData = {
  regions: [
    { id: 'school', name: '学校', sceneIds: ['classroom', 'hallway', 'playground', 'rooftop'] },
    { id: 'hospital', name: '医院', sceneIds: ['lobby', 'ward', 'hospital-hallway', 'vending-zone'] },
    { id: 'mall', name: '商场', sceneIds: ['atrium', 'cafe', 'cinema-gate', 'accessory-shop'] },
    { id: 'home', name: '主角家', sceneIds: ['living-room', 'bedroom', 'balcony', 'entryway'] }
  ],
  scenes: [
    { id: 'classroom', regionId: 'school', name: '教室', description: '放学后的教室被夕阳染成暖金色。', eventIds: ['after-school-classroom'] },
    { id: 'hallway', regionId: 'school', name: '走廊', description: '窗边的风吹动着张贴的社团海报。', eventIds: [] },
    { id: 'playground', regionId: 'school', name: '操场', description: '远处还能听见篮球落地的回响。', eventIds: [] },
    { id: 'rooftop', regionId: 'school', name: '天台', description: '城市的风从高处掠过。', eventIds: [] },
    { id: 'lobby', regionId: 'hospital', name: '大厅', description: '消毒水味混着轻微脚步声。', eventIds: [] },
    { id: 'ward', regionId: 'hospital', name: '病房', description: '白色帘子随着空调轻轻晃动。', eventIds: ['quiet-visit'] },
    { id: 'hospital-hallway', regionId: 'hospital', name: '走廊', description: '夜班灯光把地面照得发白。', eventIds: [] },
    { id: 'vending-zone', regionId: 'hospital', name: '自动贩卖机区', description: '饮料机发出轻微的电流声。', eventIds: [] },
    { id: 'atrium', regionId: 'mall', name: '一层中庭', description: '商场广播正播着轻快的歌。', eventIds: [] },
    { id: 'cafe', regionId: 'mall', name: '咖啡店', description: '咖啡香把气氛变得柔软。', eventIds: ['rainy-cafe-meet'] },
    { id: 'cinema-gate', regionId: 'mall', name: '电影院门口', description: '海报灯箱映着来往的人群。', eventIds: [] },
    { id: 'accessory-shop', regionId: 'mall', name: '饰品店', description: '玻璃展柜里闪着细小反光。', eventIds: [] },
    { id: 'living-room', regionId: 'home', name: '客厅', description: '傍晚的客厅有一点安静过头。', eventIds: [] },
    { id: 'bedroom', regionId: 'home', name: '卧室', description: '桌面上摊着没看完的习题册。', eventIds: [] },
    { id: 'balcony', regionId: 'home', name: '阳台', description: '夜风吹起窗帘的边角。', eventIds: ['late-night-call'] },
    { id: 'entryway', regionId: 'home', name: '门口', description: '鞋柜上还放着今天出门时忘记带走的钥匙。', eventIds: [] }
  ],
  events: [
    { id: 'after-school-classroom', title: '放学后的空教室', sceneId: 'classroom', cast: ['林澄'], intro: '她一个人坐在窗边，像是在等什么。', repeatable: false },
    { id: 'quiet-visit', title: '安静探望', sceneId: 'ward', cast: ['林澄'], intro: '你没想到会在病房门口看见她。', repeatable: true },
    { id: 'rainy-cafe-meet', title: '雨天咖啡店', sceneId: 'cafe', cast: ['林澄'], intro: '她抖了抖雨伞上的水珠，抬眼看向你。', repeatable: true },
    { id: 'late-night-call', title: '深夜来电', sceneId: 'balcony', cast: ['周然'], intro: '手机震动打破了夜里的安静。', repeatable: true }
  ]
};
```

Create `src/state/store.ts`:

```ts
import { worldData } from '../data/world';
import type { Mode } from '../data/types';

export interface GameState {
  navigation: {
    currentRegionId: string | null;
    currentSceneId: string | null;
  };
  ui: {
    mode: Mode;
  };
  event: {
    activeEventId: string | null;
    completedEventIds: string[];
  };
  memory: {
    summary: string;
    facts: string[];
  };
}

export const createInitialState = (): GameState => ({
  navigation: {
    currentRegionId: null,
    currentSceneId: null
  },
  ui: {
    mode: 'explore'
  },
  event: {
    activeEventId: null,
    completedEventIds: []
  },
  memory: {
    summary: '你刚开始在这座城市里探索，故事还没有真正展开。',
    facts: []
  }
});

export const enterRegion = (state: GameState, regionId: string): GameState => ({
  ...state,
  navigation: {
    currentRegionId: regionId,
    currentSceneId: null
  },
  ui: {
    mode: 'explore'
  }
});

export const enterScene = (state: GameState, sceneId: string): GameState => {
  const scene = worldData.scenes.find((item) => item.id === sceneId);

  if (!scene) {
    return state;
  }

  return {
    ...state,
    navigation: {
      currentRegionId: scene.regionId,
      currentSceneId: sceneId
    }
  };
};

export const startEvent = (state: GameState, eventId: string): GameState => ({
  ...state,
  ui: {
    mode: 'event'
  },
  event: {
    ...state.event,
    activeEventId: eventId
  }
});

export const endEvent = (state: GameState): GameState => ({
  ...state,
  ui: {
    mode: 'explore'
  },
  event: {
    activeEventId: null,
    completedEventIds: state.event.activeEventId
      ? Array.from(new Set([...state.event.completedEventIds, state.event.activeEventId]))
      : state.event.completedEventIds
  }
});
```

Create `src/state/selectors.ts`:

```ts
import { worldData } from '../data/world';
import type { GameState } from './store';

export const getCurrentRegion = (state: GameState) =>
  worldData.regions.find((region) => region.id === state.navigation.currentRegionId) ?? null;

export const getCurrentScene = (state: GameState) =>
  worldData.scenes.find((scene) => scene.id === state.navigation.currentSceneId) ?? null;

export const getActiveEvent = (state: GameState) =>
  worldData.events.find((storyEvent) => storyEvent.id === state.event.activeEventId) ?? null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/state/store.test.ts`
Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/world.ts src/state/store.ts src/state/selectors.ts tests/state/store.test.ts
git commit -m "feat: add world data and state transitions"
```

## Task 3: Render the portrait split layout and exploration UI

**Files:**
- Create: `src/app/createApp.ts`
- Create: `src/ui/renderApp.ts`
- Create: `src/ui/templates.ts`
- Create: `src/ui/bindings.ts`
- Modify: `src/main.ts`
- Modify: `src/styles/app.css`
- Test: `tests/ui/renderApp.test.ts`

- [ ] **Step 1: Write the failing renderer test**

Replace `tests/ui/renderApp.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../src/ui/renderApp';
import { createInitialState } from '../../src/state/store';

describe('renderApp', () => {
  it('renders portrait visual area and dialogue panel', () => {
    const state = createInitialState();
    document.body.innerHTML = '<div id="app"></div>';

    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="visual-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dialogue-panel"]')).not.toBeNull();
    expect(document.body.textContent).toContain('世界地图');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/ui/renderApp.test.ts`
Expected: FAIL because `renderApp` does not exist.

- [ ] **Step 3: Write minimal renderer and app bootstrap**

Create `src/ui/templates.ts`:

```ts
import { worldData } from '../data/world';
import { getCurrentRegion, getCurrentScene, getActiveEvent } from '../state/selectors';
import type { GameState } from '../state/store';

export const createAppMarkup = (state: GameState): string => {
  const currentRegion = getCurrentRegion(state);
  const currentScene = getCurrentScene(state);
  const activeEvent = getActiveEvent(state);

  const regionButtons = worldData.regions
    .map((region) => `<button class="choice-button" data-region-id="${region.id}">${region.name}</button>`)
    .join('');

  const sceneButtons = currentRegion
    ? worldData.scenes
        .filter((scene) => scene.regionId === currentRegion.id)
        .map((scene) => `<button class="choice-button" data-scene-id="${scene.id}">${scene.name}</button>`)
        .join('')
    : '';

  const prompt = activeEvent
    ? activeEvent.intro
    : currentScene?.description ?? '点击上方地图区域，开始今天的探索。';

  return `
    <div class="phone-frame">
      <section class="visual-panel" data-testid="visual-panel">
        <div class="visual-card">
          <p class="visual-label">${currentRegion ? currentRegion.name : '世界地图'}</p>
          <div id="phaser-root" class="visual-stage"></div>
        </div>
      </section>
      <section class="dialogue-panel" data-testid="dialogue-panel">
        <header class="status-row">
          <div>
            <strong>${currentRegion?.name ?? '城市'}</strong>
            <span>${currentScene ? ` / ${currentScene.name}` : ''}</span>
          </div>
          <span class="mode-pill">${state.ui.mode === 'event' ? '事件中' : '探索中'}</span>
        </header>
        <article class="story-box">${prompt}</article>
        <div class="choices">
          ${currentRegion ? sceneButtons : regionButtons}
        </div>
        <div class="input-row">
          <textarea placeholder="进入事件后，在这里输入你想说的话。" ${state.ui.mode === 'event' ? '' : 'disabled'}></textarea>
          <div class="action-row">
            <button data-action="compress">记忆压缩</button>
            <button data-action="back">返回上一级</button>
          </div>
        </div>
      </section>
    </div>
  `;
};
```

Create `src/ui/renderApp.ts`:

```ts
import type { GameState } from '../state/store';
import { createAppMarkup } from './templates';

export const renderApp = (root: HTMLDivElement, state: GameState): void => {
  root.innerHTML = createAppMarkup(state);
};
```

Create `src/ui/bindings.ts`:

```ts
export const bindStaticUi = (): void => {
  return;
};
```

Create `src/app/createApp.ts`:

```ts
import { createInitialState } from '../state/store';
import { renderApp } from '../ui/renderApp';

export const createApp = (root: HTMLDivElement): void => {
  const state = createInitialState();
  renderApp(root, state);
};
```

Replace `src/main.ts` with:

```ts
import './styles/app.css';
import { createApp } from './app/createApp';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app mount point');
}

createApp(root);
```

Append to `src/styles/app.css`:

```css
.phone-frame {
  width: min(100vw, 420px);
  min-height: 100vh;
  margin: 0 auto;
  display: grid;
  grid-template-rows: 62vh 1fr;
}

.visual-panel {
  padding: 12px;
}

.visual-card,
.dialogue-panel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  backdrop-filter: blur(10px);
}

.visual-card {
  height: 100%;
  padding: 12px;
}

.visual-stage {
  height: calc(100% - 28px);
  border-radius: 14px;
  background: linear-gradient(180deg, #7f7ac8 0%, #403c73 100%);
}

.visual-label {
  margin: 0 0 10px;
  color: #d7cfff;
}

.dialogue-panel {
  margin: 0 12px 12px;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.status-row,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.story-box {
  min-height: 96px;
  line-height: 1.6;
}

.choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.choice-button,
.action-row button {
  border: 0;
  border-radius: 12px;
  padding: 10px 12px;
  background: #8a74ff;
  color: white;
}

.input-row textarea {
  width: 100%;
  min-height: 88px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 10px;
  resize: none;
  background: rgba(12, 12, 24, 0.5);
  color: white;
}

.mode-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/ui/renderApp.test.ts`
Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add src/app/createApp.ts src/ui/renderApp.ts src/ui/templates.ts src/ui/bindings.ts src/main.ts src/styles/app.css tests/ui/renderApp.test.ts
git commit -m "feat: render portrait split layout"
```

## Task 4: Add map interactions, event entry, and mock dialogue loop

**Files:**
- Create: `src/game/createPhaserHost.ts`
- Create: `src/game/scenes/MapScene.ts`
- Create: `src/logic/dialogue.ts`
- Modify: `src/app/createApp.ts`
- Modify: `src/ui/bindings.ts`
- Modify: `src/ui/templates.ts`
- Test: `tests/logic/dialogue.test.ts`

- [ ] **Step 1: Write the failing dialogue test**

Create `tests/logic/dialogue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMockReply } from '../../src/logic/dialogue';

describe('buildMockReply', () => {
  it('includes scene mood and character reaction', () => {
    const reply = buildMockReply({
      eventTitle: '放学后的空教室',
      locationLabel: '学校 / 教室',
      castName: '林澄',
      playerInput: '我走到你旁边，轻声问你今天怎么还没回家。'
    });

    expect(reply).toContain('学校 / 教室');
    expect(reply).toContain('林澄');
    expect(reply).toContain('轻轻看了你一眼');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/logic/dialogue.test.ts`
Expected: FAIL because `buildMockReply` does not exist.

- [ ] **Step 3: Write minimal interactive event flow**

Create `src/logic/dialogue.ts`:

```ts
export interface MockReplyInput {
  eventTitle: string;
  locationLabel: string;
  castName: string;
  playerInput: string;
}

export const buildMockReply = ({
  eventTitle,
  locationLabel,
  castName,
  playerInput
}: MockReplyInput): string =>
  `【${eventTitle}】\n${locationLabel}里，${castName}轻轻看了你一眼，像是在确认你的语气。\n你刚才说：“${playerInput}”\n她没有立刻移开视线，只是把声音放低了一点，给了你继续靠近这段关系的空间。`;
```

Create `src/game/scenes/MapScene.ts`:

```ts
import Phaser from 'phaser';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x403c73);
    this.add.text(width / 2, 36, '城市地图', {
      color: '#ffffff',
      fontSize: '22px'
    }).setOrigin(0.5, 0.5);
  }
}
```

Create `src/game/createPhaserHost.ts`:

```ts
import Phaser from 'phaser';
import { MapScene } from './scenes/MapScene';

export const createPhaserHost = (parent: string): Phaser.Game =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 390,
    height: 620,
    backgroundColor: '#403c73',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MapScene]
  });
```

Replace `src/ui/bindings.ts` with:

```ts
import { worldData } from '../data/world';
import { buildMockReply } from '../logic/dialogue';
import { createInitialState, endEvent, enterRegion, enterScene, startEvent, type GameState } from '../state/store';
import { renderApp } from './renderApp';

export const bindUi = (root: HTMLDivElement): void => {
  let state: GameState = createInitialState();

  const rerender = () => {
    renderApp(root, state);
    bindUiEvents();
  };

  const bindUiEvents = () => {
    root.querySelectorAll<HTMLButtonElement>('[data-region-id]').forEach((button) => {
      button.addEventListener('click', () => {
        state = enterRegion(state, button.dataset.regionId as string);
        rerender();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-scene-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const sceneId = button.dataset.sceneId as string;
        state = enterScene(state, sceneId);
        const scene = worldData.scenes.find((item) => item.id === sceneId);
        const eventId = scene?.eventIds[0];
        if (eventId) {
          state = startEvent(state, eventId);
        }
        rerender();
      });
    });

    root.querySelector<HTMLButtonElement>('[data-action="back"]')?.addEventListener('click', () => {
      state = state.ui.mode === 'event'
        ? endEvent(state)
        : {
            ...state,
            navigation: {
              currentRegionId: state.navigation.currentSceneId ? state.navigation.currentRegionId : null,
              currentSceneId: null
            }
          };
      rerender();
    });

    root.querySelector<HTMLButtonElement>('[data-action="send"]')?.addEventListener('click', () => {
      const input = root.querySelector<HTMLTextAreaElement>('textarea');
      if (!input?.value.trim() || !state.event.activeEventId) {
        return;
      }
      const activeEvent = worldData.events.find((item) => item.id === state.event.activeEventId);
      if (!activeEvent) {
        return;
      }
      state = {
        ...state,
        memory: {
          ...state.memory,
          summary: buildMockReply({
            eventTitle: activeEvent.title,
            locationLabel: `${state.navigation.currentRegionId ?? ''} / ${state.navigation.currentSceneId ?? ''}`,
            castName: activeEvent.cast[0],
            playerInput: input.value.trim()
          })
        }
      };
      rerender();
    });
  };

  rerender();
};
```

Replace `src/app/createApp.ts` with:

```ts
import { createPhaserHost } from '../game/createPhaserHost';
import { renderApp } from '../ui/renderApp';
import { bindUi } from '../ui/bindings';
import { createInitialState } from '../state/store';

export const createApp = (root: HTMLDivElement): void => {
  renderApp(root, createInitialState());
  createPhaserHost('phaser-root');
  bindUi(root);
};
```

Update the action row in `src/ui/templates.ts`:

```ts
<div class="action-row">
  <button data-action="compress">记忆压缩</button>
  <button data-action="back">返回上一级</button>
  <button data-action="send" ${state.ui.mode === 'event' ? '' : 'disabled'}>发送</button>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/logic/dialogue.test.ts tests/ui/renderApp.test.ts tests/state/store.test.ts`
Expected: PASS with all tests green

- [ ] **Step 5: Commit**

```bash
git add src/game/createPhaserHost.ts src/game/scenes/MapScene.ts src/logic/dialogue.ts src/app/createApp.ts src/ui/bindings.ts src/ui/templates.ts tests/logic/dialogue.test.ts
git commit -m "feat: add event entry and mock dialogue loop"
```

## Task 5: Add memory compression flow and polish the prototype

**Files:**
- Create: `src/logic/memory.ts`
- Modify: `src/state/store.ts`
- Modify: `src/ui/templates.ts`
- Modify: `src/ui/bindings.ts`
- Test: `tests/logic/memory.test.ts`

- [ ] **Step 1: Write the failing memory test**

Create `tests/logic/memory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compressMemory } from '../../src/logic/memory';

describe('compressMemory', () => {
  it('returns summary and key facts for romance progression', () => {
    const result = compressMemory({
      latestSummary: '你在雨天的咖啡店再次见到了林澄，你们的语气比之前柔和得多。',
      unlockedFacts: ['你已经正式认识林澄', '她最近经常去医院'],
      currentGoal: '找机会问出她隐瞒的原因'
    });

    expect(result.summary).toContain('林澄');
    expect(result.facts).toContain('当前目标：找机会问出她隐瞒的原因');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/logic/memory.test.ts`
Expected: FAIL because `compressMemory` does not exist.

- [ ] **Step 3: Write minimal memory compression and UI integration**

Create `src/logic/memory.ts`:

```ts
export interface MemoryInput {
  latestSummary: string;
  unlockedFacts: string[];
  currentGoal: string;
}

export interface MemoryResult {
  summary: string;
  facts: string[];
}

export const compressMemory = ({ latestSummary, unlockedFacts, currentGoal }: MemoryInput): MemoryResult => ({
  summary: `局势摘要：${latestSummary}`,
  facts: [...unlockedFacts, `当前目标：${currentGoal}`]
});
```

Add to `src/state/store.ts`:

```ts
export const updateMemory = (
  state: GameState,
  memory: {
    summary: string;
    facts: string[];
  }
): GameState => ({
  ...state,
  memory
});
```

Update the story box in `src/ui/templates.ts` to prefer memory summary during exploration:

```ts
const prompt = activeEvent
  ? activeEvent.intro
  : currentScene?.description ?? state.memory.summary;
```

Extend `src/ui/templates.ts` below the story box:

```ts
<section class="memory-box">
  <h3>记忆</h3>
  <p>${state.memory.summary}</p>
  <ul>
    ${state.memory.facts.map((fact) => `<li>${fact}</li>`).join('')}
  </ul>
</section>
```

Update `src/ui/bindings.ts`:

```ts
import { compressMemory } from '../logic/memory';
import { createInitialState, endEvent, enterRegion, enterScene, startEvent, updateMemory, type GameState } from '../state/store';
```

and add:

```ts
root.querySelector<HTMLButtonElement>('[data-action="compress"]')?.addEventListener('click', () => {
  state = updateMemory(
    state,
    compressMemory({
      latestSummary: state.memory.summary,
      unlockedFacts: state.memory.facts.length ? state.memory.facts : ['你已经正式认识林澄'],
      currentGoal: state.event.activeEventId ? '继续确认她没有说出口的心事' : '找到下一个能拉近关系的地点'
    })
  );
  rerender();
});
```

Append to `src/styles/app.css`:

```css
.memory-box {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.memory-box h3 {
  margin: 0 0 6px;
  font-size: 14px;
}

.memory-box p,
.memory-box li {
  font-size: 13px;
  line-height: 1.5;
}
```

- [ ] **Step 4: Run tests and build**

Run: `npm test -- --run tests/logic/memory.test.ts tests/logic/dialogue.test.ts tests/state/store.test.ts tests/ui/renderApp.test.ts`
Expected: PASS with all tests green

Run: `npm run build`
Expected: Vite build completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/logic/memory.ts src/state/store.ts src/ui/templates.ts src/ui/bindings.ts src/styles/app.css tests/logic/memory.test.ts
git commit -m "feat: add manual memory compression flow"
```

## Self-Review

- **Spec coverage:** The plan covers portrait layout, world map navigation, one-level sub-scenes, event entry, natural language mock dialogue, manual memory compression, and the minimum playable loop. Real model API integration is intentionally deferred beyond this prototype plan, matching the spec’s phased rollout.
- **Placeholder scan:** No `TBD`, `TODO`, or hand-wavy “handle later” steps are left in the tasks. Each code change step includes concrete paths and code.
- **Type consistency:** `GameState`, `summary`, `facts`, `activeEventId`, and the navigation fields are named consistently across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-romance-map-chat-game-implementation.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Given you asked me to start directly and没有要求子代理，我会默认按 **Inline Execution** 继续。
