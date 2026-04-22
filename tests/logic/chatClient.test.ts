import { describe, expect, it } from 'vitest';
import { buildChatRequest, extractAssistantReply, parseSseDelta, stripEventEndMarker } from '../../src/logic/chatClient';

describe('chatClient helpers', () => {
  it('builds an OpenAI-compatible chat payload', () => {
    const payload = buildChatRequest({
      model: 'deepseek-reasoner',
      systemPrompt: '你是恋爱剧情主持人。',
      characterProfile: '角色名：林澄\n性别：女\n身份：女高中生',
      memorySummary: '你已经认识林澄。',
      memoryFacts: ['她最近经常去医院'],
      locationLabel: '学校 / 教室',
      eventTitle: '放学后的空教室',
      castName: '林澄',
      transcript: ['你：你今天还不回家吗？'],
      playerInput: '我走近一步，看着她。'
    });

    expect(payload.model).toBe('deepseek-reasoner');
    expect(payload.messages[0].role).toBe('system');
    expect(payload.messages[1].content).toContain('学校 / 教室');
    expect(payload.messages[1].content).toContain('林澄');
    expect(payload.messages[0].content).toContain('中文小说片段');
    expect(payload.messages[0].content).toContain('对白自然地融入叙述');
    expect(payload.messages[0].content).toContain('不要代替玩家');
    expect(payload.messages[1].content).toContain('性别：女');
  });

  it('extracts assistant reply text from chat completion response', () => {
    const text = extractAssistantReply({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '她抬头看着你，像是终于下定了决心。'
          }
        }
      ]
    });

    expect(text).toContain('她抬头看着你');
  });

  it('uses the provided model name as request target', () => {
    const payload = buildChatRequest({
      model: 'gpt-4o-mini',
      systemPrompt: '你是恋爱剧情主持人。',
      characterProfile: '角色名：林澄\n性别：女\n身份：女高中生',
      memorySummary: '你已经认识林澄。',
      memoryFacts: ['她最近经常去医院'],
      locationLabel: '学校 / 教室',
      eventTitle: '放学后的空教室',
      castName: '林澄',
      transcript: [],
      playerInput: '你好。'
    });

    expect(payload.model).toBe('gpt-4o-mini');
  });

  it('parses OpenAI-compatible streaming delta lines', () => {
    const delta = parseSseDelta('data: {"choices":[{"delta":{"content":"她"}}]}');

    expect(delta).toBe('她');
  });

  it('ignores stream done marker', () => {
    const delta = parseSseDelta('data: [DONE]');

    expect(delta).toBeNull();
  });

  it('strips hidden event end marker from assistant text', () => {
    const text = stripEventEndMarker('旁白：她轻轻点了点头。[EVENT_END]');

    expect(text.cleanedText).toContain('旁白：她轻轻点了点头。');
    expect(text.shouldEndEvent).toBe(true);
  });

  it('builds an ending-intent prompt when player wants to close the scene', () => {
    const payload = buildChatRequest({
      model: 'deepseek-chat',
      systemPrompt: '你是恋爱剧情主持人。',
      characterProfile: '角色名：林澄\n性别：女\n身份：女高中生',
      memorySummary: '你和林澄的气氛正在变得柔和。',
      memoryFacts: ['她对你已经没有最初那样戒备'],
      locationLabel: '学校 / 教室',
      eventTitle: '放学后的空教室',
      castName: '林澄',
      transcript: ['你：那我先走了。'],
      playerInput: '请基于当前气氛，自然地把这一幕收尾。',
      intent: 'end_event'
    });

    expect(payload.messages[1].content).toContain('玩家准备结束当前事件');
    expect(payload.messages[1].content).toContain('像小说收束一幕');
    expect(payload.messages[1].content).toContain('[EVENT_END]');
  });
});
