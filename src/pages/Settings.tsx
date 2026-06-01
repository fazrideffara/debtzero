import React, { useState, useEffect } from 'react'
import { Settings, Save, AlertCircle, CheckCircle2, Trash2, Loader2, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../utils/formatter'
import { sendDailyPingMessage } from '../lib/telegram'

export const SettingsPage: React.FC = () => {
  const [income, setIncome] = useState('0')
  const [expense, setExpense] = useState('0')
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [pingLoading, setPingLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile management tab states
  const [activeTab, setActiveTab] = useState<'financial' | 'profile'>('financial')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const PRESET_AVATARS = [
    { name: 'Wallet', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=wallet' },
    { name: 'Shield', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=shield' },
    { name: 'Bull', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bull' },
    { name: 'Key', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=key' },
    { name: 'Growth', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=growth' }
  ]

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setEmail(user.email || '')
        setFullName(user.user_metadata?.full_name || '')
        setAvatarUrl(user.user_metadata?.avatar_url || '')

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

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Maksimal ukuran foto 2MB ya, Bos!' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi login tidak ditemukan.')

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        email: email !== user.email ? email : undefined,
        data: {
          full_name: fullName,
          avatar_url: avatarUrl
        }
      })

      if (authError) throw authError

      // Update public.users table (full_name & email)
      const { error: dbError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          email: email
        })
        .eq('id', user.id)

      if (dbError) throw dbError

      // Dispatch global profile update event to tell AppLayout to refresh
      window.dispatchEvent(new Event('user-profile-updated'))

      setMessage({ type: 'success', text: 'Profil kamu berhasil diperbarui, Bos!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui profil.' })
    } finally {
      setProfileLoading(false)
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

  const handleSendPingSimulasi = async () => {
    if (!chatId) return
    setPingLoading(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi login tidak ditemukan.')

      // Fetch active debts
      const { data: debts, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)

      if (debtsError) throw debtsError

      const token = botToken || 'BebasHutangGatewayOfficialToken'
      const success = await sendDailyPingMessage(token, chatId, debts || [], parseFloat(income) || 0)
      if (success) {
        setMessage({ type: 'success', text: 'Simulasi Ping Status Finansial Harian berhasil dikirim ke Telegram kamu, Bos!' })
      } else {
        throw new Error('Gagal mengirim ke Telegram. Pastikan Chat ID kamu valid dan bot tidak diblokir.')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengirim simulasi ping.' })
    } finally {
      setPingLoading(false)
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
          Atur gaji bulanan, pengeluaran, bot Telegram, kunci API Gemini, dan data profil kamu di sini.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => { setActiveTab('financial'); setMessage(null); }}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'financial'
              ? 'border-emerald-600 text-emerald-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pengaturan Finansial & Integrasi
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('profile'); setMessage(null); }}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Profil Saya
        </button>
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

      {activeTab === 'profile' ? (
        <form onSubmit={handleProfileSave} className="glass-card p-6 md:p-8 rounded-3xl border border-slate-200 space-y-6 max-w-2xl">
          <h2 className="text-lg font-bold text-slate-800">Profil Saya</h2>
          <hr className="border-slate-200" />

          {/* Avatar Upload Container */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : fullName ? (
                <div className="w-full h-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl">
                  👤
                </div>
              )}
            </div>

            <div className="space-y-2 w-full">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Unggah Foto Profil Baru</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Mendukung format gambar. Maksimal 2MB.</p>
            </div>
          </div>

          {/* Preset Avatars Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Atau Pilih Avatar Premium Bawaan</label>
            <div className="flex flex-wrap gap-3">
              {PRESET_AVATARS.map((avatar) => (
                <button
                  key={avatar.name}
                  type="button"
                  onClick={() => setAvatarUrl(avatar.url)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all p-1 flex items-center justify-center bg-slate-50 hover:scale-105 cursor-pointer ${
                    avatarUrl === avatar.url ? 'border-emerald-600 shadow-md scale-105' : 'border-slate-200'
                  }`}
                >
                  <img src={avatar.url} alt={avatar.name} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </div>

          {/* Full Name & Email fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Nama Lengkap</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                placeholder="Nama Lengkap"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Alamat Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                placeholder="email@domain.com"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold shadow-md transition-colors text-xs cursor-pointer"
            >
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{profileLoading ? 'Memperbarui...' : 'Simpan Profil'}</span>
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Custom live display logic for formatted Rupiah helper */}
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Baseline */}
            <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Kebutuhan Finansial</h2>
              <hr className="border-slate-200" />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gaji / Pendapatan Bulanan (Rp)</label>
                  <span className="text-xs font-bold text-emerald-600">
                    {income ? formatRupiah(Number(income)) : ''}
                  </span>
                </div>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengeluaran Bulanan (Rp)</label>
                  <span className="text-xs font-bold text-emerald-600">
                    {expense ? formatRupiah(Number(expense)) : ''}
                  </span>
                </div>
                <input
                  type="number"
                  value={expense}
                  onChange={(e) => setExpense(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Integration Credentials (SaaS Level) */}
            <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Integrasi API & Bot Telegram</h2>
              <hr className="border-slate-200" />

              {/* Gemini AI Info Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-slate-650">
                <p className="font-bold text-emerald-700">✨ Gemini AI Cloud Scan Enabled (SaaS Mode)</p>
                <p className="font-normal">
                  BebasHutang memproses scan dokumen/struk tagihan kamu secara otomatis menggunakan engine AI pusat di server-side. Kamu tidak perlu memasukkan API Key personal.
                </p>
              </div>

              {/* Telegram Gateway link */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Koneksi Telegram</label>
                
                {chatId ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs rounded-xl space-y-3">
                    <p className="font-bold flex items-center gap-1">🟢 Akun Telegram Terhubung</p>
                    <p className="font-normal">Chat ID kamu: <strong>{chatId}</strong>. Reminder notifikasi jatuh tempo siap dikirim.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSendPingSimulasi}
                        disabled={pingLoading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        {pingLoading ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                        <span>Kirim Harian Pengingat (Simulasi Bot)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChatId('')
                          setBotToken('')
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-650 border border-slate-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Putuskan Koneksi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <a
                      href="https://t.me/BebasHutangZethBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-colors shadow-md shadow-sky-500/10 cursor-pointer"
                    >
                      <span>Hubungkan ke Bot Telegram BebasHutang</span>
                    </a>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Masukkan OTP / Chat ID dari Bot</label>
                      <input
                        type="text"
                        value={chatId}
                        onChange={(e) => {
                          setChatId(e.target.value)
                          setBotToken('BebasHutangGatewayOfficialToken') // sets dummy placeholder token on save
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-xs"
                        placeholder="Contoh: 123456789"
                      />
                      <p className="text-[9px] text-slate-400">Tekan /start pada bot Telegram kami untuk melihat Chat ID kamu.</p>
                    </div>
                  </div>
                )}
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
        </>
      )}

      {/* Custom Confirmation Modal Overlay (ZARA/NOVA UAT requirements) */}
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
