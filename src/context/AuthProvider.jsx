import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthContext } from './AuthContext'
import { supabase } from '../services/supabase'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const profileRequestId = useRef(0)
  const authRequestId = useRef(0)

  const loadProfile = useCallback(async (user) => {
    const requestId = ++profileRequestId.current

    if (!user) {
      setProfile(null)
      setProfileError(null)
      return
    }

    setProfileError(null)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, loja_id, nome, email, role, ativo')
      .eq('id', user.id)
      .maybeSingle()

    if (requestId !== profileRequestId.current) return

    if (error) {
      setProfile(null)
      setProfileError(error)
      throw error
    }

    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    let active = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active || event === 'INITIAL_SESSION') return
      const requestId = ++authRequestId.current
      setSession(nextSession)
      if (!nextSession) {
        profileRequestId.current += 1
        setProfile(null)
        setProfileError(null)
        setIsLoading(false)
      } else {
        setIsLoading(true)
        setProfile(null)
        Promise.resolve()
          .then(() => loadProfile(nextSession.user))
          .catch((error) => {
            if (active) setProfileError(error)
          })
          .finally(() => {
            if (active && authRequestId.current === requestId) setIsLoading(false)
          })
      }
    })

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return
      if (error) {
        setProfileError(error)
        setIsLoading(false)
        return
      }

      const requestId = ++authRequestId.current
      setSession(data.session)
      setIsLoading(true)
      await loadProfile(data.session?.user ?? null)
      if (active && authRequestId.current === requestId) setIsLoading(false)
    }).catch((error) => {
      if (!active) return
      setProfileError(error)
      setIsLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const retryProfile = useCallback(() => {
    setIsLoading(true)
    return loadProfile(session?.user ?? null)
      .catch((error) => {
        setProfileError(error)
        return null
      })
      .finally(() => setIsLoading(false))
  }, [loadProfile, session])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        profileError,
        retryProfile,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
