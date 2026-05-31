import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, User, ShieldCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // If user is already logged in, redirect directly to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })
  }, [navigate])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      if (isRegister) {
        // Register flow
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        if (error) throw error
        
        // Notify user about confirmation email if applicable, or try to log in
        alert('Registrasi berhasil! Silakan periksa kotak masuk email Anda untuk verifikasi link.')
        setIsRegister(false)
      } else {
        // Login flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md glass-card p-8 rounded-3xl relative z-10 border border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            {isRegister ? 'Create Your Account' : 'Welcome to DebtZero'}
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 uppercase font-bold tracking-wider">
            Zeth Finance Management System
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-xl mt-6 transition-all duration-200 shadow-lg shadow-purple-600/10 hover:shadow-purple-600/25 flex items-center justify-center text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Processing...
              </span>
            ) : (
              isRegister ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle link */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-xs">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                setErrorMessage('')
              }}
              className="text-purple-400 hover:text-purple-300 font-bold hover:underline transition-all"
            >
              {isRegister ? 'Sign In here' : 'Sign Up here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
