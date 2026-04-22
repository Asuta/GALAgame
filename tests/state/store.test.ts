import { describe, expect, it } from 'vitest';
import {
  appendStreamingReply,
  createInitialState,
  endEvent,
  enterRegion,
  enterScene,
  finishStreamingReply,
  markEventReadyToEnd,
  setStreamCharsPerSecond,
  startEvent,
  startStreamingReply,
  toggleSettingsPanel
} from '../../src/state/store';

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

  it('streams a reply into transcript when complete', () => {
    let state = createInitialState();

    state = startEvent(state, 'after-school-classroom');
    state = startStreamingReply(state, '林澄');
    state = appendStreamingReply(state, '她');
    state = appendStreamingReply(state, '笑了');

    expect(state.event.streamingReply).toBe('她笑了');
    expect(state.ui.isSending).toBe(true);

    state = finishStreamingReply(state);

    expect(state.event.transcript[0]?.content).toBe('她笑了');
    expect(state.event.transcript[0]?.label).toBe('林澄');
    expect(state.event.streamingReply).toBe('');
    expect(state.ui.isSending).toBe(false);
  });

  it('marks event as ready to end when model emits finish signal', () => {
    let state = createInitialState();
    state = startEvent(state, 'after-school-classroom');
    state = markEventReadyToEnd(state);

    expect(state.event.readyToEnd).toBe(true);
  });

  it('toggles settings panel and updates stream speed limit', () => {
    let state = createInitialState();

    expect(state.ui.isSettingsOpen).toBe(false);
    expect(state.settings.streamCharsPerSecond).toBe(8);

    state = toggleSettingsPanel(state);
    expect(state.ui.isSettingsOpen).toBe(true);

    state = setStreamCharsPerSecond(state, 1);
    expect(state.settings.streamCharsPerSecond).toBe(1);
  });
});
