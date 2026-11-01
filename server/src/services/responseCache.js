/** Small bounded TTL cache for repeat AI requests. Per-process only; no student data is persisted here. */
export function createResponseCache({ ttlMs = 5 * 60_000, maxEntries = 200, now = () => Date.now() } = {}) {
  const entries = new Map();
  return {
    get(key) { const item = entries.get(key); if (!item) return undefined; if (item.expiresAt <= now()) { entries.delete(key); return undefined; } return structuredClone(item.value); },
    set(key, value) { entries.delete(key); entries.set(key, { value: structuredClone(value), expiresAt: now() + ttlMs }); while (entries.size > maxEntries) entries.delete(entries.keys().next().value); },
    get size() { return entries.size; },
    clear() { entries.clear(); },
  };
}
