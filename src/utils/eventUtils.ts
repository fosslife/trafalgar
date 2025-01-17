type EventCallback = (data: any) => void;

const eventListeners: { [key: string]: Set<EventCallback> } = {};

export function subscribe(event: string, callback: EventCallback) {
  if (!eventListeners[event]) {
    eventListeners[event] = new Set();
  }
  eventListeners[event].add(callback);

  return () => {
    eventListeners[event].delete(callback);
  };
}

export function emit(event: string, data: any) {
  if (eventListeners[event]) {
    eventListeners[event].forEach((callback) => callback(data));
  }
}
