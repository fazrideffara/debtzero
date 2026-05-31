import React from 'react'
import { LogOut, User, Bell, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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
  return (
    <nav className="glass-panel sticky top-0 z-40 w-full border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
      {/* Mobile Toggle & Branding */}
      <div className="flex items-center gap-4">
        <button
          id="mobile-sidebar-toggle"
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-gradient-purple">
            DebtZero
          </span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            by Zeth Finance
          </span>
        </div>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-4">
        {/* DSR Alert indicator */}
        {dsrWarning && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium animate-pulse">
            <ShieldAlert size={14} />
            <span>High DSR Alert</span>
          </div>
        )}

        {/* Notifications mock icon */}
        <button
          id="notification-btn"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors relative"
          aria-label="View Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500"></span>
        </button>

        {/* User profile dropdown / info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800/80">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-200">
              {userName || 'Zeth Member'}
            </span>
            <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
              {userEmail}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {userName ? userName.charAt(0).toUpperCase() : <User size={14} />}
          </div>
          
          <button
            id="nav-logout-btn"
            onClick={onLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
