import { describe, expect, it } from 'vitest';
import { createAppMarkup } from '../../src/ui/templates';
import { createInitialState, startEvent } from '../../src/state/store';

describe('input behavior', () => {
  it('renders an enabled textarea during events so Enter can be handled', () => {
    let state = createInitialState();
    state = startEvent(state, 'after-school-classroom');

    document.body.innerHTML = createAppMarkup(state);
    const textarea = document.querySelector('textarea');

    expect(textarea).not.toBeNull();
    expect(textarea?.hasAttribute('disabled')).toBe(false);
  });
});
