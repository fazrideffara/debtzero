import React, { useState, useEffect } from 'react'
import { analyzeReceipt } from '../../lib/gemini'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../utils/formatter'
import { 
  X, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  FileText,
  Save
} from 'lucide-react'

interface ScanDebtModalProps {
  onClose: () => void
  onSuccess: () => void
}

export const ScanDebtModal: React.FC<ScanDebtModalProps> = ({ onClose, onSuccess }) => {
  const [apiKey, setApiKey] = useState('')
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState<'upload' | 'confirm'>('upload')
  const [errorMessage, setErrorMessage] = useState('')

  const [type, setType] = useState<'cicilan' | 'gadai' | 'personal'>('cicilan')
  const [creditorName, setCreditorName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [tenor, setTenor] = useState('12')
  const [interestRate, setInterestRate] = useState('1.5')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function loadApiKey() {
      try {
        const systemKey = import.meta.env.VITE_GEMINI_API_KEY
        if (systemKey && systemKey.trim() !== '') {
          setApiKey(systemKey)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('user_settings')
          .select('gemini_api_key')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') throw error
        if (data?.gemini_api_key) {
          setApiKey(data.gemini_api_key)
        } else {
          setApiKey('AI_SaaS_Central_Enterprise_Key_Active')
        }
      } catch (err) {
        console.error('Failed to load Gemini key:', err)
        setApiKey('AI_SaaS_Central_Enterprise_Key_Active')
      } finally {
        setLoadingConfig(false)
      }
    }
    loadApiKey()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('')
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
      
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage('Format file tidak didukung. Harap pilih gambar JPEG/PNG.')
        setSelectedFile(null)
        return
      }

      const maxSizeBytes = 2 * 1024 * 1024
      if (file.size > maxSizeBytes) {
        setErrorMessage('Ukuran file melebihi batas 2MB.')
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
    }
  }

  const handleStartScan = async () => {
    if (!selectedFile) {
      setErrorMessage('Pilih gambar tagihan terlebih dahulu.')
      return
    }

    setErrorMessage('')
    setScanning(true)

    try {
      const result = await analyzeReceipt(selectedFile, apiKey)
      setCreditorName(result.creditorName)
      setAmount(result.amount.toString())
      setDueDate(result.dueDate || '')
      setNotes(`Hasil scan otomatis AI dari file: ${selectedFile.name}`)
      setScanStep('confirm')
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menganalisis gambar.')
    } finally {
      setScanning(false)
    }
  }

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Nominal tagihan harus berupa angka positif.')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi user tidak ditemukan.')

      let finalDueDate = dueDate || null
      const parsedTenor = parseInt(tenor)
      if (!finalDueDate && parsedTenor > 0) {
        const start = new Date()
        if (type === 'gadai') {
          start.setDate(start.getDate() + parsedTenor)
        } else {
          start.setMonth(start.getMonth() + parsedTenor)
        }
        finalDueDate = start.toISOString().split('T')[0]
      }

      const { error: insertErr } = await supabase
        .from('debts')
        .insert({
          user_id: user.id,
          type,
          creditor_name: creditorName,
          principal_amount: parsedAmount,
          remaining_amount: parsedAmount,
          interest_rate: type === 'personal' ? 0 : parseFloat(interestRate) || 0,
          interest_period: type === 'gadai' ? '15days' : type === 'cicilan' ? 'monthly' : 'none',
          start_date: new Date().toISOString().split('T')[0],
          due_date: finalDueDate,
          tenor: type === 'personal' ? null : parsedTenor,
          tenor_unit: type === 'gadai' ? 'days' : type === 'cicilan' ? 'months' : null,
          status: 'active',
          notes: notes || null
        })

      if (insertErr) throw insertErr

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan data hutang.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-white p-6 md:p-8 rounded-3xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Tutup"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 mb-6">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-850 tracking-tight">Scan Tagihan via Gemini AI</h2>
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-bold">OCR Instant Reader by Zeth Finance</p>
          </div>
        </div>

        {loadingConfig ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-emerald-600" />
            <span className="text-xs text-slate-500 font-medium">Checking configurations...</span>
          </div>
        ) : !apiKey ? (
          <div className="py-4 space-y-4 text-center">
            <div className="p-4 bg-amber-50 border border-amber-250 text-amber-700 text-xs rounded-xl flex items-start gap-3 text-left">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold">Gemini API Key Belum Dikonfigurasi</p>
                <p className="font-normal mt-1 text-slate-650">
                  Untuk menggunakan fitur OCR Scan Tagihan AI, harap masukkan Gemini API Key Anda terlebih dahulu di halaman Settings.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Kembali
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-3">
                <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {scanStep === 'upload' ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center relative hover:border-emerald-500/30 transition-colors">
                  <Upload className="text-slate-400 mb-3" size={32} />
                  <p className="text-sm font-semibold text-slate-700">Pilih Foto Tagihan Anda</p>
                  <p className="text-[10px] text-slate-500 mt-1">Hanya mendukung format PNG, JPEG, JPG (Maks 2MB)</p>
                  
                  <label className="mt-4 px-4 py-2 bg-emerald-50 border border-emerald-250 text-emerald-600 hover:bg-emerald-100 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                    Pilih File
                    <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
                  </label>

                  {selectedFile && (
                    <div className="mt-4 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-600">
                      <FileText size={14} />
                      <span className="font-semibold truncate max-w-[200px]">{selectedFile.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleStartScan}
                    disabled={!selectedFile || scanning}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {scanning ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Menganalisis Struk...</span>
                      </>
                    ) : (
                      <span>Mulai Scan Struk</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveDebt} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-750 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span className="font-semibold">AI Berhasil mengekstrak data! Harap konfirmasi di bawah ini.</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-xl mb-4 border border-slate-200">
                  {['cicilan', 'gadai', 'personal'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t as any)}
                      className={`py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                        type === t ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nama Kreditur</label>
                  <input
                    type="text"
                    required
                    value={creditorName}
                    onChange={(e) => setCreditorName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nominal Tagihan (Rp)</label>
                    <span className="text-[11px] font-bold text-emerald-600">{amount ? formatRupiah(parseFloat(amount) || 0) : ''}</span>
                  </div>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {type !== 'personal' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Bunga (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tenor ({type === 'gadai' ? 'Hari' : 'Bulan'})</label>
                      <input
                        type="number"
                        required
                        value={tenor}
                        onChange={(e) => setTenor(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tanggal Jatuh Tempo</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Catatan</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setScanStep('upload')}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Ulangi Scan
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Simpan Hutang</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
