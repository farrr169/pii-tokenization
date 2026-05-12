import { create } from 'zustand'
import { useAuthStore } from './auth.store'

export const INIT_PERMISSIONS = {
  Admin:    { tokenization: ['execute', 'read'], pii_types: ['create', 'read', 'update', 'delete'], audit_logs: ['read'], settings: ['read', 'update'], users: ['create', 'read', 'update', 'delete'] },
  Operator: { tokenization: ['execute', 'read'], pii_types: ['read'],                               audit_logs: [],        settings: [],                users: [] },
  Auditor:  { tokenization: ['read'],            pii_types: ['read'],                               audit_logs: ['read'], settings: ['read'],           users: ['read'] },
  Viewer:   { tokenization: ['read'],            pii_types: ['read'],                               audit_logs: [],        settings: ['read'],           users: [] },
}

export const usePermissionsStore = create(set => ({
  matrix: INIT_PERMISSIONS,
  save: (matrix) => set({ matrix }),
}))

export function useHasPermission() {
  const user = useAuthStore(s => s.user)
  const matrix = usePermissionsStore(s => s.matrix)
  return (module, action) => {
    if (!user) return false
    if (user.role === 'Admin') return true
    // Gunakan permissions dari backend (di-set saat login) sebagai sumber utama
    if (user.permissions?.length > 0) {
      return user.permissions.some(p => p.module === module && p.action === action)
    }
    // Fallback ke matrix statis jika backend belum menseed permissions
    return matrix[user.role]?.[module]?.includes(action) ?? false
  }
}
