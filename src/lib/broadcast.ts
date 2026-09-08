const CHANNEL_NAME = 'bonus_buy_tracker_channel';

// Единственный экземпляр канала для всех типов сообщений
export const broadcast = typeof window !== 'undefined'
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

/**
 * Уведомление об обновлении данных стрима (существующий функционал)
 */
export function notifyChange(streamId: string): void {
  if (broadcast) {
    broadcast.postMessage({ type: 'UPDATE_STREAM', streamId });
  }
}

/**
 * Отправка произвольного сообщения/события в оверлей (новое)
 */
export function broadcastMessage<T = any>(type: string, payload: T): void {
  if (broadcast) {
    broadcast.postMessage({ type, payload });
  }
}

/**
 * Подписка на конкретное событие (новое)
 */
export function subscribeToBroadcast<T = any>(
  type: string,
  callback: (payload: T) => void
): () => void {
  if (!broadcast) return () => { };

  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === type) {
      callback(event.data.payload);
    }
  };

  broadcast.addEventListener('message', handleMessage);

  return () => {
    broadcast.removeEventListener('message', handleMessage);
  };
}