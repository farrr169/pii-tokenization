import { create } from 'zustand'

export const useResultsStore = create(set => ({
  results: [],
  history: [],
  save:       (item) => set(s => ({ results: [{ ...item, savedAt: new Date(), detokenized: false }, ...s.results] })),
  addHistory: (item) => set(s => ({ history: [item, ...s.history].slice(0, 10) })),
  detokenize: (id)   => set(s => ({ results: s.results.map(r => r.id === id ? { ...r, detokenized: true } : r) })),
  clear:      ()     => set({ results: [] }),
  clearHistory: ()   => set({ history: [] }),
}))
