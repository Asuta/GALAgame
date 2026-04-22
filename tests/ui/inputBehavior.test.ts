import { describe, expect, it } from 'vitest';
import { createAppMarkup } from '../../src/ui/templates';
import { createInitialState, startEvent } from '../../src/state/store';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';

describe('input behavior', () => {
  it('renders an enabled textarea during events so Enter can be handled', () => {
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

    document.body.innerHTML = createAppMarkup(state);
    const textarea = document.querySelector('textarea');

    expect(textarea).not.toBeNull();
    expect(textarea?.hasAttribute('disabled')).toBe(false);
  });
});
