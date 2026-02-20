const _listeners = {};

const EventBridge = {
  on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    (_listeners[event] || []).slice().forEach(cb => cb(data));
  },

  clear(event) {
    if (event) delete _listeners[event];
    else Object.keys(_listeners).forEach(k => delete _listeners[k]);
  },
};

export default EventBridge;
