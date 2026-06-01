import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  CreditCard, 
  Download, 
  Settings, 
  X,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react'
import { ShieldLogo } from './ShieldLogo'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
  userEmail?: string
  userAvatar?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose,
  userName,
  userEmail,
  userAvatar
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showSidebarDropdown, setShowSidebarDropdown] = useState(false)
  const navigate = useNavigate()
  const menuItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'sidebar-link-dashboard' },
    { to: '/debts', label: 'Hutang Saya', icon: CreditCard, id: 'sidebar-link-debts' },
    { to: '/risk', label: 'Risiko & Strategi', icon: ShieldLogo, id: 'sidebar-link-risk' },
    { to: '/export', label: 'Laporan & Ekspor', icon: Download, id: 'sidebar-link-export' },
    { to: '/settings', label: 'Pengaturan', icon: Settings, id: 'sidebar-link-settings' },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 z-50 glass-panel p-4
          flex flex-col gap-6 transition-all duration-300 md:static md:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-20 md:items-center w-64' : 'md:w-64 w-64'}
          md:m-4 md:rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-none
        `}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between w-full md:hidden">
          <span className="font-bold text-emerald-600">Menu Navigasi</span>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Brand Logo - Desktop Only */}
        <div className="hidden md:flex flex-col pb-3 items-center justify-center border-b border-slate-100 w-full">
          <div className="flex items-center gap-2">
            <ShieldLogo size={isCollapsed ? 32 : 24} />
            {!isCollapsed && (
              <span className="text-xl font-extrabold text-emerald-600 tracking-tight">
                BebasHutang
              </span>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Zeth Finance System
            </span>
          )}
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex flex-col gap-2 flex-1 w-full">
          {menuItems.map((item) => (
            <NavLink
              id={item.id}
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group
                ${isActive 
                  ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/3 to-transparent text-emerald-600 font-extrabold' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {/* Neon Green Pill Indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
                  )}
                  {/* Icon with bounce/translate micro-animation */}
                  <div className="transition-transform duration-200 group-hover:translate-x-1 group-hover:scale-110">
                    <item.icon size={18} />
                  </div>
                  {!isCollapsed && <span className="transition-all duration-200">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Toggle Collapse Button for Desktop */}
        <div className="hidden md:flex justify-end w-full border-t border-slate-100 pt-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Toggle Sidebar Collapse"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* User Profile Avatar at the Bottom of Sidebar */}
        <div className="mt-auto border-t border-slate-100 pt-4 flex flex-col items-center justify-center w-full relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSidebarDropdown(!showSidebarDropdown)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm hover:scale-105 transition-transform cursor-pointer"
            >
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : userName ? (
                <div className="w-full h-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User size={16} />
                </div>
              )}
            </button>

            {showSidebarDropdown && (
              <div className={`absolute bottom-12 ${isCollapsed ? 'left-6' : 'left-0'} w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150`}>
                <div className="text-xs font-bold text-slate-800 truncate mb-1">{userName || 'User'}</div>
                <div className="text-[10px] text-slate-500 truncate mb-2">{userEmail}</div>
                <hr className="border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowSidebarDropdown(false)
                    navigate('/settings')
                  }}
                  className="w-full text-left py-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                >
                  Edit Profil Saya
                </button>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="text-center mt-2 w-full">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[150px] mx-auto">{userName || 'Zeth Member'}</p>
              <p className="text-[9px] text-slate-400 truncate max-w-[150px] mx-auto">{userEmail}</p>
            </div>
          )}
        </div>

        {/* Footer Info inside Sidebar */}
        {!isCollapsed && (
          <div className="pt-2 text-[10px] text-slate-400 text-center">
            <p>© 2026 Zeth Corporation</p>
            <p className="mt-0.5 font-mono text-[9px] text-emerald-600/60">v1.0.0 Stable</p>
          </div>
        )}
      </aside>
    </>
  )
}
