import React, { useState, useEffect } from 'react'
import { LogOut, User, Bell, AlertCircle, Calendar, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ShieldLogo } from './ShieldLogo'

interface NavbarProps {
  userEmail?: string
  userName?: string
  dsrWarning?: boolean
  onLogout: () => void
  toggleMobileSidebar: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  userEmail,
  userName,
  dsrWarning = false,
  onLogout,
  toggleMobileSidebar,
}) => {
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifLogs, setNotifLogs] = useState<any[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)

  // Fetch telegram notifications log from database
  const loadNotifLogs = async () => {
    setLoadingNotifs(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications_log')
        .select('*, debts(creditor_name)')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(5)

      if (error) throw error
      if (data) setNotifLogs(data)
    } catch (err) {
      console.error('Gagal mengambil log notifikasi:', err)
    } finally {
      setLoadingNotifs(false)
    }
  }

  useEffect(() => {
    if (showNotif) {
      loadNotifLogs()
    }
  }, [showNotif])

  return (
    <nav className="glass-panel sticky top-0 z-40 w-full border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      {/* Mobile Toggle & Branding */}
      <div className="flex items-center gap-4">
        <button
          id="mobile-sidebar-toggle"
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-emerald-600">
            BebasHutang
          </span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            by Zeth Finance
          </span>
        </div>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-4 relative">
        {/* DSR Alert indicator */}
        {dsrWarning && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium animate-pulse">
            <ShieldAlert size={14} />
            <span>Peringatan DSR Tinggi</span>
          </div>
        )}

        {/* Notifications mock icon */}
        <div className="relative">
          <button
            id="notification-btn"
            onClick={() => {
              setShowNotif(!showNotif)
              setShowProfile(false)
            }}
            className="p-2 rounded-lg text-slate-505 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer"
            aria-label="View Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          {/* Notifications Dropdown Popover */}
          {showNotif && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Log Reminder Telegram</span>
                <button 
                  onClick={() => setShowNotif(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-800 font-bold"
                >
                  Tutup
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {loadingNotifs ? (
                  <p className="text-[11px] text-slate-500 text-center py-4">Memuat log...</p>
                ) : notifLogs.length === 0 ? (
                  <div className="text-center py-4 space-y-1">
                    <AlertCircle className="mx-auto text-slate-300" size={20} />
                    <p className="text-[11px] text-slate-550">Belum ada reminder terkirim</p>
                  </div>
                ) : (
                  notifLogs.map((log) => (
                    <div key={log.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-slate-400">
                        <span className="font-bold uppercase text-emerald-600">Reminder {log.type}</span>
                        <span>{new Date(log.sent_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        Tagihan di <strong className="text-slate-900">{log.debts?.creditor_name || 'Kreditur'}</strong> berhasil dikirim ke Telegram. Status: <span className="text-emerald-600 font-bold">{log.status}</span>.
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown / info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 relative">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-800">
              {userName || 'Zeth Member'}
            </span>
            <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
              {userEmail}
            </span>
          </div>
          
          <button
            onClick={() => {
              setShowProfile(!showProfile)
              setShowNotif(false)
            }}
            className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md cursor-pointer hover:bg-emerald-700 transition-colors"
          >
            {userName ? userName.charAt(0).toUpperCase() : <User size={14} />}
          </button>

          {/* Profile Dropdown Popover */}
          {showProfile && (
            <div className="absolute right-0 top-11 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-3">
                <div className="pb-3 border-b border-slate-200 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-lg font-bold mb-2">
                    {userName ? userName.charAt(0).toUpperCase() : 'Z'}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{userName || 'Zeth Member'}</h3>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{userEmail}</p>
                </div>
                
                <div className="space-y-2 text-[11px] text-slate-650">
                  <div className="flex items-center gap-2 text-slate-500">
                    <ShieldLogo size={14} />
                    <span>Sesi Privat Terenkripsi</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} />
                    <span>Mitra Zeth Finance</span>
                  </div>
                </div>

                <button
                  id="profile-dropdown-logout-btn"
                  onClick={onLogout}
                  className="w-full mt-2 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut size={12} />
                  <span>Keluar Aplikasi</span>
                </button>
              </div>
            </div>
          )}
          
          <button
            id="nav-logout-btn"
            onClick={onLogout}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
