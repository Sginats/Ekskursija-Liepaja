const STORE_KEY = 'eksk_session_v1';

function _load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function _save(data) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {}
}

export function getLockedIndex(locationId, slot, maxLen) {
  const store = _load();
  const key = `${locationId}:${slot}`;
  if (store[key] !== undefined) return store[key];
  const idx = Math.floor(Math.random() * maxLen);
  store[key] = idx;
  _save(store);
  return idx;
}

export function clearSession() {
  try {
    sessionStorage.removeItem(STORE_KEY);
  } catch {}
}

export function getSessionId() {
  const store = _load();
  if (!store._id) {
    const arr = new Uint32Array(2);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(arr);
    else { arr[0] = (Math.random() * 0xffffffff) >>> 0; arr[1] = (Math.random() * 0xffffffff) >>> 0; }
    store._id = arr[0].toString(36) + arr[1].toString(36);
    _save(store);
  }
  return store._id;
}
