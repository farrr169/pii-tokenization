import { create } from 'zustand'
import { auditApi } from '../api'

export const useAuditStore = create((set) => ({
  logs: [],

  addLog: ({ module, activity, description }) => {
    // Persist to backend (fire-and-forget, non-blocking)
    auditApi.write({ module_name: module, activity, description }).catch(() => {});
  },

  clear: () => set({ logs: [] }),
}))
