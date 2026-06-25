import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'

const AuthContext = createContext(null)

// ─── DEV TOGGLE ─────────────────────────────────────────────────────────────
// When VITE_AUTH_BYPASS=true (set in frontend/.env.local) the app skips the
// whole Firebase login/registration flow and signs you in as a fake user, so
// every protected page is reachable without registering.
// Flip it off (or remove it) to restore the real registration flow — no other
// code needs to change.
const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'
// Role for the fake user. Routes are gated by role (client / advisor / admin),
// so set this to whichever area you want to browse. Defaults to 'client'.
const AUTH_BYPASS_ROLE = import.meta.env.VITE_AUTH_BYPASS_ROLE || 'client'

const MOCK_USER = {
  id: 'dev-user',
  full_name: 'משתמש פיתוח',
  email: 'dev@simplesave.local',
  role: AUTH_BYPASS_ROLE,
  firebaseUid: 'dev-uid',
  getToken: async () => 'dev-token',
}
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [user, setUser] = useState(AUTH_BYPASS ? MOCK_USER : null)   // our DB user (has role, full_name, etc.)
  const [loading, setLoading] = useState(!AUTH_BYPASS)

  useEffect(() => {
    if (AUTH_BYPASS) return   // skip Firebase entirely in bypass mode

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken()
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setUser({ ...data, firebaseUid: fbUser.uid, getToken: () => fbUser.getIdToken() })
          } else {
            setUser(null)
          }
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
