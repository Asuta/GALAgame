# Continue Story Button Design

## Goal

Add a `继续剧情` button to the in-event action row so the player can advance the current event without typing a reply. The AI should generate the next small beat of narration and dialogue, then stop again in a state that invites player response.

## Scope

- Show `继续剧情` only when an event is actively in progress.
- Keep the existing `待开场` behavior unchanged.
- Reuse the current event-turn pipeline instead of creating a separate generation path.
- Preserve existing streaming, phase advancement, event ending, memory updates, and time settlement behavior.

## UI Behavior

- In `事件中`, the action row becomes: `设置` / `继续剧情` / `结束当前事件` / `发送`.
- The new button is hidden outside active events.
- The button is disabled while a reply is already streaming.

## Story Progression Behavior

- Clicking `继续剧情` triggers the same event turn flow used by normal sending.
- The request still uses the existing `continue` intent.
- Instead of player-authored text, the flow passes a fixed continuation prompt that means:
  the player is temporarily silent, waiting, observing, or leaving space for the scene to continue naturally.
- The model should still generate only one small step forward and stop at a point that returns agency to the player.

## Implementation Notes

- Add a dedicated action button in the game template for active events only.
- Add a UI binding for the new action.
- Reuse `runEventTurn` with a fixed continuation input string rather than adding a new intent.
- Keep textarea send behavior unchanged.

## Testing

- Render test: `继续剧情` appears during active events.
- Render test: `继续剧情` does not appear in prepared or explore states.
- Binding test: clicking `继续剧情` during an active event triggers story reply generation.
- Binding test: the button is not usable while sending is already in progress.
