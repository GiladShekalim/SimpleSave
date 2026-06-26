import '@testing-library/jest-dom'

// Node 22 declares localStorage as undefined (Web Storage behind --localstorage-file flag),
// which shadows jsdom's implementation. Provide a working in-memory shim.
const store = new Map()
const localStorageShim = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size },
  key: (i) => [...store.keys()][i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageShim,
  writable: true,
  configurable: true,
})
