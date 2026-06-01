import React, { useState, useEffect } from 'react'
import { Settings, Save, AlertCircle, CheckCircle2, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const SettingsPage: React.FC = () => {
  const [income, setIncome] = useState('0')
  const [expense, setExpense] = useState('0')
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 is code for no row found

        if (data) {
          setIncome(data.monthly_income.toString())
          setExpense(data.monthly_expense.toString())
          setBotToken(data.telegram_bot_token || '')
          setChatId(data.telegram_chat_id || '')
          setApiKey(data.gemini_api_key || '')
          setNotifEnabled(data.notif_enabled)
        }
      } catch (err: any) {
        console.error('Gagal memuat pengaturan:', err.message)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const inc = parseFloat(income) || 0
    const exp = parseFloat(expense) || 0

    // Extreme validation checks to prevent crash / overflow
    if (inc < 0 || exp < 0) {
      setMessage({ type: 'error', text: 'Pemasukan atau pengeluaran gak boleh negatif ya, Bos!' })
      setLoading(false)
      return
    }

    if (inc > 1000000000000 || exp > 1000000000000) {
      setMessage({ type: 'error', text: 'Wah, nominalnya kegedean tuh. Maksimal Rp1 Triliun ya!' })
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi login tidak ditemukan.')

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          monthly_income: inc,
          monthly_expense: exp,
          telegram_bot_token: botToken || null,
          telegram_chat_id: chatId || null,
          gemini_api_key: apiKey || null,
          notif_enabled: notifEnabled,
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Pengaturan kamu berhasil disimpan, Bos!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan pengaturan.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetConfirm = async () => {
    setShowConfirmModal(false)
    setResetLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi login tidak ditemukan.')

      // Delete notifications log
      const { error: nError } = await supabase
        .from('notifications_log')
        .delete()
        .eq('user_id', user.id)
      if (nError) throw nError

      // Delete payments
      const { error: pError } = await supabase
        .from('payments')
        .delete()
        .eq('user_id', user.id)
      if (pError) throw pError

      // Delete debts
      const { error: dError } = await supabase
        .from('debts')
        .delete()
        .eq('user_id', user.id)
      if (dError) throw dError

      // Dispatch global reset event to clear/refetch states in active tabs instantly!
      window.dispatchEvent(new Event('debt-data-reset'))

      setMessage({ type: 'success', text: 'Sukses bersihkan database! Semua data hutang & riwayat pembayaran kamu berhasil dihapus total.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal membersihkan data.' })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="text-emerald-500" />
          Pengaturan
        </h1>
        <p className="text-slate-550 text-sm">
          Atur gaji bulanan, pengeluaran, bot Telegram, dan kunci API Gemini kamu di sini.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Baseline */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Kebutuhan Finansial</h2>
          <hr className="border-slate-200" />
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gaji / Pendapatan Bulanan (Rp)</label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengeluaran Bulanan (Rp)</label>
            <input
              type="number"
              value={expense}
              onChange={(e) => setExpense(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="0"
            />
          </div>
        </div>

        {/* Integration Credentials */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Integrasi API & Telegram Bot</h2>
          <hr className="border-slate-200" />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gemini API Key (Buat scan tagihan)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="••••••••••••••••"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telegram BOT Token</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="••••••••••••••••"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telegram Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="Contoh: 123456789"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="notifToggle"
              checked={notifEnabled}
              onChange={(e) => setNotifEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-200 bg-white"
            />
            <label htmlFor="notifToggle" className="text-xs font-semibold text-slate-650 select-none cursor-pointer">
              Aktifkan reminder & notifikasi jatuh tempo via Telegram
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="lg:col-span-2 flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold shadow-md transition-colors text-xs cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* DANGER ZONE: DATA CLEANUP & RESET */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-red-200 space-y-4 bg-red-50/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl"></div>
        
        <h2 className="text-lg font-bold text-red-650 flex items-center gap-2">
          <AlertCircle size={20} />
          Zona Bahaya ⚠️
        </h2>
        <hr className="border-red-200" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Hapus Seluruh Data Hutang</p>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
              Tombol di bawah ini bakal ngehapus semua data hutang, pembayaran, dan log notifikasi kamu secara permanen dari server database Supabase. Aksi ini gak bisa dibatalin ya, Bos!
            </p>
          </div>
          
          <button
            type="button"
            disabled={resetLoading}
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-red-500/30 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-750 font-bold transition-all text-xs cursor-pointer shrink-0 shadow-md"
          >
            {resetLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            <span>{resetLoading ? 'Sedang Menghapus...' : 'Bersihkan Semua Data'}</span>
          </button>
        </div>
      </div>

      {/* Custom Confirmation Modal Overlay (ZARA/NOVA requirements) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card p-6 md:p-8 rounded-3xl border border-red-200 space-y-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={28} />
              <h2 className="text-xl font-bold">Konfirmasi Hapus Data</h2>
            </div>
            <hr className="border-slate-200" />
            <p className="text-slate-650 text-sm leading-relaxed">
              Apakah kamu beneran yakin mau menghapus semua data hutang, pembayaran, dan log reminder secara permanen? Aksi ini <b>TIDAK BISA</b> dibatalkan!
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-4 py-2.5 rounded-xl bg-red-650 hover:bg-red-750 text-white font-bold transition-colors text-xs cursor-pointer shadow-md"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
