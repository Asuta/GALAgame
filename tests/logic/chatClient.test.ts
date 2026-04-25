import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildChatRequest,
  buildEventImagePromptRequest,
  buildEventPlanRequest,
  buildEventTimeSettlementRequest,
  buildFallbackSceneEvent,
  buildFallbackTimeSettlement,
  buildTaskImagePromptRequest,
  buildTaskManualRequest,
  buildTaskResultRequest,
  buildTaskSegmentRequest,
  extractAssistantReply,
  parseTaskSegment,
  parseTaskSettlement,
  parseEventTimeSettlement,
  parsePlannedSceneEvent,
  parseSseDelta,
  requestEventImagePrompt,
  requestEventTimeSettlement,
  requestGeneratedSceneEvent,
  requestStoryReply,
  requestStoryReplyStream,
  requestTaskImagePrompt,
  stripEventEndMarker
} from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';
import { createInitialState, startTask } from '../../src/state/store';

const CHAT_ENV = {
  VITE_CHAT_COMPLETIONS_URL: 'https://example.com/v1/chat/completions',
  VITE_CHAT_API_KEY: 'test-key',
  VITE_CHAT_MODEL: 'deepseek-chat'
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

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

  it('builds a chat request that condenses current context into an image prompt', () => {
    const payload = buildEventImagePromptRequest({
      model: 'deepseek-chat',
      systemPrompt: '你是生图提示词导演。',
      locationLabel: '学校 / 教室',
      eventTitle: '放学后的空教室',
      castName: '林澄',
      eventPhase: 'build_up',
      sceneDescription: '傍晚的教室里只剩窗边座位。',
      openingState: '她一个人坐在窗边。',
      eventFacts: ['林澄把练习册合上'],
      memorySummary: '你们刚建立一点信任。',
      memoryFacts: ['她不太愿意直接说出心事'],
      transcript: ['你：你看起来有点心事。', '林澄：只是有点冷。']
    });

    expect(payload.model).toBe('deepseek-chat');
    expect(payload.messages[0].content).toContain('只输出最终生图提示词');
    expect(payload.messages[1].content).toContain('学校 / 教室');
    expect(payload.messages[1].content).toContain('林澄把练习册合上');
    expect(payload.messages[1].content).toContain('你：你看起来有点心事。');
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

  it('builds task result, segment, and manual takeover requests with task constraints', () => {
    let state = createInitialState();
    state = startTask(state, {
      content: '晨跑一小时',
      startMinutes: 360,
      endMinutes: 420,
      executionMode: 'process',
      segmentMinutes: 10
    });
    const task = state.task.activeTask!;

    const resultPayload = buildTaskResultRequest({
      model: 'deepseek-chat',
      systemPrompt: '你是任务结算器。',
      task,
      timeLabel: '清晨 06:00',
      memorySummary: '故事刚开始。',
      memoryFacts: [],
      locationLabel: '城市'
    });
    const segmentPayload = buildTaskSegmentRequest({
      model: 'deepseek-chat',
      systemPrompt: '你是任务过程推进器。',
      task,
      fromLabel: '06:00',
      toLabel: '06:10',
      memorySummary: '故事刚开始。',
      memoryFacts: [],
      locationLabel: '城市'
    });
    const manualPayload = buildTaskManualRequest({
      model: 'deepseek-chat',
      systemPrompt: '你是任务托管主持人。',
      task,
      playerInput: '我放慢脚步看看是谁。',
      memorySummary: '故事刚开始。',
      memoryFacts: [],
      locationLabel: '城市'
    });

    expect(resultPayload.messages[1].content).toContain('晨跑一小时');
    expect(resultPayload.messages[1].content).toContain('忽略细节过程');
    expect(segmentPayload.messages[0].content).toContain('突发情况只能作为任务过程的一部分');
    expect(segmentPayload.messages[1].content).toContain('06:00 到 06:10');
    expect(manualPayload.stream).toBe(true);
    expect(manualPayload.messages[1].content).toContain('我放慢脚步看看是谁。');
    expect(manualPayload.messages[0].content).toContain('不要把突发情况升级为独立事件');
  });

  it('builds a task image prompt request from current task progress', () => {
    let state = createInitialState();
    state = startTask(state, {
      content: '去主题咖啡店玩一玩',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      executionMode: 'process',
      segmentMinutes: 10
    });
    state = {
      ...state,
      task: {
        ...state.task,
        activeTask: {
          ...state.task.activeTask!,
          segments: [
            {
              id: 'segment-1',
              fromLabel: '18:00',
              toLabel: '18:10',
              content: '你靠窗坐下，翻开菜单。',
              complication: '手机收到一条陌生提醒',
              attentionLevel: 'medium'
            }
          ],
          facts: ['玩家坐在窗边']
        }
      }
    };

    const payload = buildTaskImagePromptRequest({
      model: 'deepseek-chat',
      systemPrompt: '你是任务生图提示词导演。',
      task: state.task.activeTask!,
      locationLabel: '城市',
      memorySummary: '玩家正在安排自己的行动。',
      memoryFacts: ['咖啡店里播放着轻快的歌']
    });

    expect(payload.messages[0].content).toContain('只输出最终生图提示词');
    expect(payload.messages[0].content).toContain('当前任务进度');
    expect(payload.messages[1].content).toContain('去主题咖啡店玩一玩');
    expect(payload.messages[1].content).toContain('你靠窗坐下');
    expect(payload.messages[1].content).toContain('手机收到一条陌生提醒');
    expect(payload.messages[1].content).toContain('长度控制在 300 字以内');
  });

  it('parses task settlement and process segment responses', () => {
    let state = createInitialState();
    state = startTask(state, {
      content: '复习数学',
      startMinutes: 1200,
      endMinutes: 1260,
      executionMode: 'process',
      segmentMinutes: 10
    });
    const task = state.task.activeTask!;
    const settlement = parseTaskSettlement('{"summary":"你完成了一小时复习。","facts":["复习了错题","状态更稳定"]}');
    const segment = parseTaskSegment({
      task,
      fromLabel: '20:00',
      toLabel: '20:10',
      responseText: '{"content":"你先翻开错题本。","complication":"手机亮了一下","attentionLevel":"high"}'
    });

    expect(settlement.summary).toContain('完成了一小时复习');
    expect(settlement.facts).toContain('复习了错题');
    expect(segment.content).toContain('错题本');
    expect(segment.complication).toBe('手机亮了一下');
    expect(segment.attentionLevel).toBe('high');
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

  it('throws when story reply is requested without model config', async () => {
    vi.stubEnv('VITE_CHAT_COMPLETIONS_URL', '');
    vi.stubEnv('VITE_CHAT_API_KEY', '');
    vi.stubEnv('VITE_CHAT_MODEL', '');

    await expect(
      requestStoryReply({
        characterProfile: '角色名：林澄\n性别：女\n身份：女高中生',
        memorySummary: '你已经认识林澄。',
        memoryFacts: ['她最近经常去医院'],
        locationLabel: '学校 / 教室',
        eventTitle: '放学后的空教室',
        castName: '林澄',
        transcript: [],
        playerInput: '你好。'
      })
    ).rejects.toThrow('缺少模型配置');
  });

  it('throws when event planning request fails', async () => {
    vi.stubEnv('VITE_CHAT_COMPLETIONS_URL', CHAT_ENV.VITE_CHAT_COMPLETIONS_URL);
    vi.stubEnv('VITE_CHAT_API_KEY', CHAT_ENV.VITE_CHAT_API_KEY);
    vi.stubEnv('VITE_CHAT_MODEL', CHAT_ENV.VITE_CHAT_MODEL);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('unauthorized', { status: 401, statusText: 'Unauthorized' }))
    );

    await expect(
      requestGeneratedSceneEvent({
        model: 'gpt-4.1-mini',
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        timeLabel: '傍晚 18:00',
        timeSlot: 'evening',
        memorySummary: '你刚开始在这座城市里探索。',
        memoryFacts: [],
        worldRevision: 0
      })
    ).rejects.toThrow('模型请求失败：401');
  });

  it('throws when event settlement request fails', async () => {
    vi.stubEnv('VITE_CHAT_COMPLETIONS_URL', CHAT_ENV.VITE_CHAT_COMPLETIONS_URL);
    vi.stubEnv('VITE_CHAT_API_KEY', CHAT_ENV.VITE_CHAT_API_KEY);
    vi.stubEnv('VITE_CHAT_MODEL', CHAT_ENV.VITE_CHAT_MODEL);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500, statusText: 'Server Error' })));

    await expect(
      requestEventTimeSettlement({
        model: 'gpt-4.1-mini',
        startTimeLabel: '傍晚 18:00',
        locationLabel: '学校 / 教室',
        eventTitle: '放学后的空教室',
        transcript: ['你：今天怎么还没回家？', '林澄：我想再坐一会儿。'],
        eventFacts: ['剧情阶段进入build_up']
      })
    ).rejects.toThrow('模型请求失败：500');
  });

  it('requests a condensed event image prompt from the chat model', async () => {
    vi.stubEnv('VITE_CHAT_COMPLETIONS_URL', CHAT_ENV.VITE_CHAT_COMPLETIONS_URL);
    vi.stubEnv('VITE_CHAT_API_KEY', CHAT_ENV.VITE_CHAT_API_KEY);
    vi.stubEnv('VITE_CHAT_MODEL', CHAT_ENV.VITE_CHAT_MODEL);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '竖屏视觉小说 CG，林澄在傍晚教室窗边合上练习册。' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    );

    await expect(
      requestEventImagePrompt({
        model: 'deepseek-chat',
        locationLabel: '学校 / 教室',
        eventTitle: '放学后的空教室',
        castName: '林澄',
        eventPhase: 'build_up',
        sceneDescription: '傍晚的教室里只剩窗边座位。',
        openingState: '她一个人坐在窗边。',
        eventFacts: ['林澄把练习册合上'],
        memorySummary: '你们刚建立一点信任。',
        memoryFacts: [],
        transcript: ['你：你看起来有点心事。']
      })
    ).resolves.toContain('林澄');
  });

  it('requests a task image prompt from the chat model', async () => {
    vi.stubEnv('VITE_CHAT_COMPLETIONS_URL', CHAT_ENV.VITE_CHAT_COMPLETIONS_URL);
    vi.stubEnv('VITE_CHAT_API_KEY', CHAT_ENV.VITE_CHAT_API_KEY);
    vi.stubEnv('VITE_CHAT_MODEL', CHAT_ENV.VITE_CHAT_MODEL);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '竖屏视觉小说 CG，玩家坐在主题咖啡店窗边查看手机。' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    );
    const state = startTask(createInitialState(), {
      content: '去主题咖啡店玩一玩',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      executionMode: 'process',
      segmentMinutes: 10
    });

    await expect(
      requestTaskImagePrompt({
        model: 'deepseek-chat',
        task: state.task.activeTask!,
        locationLabel: '城市',
        memorySummary: '玩家正在安排自己的行动。',
        memoryFacts: []
      })
    ).resolves.toContain('主题咖啡店');
  });

  it('throws when streaming reply request fails', async () => {
    vi.stubEnv('VITE_CHAT_COMPLETIONS_URL', CHAT_ENV.VITE_CHAT_COMPLETIONS_URL);
    vi.stubEnv('VITE_CHAT_API_KEY', CHAT_ENV.VITE_CHAT_API_KEY);
    vi.stubEnv('VITE_CHAT_MODEL', CHAT_ENV.VITE_CHAT_MODEL);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 429, statusText: 'Too Many Requests' })));

    const stream = requestStoryReplyStream({
      characterProfile: '角色名：林澄\n性别：女\n身份：女高中生',
      memorySummary: '你已经认识林澄。',
      memoryFacts: ['她最近经常去医院'],
      locationLabel: '学校 / 教室',
      eventTitle: '放学后的空教室',
      castName: '林澄',
      transcript: [],
      playerInput: '你好。'
    });

    await expect(stream.next()).rejects.toThrow('模型请求失败：429');
  });
});
