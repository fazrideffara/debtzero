import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  CreditCard, 
  ShieldAlert, 
  Download, 
  Settings, 
  X 
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'sidebar-link-dashboard' },
    { to: '/debts', label: 'My Debts', icon: CreditCard, id: 'sidebar-link-debts' },
    { to: '/risk', label: 'Risk & Strategy', icon: ShieldAlert, id: 'sidebar-link-risk' },
    { to: '/export', label: 'Reports & Export', icon: Download, id: 'sidebar-link-export' },
    { to: '/settings', label: 'Settings', icon: Settings, id: 'sidebar-link-settings' },
  ]

  const navLinkClass = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
    ${isActive 
      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
      : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
    }
  `

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-64 glass-panel border-r border-slate-800/60 p-6
          flex flex-col gap-8 transition-transform duration-300 md:translate-x-0 md:static md:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between md:hidden">
          <span className="font-bold text-gradient-purple">Menu Navigation</span>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Brand Logo - Desktop Only */}
        <div className="hidden md:flex flex-col pb-2 border-b border-slate-800/45">
          <span className="text-2xl font-extrabold text-gradient-purple tracking-tight">
            DebtZero
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Zeth Finance System
          </span>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex flex-col gap-1.5 flex-1">
          {menuItems.map((item) => (
            <NavLink
              id={item.id}
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={navLinkClass}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Info inside Sidebar */}
        <div className="pt-4 border-t border-slate-800/50 text-[11px] text-slate-500 text-center">
          <p>© 2026 Zeth Corporation</p>
          <p className="mt-1 font-mono text-[9px] text-purple-500/60">v1.0.0 Stable</p>
        </div>
      </aside>
    </>
  )
}
