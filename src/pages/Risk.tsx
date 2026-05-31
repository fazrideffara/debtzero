import React from 'react'
import { ShieldAlert, Sparkles } from 'lucide-react'

export const Risk: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
        <ShieldAlert className="text-purple-500" />
        Risk & Strategy
      </h1>
      <p className="text-slate-400 text-sm">Analisis DSR dan optimasi strategi pelunasan (Snowball vs Avalanche).</p>
      
      <div className="glass-card p-8 rounded-3xl border border-slate-800/60 shadow-lg text-center py-16">
        <Sparkles className="mx-auto text-purple-400 mb-4 animate-bounce" size={28} />
        <h2 className="text-lg font-bold text-slate-200">Coming Soon in Phase 3</h2>
        <p className="text-slate-400 text-sm mt-1">Saran keuangan cerdas, kalkulator DSR otomatis, dan simulasi gali lubang tutup lubang.</p>
      </div>
    </div>
  )
}
