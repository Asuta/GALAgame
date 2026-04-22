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
