import { create } from 'zustand'

const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

export const useAuthStore = create((set) => ({
  user: getStoredUser(),
  token: localStorage.getItem('token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  hasPermission: (action, module) => {
    const user = getStoredUser()
    if (!user) return false
    if (user.role === 'Admin') return true
    return user.permissions?.some(p => p.action === action && p.module === module) ?? false
  }
}))
