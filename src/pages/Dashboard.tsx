import React from 'react'
import { LayoutDashboard, TrendingDown, BellRing, Sparkles } from 'lucide-react'

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="text-purple-500" />
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm">
            Selamat datang di DebtZero. Di sini Anda bisa memantau dan melunasi hutang Anda secara sistematis.
          </p>
        </div>
      </div>

      {/* Main Stat Summary Cards (Premium UI Placeholders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Debt Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Total Debt</p>
          <p className="text-3xl font-bold mt-2 text-slate-200">Rp 0,00</p>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400">
            <TrendingDown size={14} className="text-emerald-500" />
            <span>0% reduction this month</span>
          </div>
        </div>

        {/* Urgent Debts Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Urgent (Due &lt; 3 days)</p>
          <p className="text-3xl font-bold mt-2 text-slate-200">0</p>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400">
            <BellRing size={14} className="text-slate-500" />
            <span>No immediate payments due</span>
          </div>
        </div>

        {/* DSR Indicator Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Debt Service Ratio (DSR)</p>
          <p className="text-3xl font-bold mt-2 text-slate-200">0%</p>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400">
            <Sparkles size={14} className="text-amber-500" />
            <span>Healthy (Limit: 35%)</span>
          </div>
        </div>
      </div>

      {/* Info Panel explaining Phase 2 */}
      <div className="glass-card p-8 rounded-3xl border border-slate-800/60 shadow-lg bg-gradient-to-br from-slate-900/60 to-slate-950/80 flex flex-col items-center justify-center text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-6">
          <Sparkles size={32} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-200 mb-2">Foundation Phase 1 Ready</h2>
        <p className="text-slate-400 text-sm max-w-lg mb-6 leading-relaxed">
          Pondasi, layout, database schema, routing, dan autentikasi telah disiapkan dengan baik. Fitur CRUD hutang, motor kalkulasi bunga, progress tracking, dan grafik akan diimplementasikan pada **Phase 2 — Core Debt Features**.
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
          <span>Current active user state: Authorized</span>
        </div>
      </div>
    </div>
  )
}
