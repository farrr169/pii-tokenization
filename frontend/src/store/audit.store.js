import { create } from 'zustand'

export const useAuditStore = create((set) => ({
  logs: [],
  addLog: ({ module, activity, description, user }) => {
    set(s => ({
      logs: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          user: user ? { full_name: user.full_name } : { full_name: 'System' },
          module_name: module,
          activity,
          description,
          created_at: new Date().toISOString(),
        },
        ...s.logs,
      ].slice(0, 300),
    }))
  },
  clear: () => set({ logs: [] }),
}))
