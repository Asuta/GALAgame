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
