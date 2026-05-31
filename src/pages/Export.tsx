import React from 'react'
import { Download, Sparkles } from 'lucide-react'

export const Export: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
        <Download className="text-purple-500" />
        Reports & Export
      </h1>
      <p className="text-slate-400 text-sm">Unduh rekapitulasi data hutang dalam format PDF atau Excel.</p>
      
      <div className="glass-card p-8 rounded-3xl border border-slate-800/60 shadow-lg text-center py-16">
        <Sparkles className="mx-auto text-purple-400 mb-4 animate-bounce" size={28} />
        <h2 className="text-lg font-bold text-slate-200">Coming Soon in Phase 4</h2>
        <p className="text-slate-400 text-sm mt-1">Export PDF dengan jsPDF (Zeth Finance branding) dan file tabular Excel (SheetJS).</p>
      </div>
    </div>
  )
}
