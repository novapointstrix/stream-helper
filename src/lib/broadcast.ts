const CHANNEL_NAME = 'bonus_buy_tracker_channel';
export const broadcast = new BroadcastChannel(CHANNEL_NAME);

export function notifyChange(streamId: string) {
  broadcast.postMessage({ type: 'UPDATE_STREAM', streamId });
}