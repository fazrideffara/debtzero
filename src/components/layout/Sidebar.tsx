import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  CreditCard, 
  Download, 
  Settings, 
  X 
} from 'lucide-react'
import { ShieldLogo } from './ShieldLogo'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'sidebar-link-dashboard' },
    { to: '/debts', label: 'Hutang Saya', icon: CreditCard, id: 'sidebar-link-debts' },
    { to: '/risk', label: 'Risiko & Strategi', icon: ShieldLogo, id: 'sidebar-link-risk' },
    { to: '/export', label: 'Laporan & Ekspor', icon: Download, id: 'sidebar-link-export' },
    { to: '/settings', label: 'Pengaturan', icon: Settings, id: 'sidebar-link-settings' },
  ]

  const navLinkClass = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
    ${isActive 
      ? 'bg-emerald-100/50 text-emerald-600 border border-emerald-500/20' 
      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
    }
  `

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
          fixed top-0 bottom-0 left-0 z-50 w-64 glass-panel border-r border-slate-200 p-6
          flex flex-col gap-8 transition-transform duration-300 md:translate-x-0 md:static md:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between md:hidden">
          <span className="font-bold text-emerald-600">Menu Navigasi</span>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Brand Logo - Desktop Only */}
        <div className="hidden md:flex flex-col pb-2 border-b border-slate-200">
          <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">
            BebasHutang
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
        <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 text-center">
          <p>© 2026 Zeth Corporation</p>
          <p className="mt-1 font-mono text-[9px] text-emerald-600/60">v1.0.0 Stable</p>
        </div>
      </aside>
    </>
  )
}
