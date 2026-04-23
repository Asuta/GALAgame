import { describe, expect, it } from 'vitest';
import {
  buildChatRequest,
  buildEventPlanRequest,
  buildEventTimeSettlementRequest,
  buildFallbackSceneEvent,
  buildFallbackTimeSettlement,
  extractAssistantReply,
  parseEventTimeSettlement,
  parsePlannedSceneEvent,
  parseSseDelta,
  stripEventEndMarker
} from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';

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
    expect(payload.messages[0].content).toContain('使用“旁白：...”和“角色名：...”这种格式组织内容');
    expect(payload.messages[0].content).toContain('保持现代恋爱文字冒险的细腻语气');
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
    expect(payload.messages[1].content).toContain('请用一小段旁白和角色对白完成收束');
    expect(payload.messages[1].content).toContain('[EVENT_END]');
  });

  it('builds a planner request that includes time, scene mood, and overlimit trigger guidance', () => {
    const payload = buildEventPlanRequest({
      model: 'gpt-4.1-mini',
      systemPrompt: '你是事件编剧。',
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      timeLabel: '傍晚 18:00',
      timeSlot: 'evening',
      memorySummary: '你刚开始在这座城市里探索。',
      memoryFacts: []
    });

    expect(payload.messages[1].content).toContain('傍晚 18:00');
    expect(payload.messages[1].content).toContain('超限触发');
    expect(payload.messages[1].content).toContain('学校 / 教室');
  });

  it('parses a JSON planned event response into a runtime event instance', () => {
    const planned = parsePlannedSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      timeLabel: '傍晚 18:00',
      timeSlot: 'evening',
      responseText: JSON.stringify({
        title: '放学后的空教室',
        cast: ['林澄'],
        premise: '放学后的教室里，她像是在等一个不该来的人。',
        openingState: '她没有立刻看你，只是望着窗外。',
        buildUpGoal: '让玩家感觉到她今晚有心事。',
        overlimitTrigger: '对话进行两轮后，门外突然传来急促脚步声。',
        resolutionDirection: '这一幕先收在心事被打断的悬念里。',
        suspenseThreads: ['她在等谁', '门外的人是谁']
      })
    });

    expect(planned.title).toBe('放学后的空教室');
    expect(planned.currentPhase).toBe('opening');
    expect(planned.suspenseThreads).toContain('门外的人是谁');
  });

  it('builds a deterministic fallback event when planner output is missing', () => {
    const planned = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'ward')!,
      locationLabel: '医院 / 病房',
      timeLabel: '深夜 01:00',
      timeSlot: 'late_night',
      memorySummary: '你已经认识林澄。',
      memoryFacts: ['她最近经常去医院']
    });

    expect(planned.sceneId).toBe('ward');
    expect(planned.overlimitTrigger.length).toBeGreaterThan(0);
    expect(planned.snapshot.timeSlot).toBe('late_night');
  });

  it('builds a settlement request that asks for elapsed minutes after an event', () => {
    const payload = buildEventTimeSettlementRequest({
      model: 'gpt-4.1-mini',
      systemPrompt: '你是时间结算器。',
      startTimeLabel: '傍晚 18:00',
      locationLabel: '学校 / 教室',
      eventTitle: '放学后的空教室',
      transcript: ['你：今天怎么还没回家？', '林澄：我想再坐一会儿。'],
      eventFacts: ['剧情阶段进入build_up', '玩家在学校 / 教室推进了放学后的空教室']
    });

    expect(payload.messages[1].content).toContain('傍晚 18:00');
    expect(payload.messages[1].content).toContain('耗时分钟');
    expect(payload.messages[1].content).toContain('放学后的空教室');
  });

  it('parses settled event minutes from json', () => {
    const settlement = parseEventTimeSettlement('{"minutesElapsed":45,"summary":"这次交流拉长到了晚饭前后。"}');

    expect(settlement.minutesElapsed).toBe(45);
    expect(settlement.summary).toContain('晚饭前后');
  });

  it('falls back to a longer duration when transcript is dense and event phases advanced', () => {
    const settlement = buildFallbackTimeSettlement({
      transcript: [
        '你：今天怎么还没回家？',
        '林澄：我还想再坐一会儿。',
        '你：是不是发生什么事了？',
        '旁白：门外忽然传来一阵急促脚步声。'
      ],
      eventFacts: ['剧情阶段进入build_up', '剧情阶段进入overlimit', '玩家在学校 / 教室推进了放学后的空教室']
    });

    expect(settlement.minutesElapsed).toBeGreaterThanOrEqual(45);
  });
});
