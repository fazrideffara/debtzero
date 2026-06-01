import React, { useState, useEffect } from 'react'
import { usePayments } from '../../hooks/usePayments'
import { formatRupiah, formatDateIndo, daysRemaining } from '../../utils/formatter'
import { calculatePawnInterest } from '../../utils/calculator'
import { 
  X, 
  Upload, 
  Clock, 
  FileText, 
  Trash2, 
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Coins
} from 'lucide-react'


interface DebtDetailModalProps {
  debt: {
    id: string
    type: 'cicilan' | 'gadai' | 'personal'
    creditor_name: string
    principal_amount: number
    remaining_amount: number
    interest_rate: number
    interest_period: 'monthly' | '15days' | 'none'
    start_date: string
    due_date: string | null
    tenor: number | null
    tenor_unit: 'days' | 'months' | null
    status: 'active' | 'completed'
    notes: string | null
  }
  onClose: () => void
  onUpdate: () => void // Trigger refetch on debts
}

export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({ debt, onClose, onUpdate }) => {
  const { payments, loading: loadingPayments, fetchPayments, addPayment, deletePayment } = usePayments(debt.id)
  
  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  
  // UI Feedback States
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Image Preview Modal State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // Load payments list on mount
  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Pawn specific interest calculation
  const pawnCalculation = debt.type === 'gadai' 
    ? calculatePawnInterest(
        debt.principal_amount,
        debt.interest_rate,
        debt.start_date,
        debt.tenor || 120,
        payments.reduce((acc, p) => acc + (p.amount < debt.principal_amount ? p.amount : 0), 0) // Treat partial payments as interest payments
      )
    : null

  // Total outstanding specifically for pawn (principal + active interest - interest payments)
  const activeInterest = pawnCalculation ? pawnCalculation.interestAmount : 0
  const pawnTotalToRedeem = pawnCalculation ? pawnCalculation.totalOutstanding : debt.remaining_amount

  // File selection validation (ZARA's requirements)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('')
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        setFormError('Format file tidak didukung. Harap pilih gambar JPEG/PNG.')
        setReceiptFile(null)
        return
      }

      // Check file size (max 2MB = 2 * 1024 * 1024 bytes)
      const maxSizeBytes = 2 * 1024 * 1024
      if (file.size > maxSizeBytes) {
        setFormError('Ukuran file terlalu besar. Maksimal kapasitas file adalah 2MB.')
        setReceiptFile(null)
        return
      }

      setReceiptFile(file)
    }
  }

  // Handle Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent, customAmount?: number) => {
    e.preventDefault()
    setFormError('')
    setSuccessMessage('')
    setSubmitting(true)

    const finalAmount = customAmount !== undefined ? customAmount : parseFloat(paymentAmount)

    // Form Validations (ZARA's rules)
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setFormError('Nominal pembayaran harus berupa angka positif lebih dari 0.')
      setSubmitting(false)
      return
    }

    if (debt.type !== 'gadai' && finalAmount > debt.remaining_amount) {
      setFormError(`Nominal pembayaran melebihi sisa tagihan Anda (${formatRupiah(debt.remaining_amount)}).`)
      setSubmitting(false)
      return
    }

    try {
      await addPayment(finalAmount, paymentNotes || null, receiptFile)
      
      setSuccessMessage('Pembayaran berhasil dicatat!')
      setPaymentAmount('')
      setPaymentNotes('')
      setReceiptFile(null)
      onUpdate() // Refetch parent debts
      fetchPayments() // Refetch local payments
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan pembayaran.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePayment = async (pId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan pembayaran ini? Sisa tagihan akan disesuaikan kembali.')) return
    
    try {
      await deletePayment(pId)
      setSuccessMessage('Pembayaran berhasil dihapus.')
      onUpdate()
      fetchPayments()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menghapus pembayaran.')
    }
  }

  const daysLeft = debt.due_date ? daysRemaining(debt.due_date) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl glass-card p-6 md:p-8 rounded-3xl border border-slate-800 my-8 max-h-[90vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
          aria-label="Tutup detail"
        >
          <X size={20} />
        </button>

        {/* LEFT COLUMN: Debt Details & Form */}
        <div className="space-y-6">
          <div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              debt.type === 'cicilan' ? 'bg-indigo-500/10 text-indigo-400' :
              debt.type === 'gadai' ? 'bg-amber-500/10 text-amber-400' :
              'bg-purple-500/10 text-purple-400'
            }`}>
              {debt.type === 'cicilan' ? 'Cicilan Bulanan' : debt.type === 'gadai' ? 'Gadai' : 'Personal'}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-2">{debt.creditor_name}</h2>
            {debt.notes && <p className="text-xs text-slate-400 mt-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 font-medium italic">{debt.notes}</p>}
          </div>

          {/* Core Info Specs */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/60 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detail Keuangan</h3>
            <hr className="border-slate-800/65" />
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">Pokok Awal</span>
              <span className="text-slate-200 font-semibold">{formatRupiah(debt.principal_amount)}</span>
            </div>

            {debt.type === 'gadai' ? (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Bunga Gadai Berjalan</span>
                  <span className="text-amber-400 font-bold">+{formatRupiah(activeInterest)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-800/50 pt-2">
                  <span className="text-slate-300 font-bold">Total Untuk Menebus</span>
                  <span className="text-slate-100 font-extrabold text-base">{formatRupiah(pawnTotalToRedeem)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center text-sm border-t border-slate-800/50 pt-2">
                <span className="text-slate-300 font-bold">Sisa Tagihan</span>
                <span className="text-slate-100 font-extrabold text-base">{formatRupiah(debt.remaining_amount)}</span>
              </div>
            )}

            {debt.type !== 'personal' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Suku Bunga</span>
                <span className="text-slate-200 font-medium">{debt.interest_rate}% / {debt.interest_period === '15days' ? '15 Hari' : 'Bulan'}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">Masa Jatuh Tempo</span>
              <span className="text-slate-200 font-medium">{debt.due_date ? formatDateIndo(debt.due_date) : 'Fleksibel'}</span>
            </div>

            {daysLeft !== null && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Status Waktu</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  daysLeft < 3 ? 'bg-rose-500/10 text-rose-400' :
                  daysLeft <= 7 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {daysLeft < 0 ? `Overdue ${Math.abs(daysLeft)} hari` : `${daysLeft} hari lagi`}
                </span>
              </div>
            )}
          </div>

          {/* Form Payment Input */}
          {debt.status === 'active' && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/60 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Coins size={14} className="text-purple-400" />
                Input Pembayaran Baru
              </h3>
              <hr className="border-slate-800/65" />

              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {debt.type === 'gadai' ? (
                /* Dynamic actions for Pawn ( Pegadaian ) - locked input */
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <p className="text-xs text-slate-400 font-medium">Aksi khusus Pegadaian GADAI:</p>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        disabled={submitting || activeInterest <= 0}
                        onClick={(e) => handlePaymentSubmit(e, activeInterest)}
                        className="py-2.5 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-xs font-bold border border-purple-500/30 disabled:opacity-30 cursor-pointer"
                      >
                        Perpanjang ({formatRupiah(activeInterest)})
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={(e) => handlePaymentSubmit(e, pawnTotalToRedeem)}
                        className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-md cursor-pointer"
                      >
                        Tebus Gadai
                      </button>
                    </div>
                  </div>

                  {/* Add Notes & Upload Receipt for Gadai actions too */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unggah Bukti Transfer</label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer text-xs text-slate-300 transition-colors">
                          <Upload size={14} />
                          <span>{receiptFile ? receiptFile.name : 'Pilih Gambar (PNG/JPEG, Max 2MB)'}</span>
                          <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Catatan Pembayaran</label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                        placeholder="Contoh: Perpanjang periode ke-2"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Dynamic actions for installment/personal - free nominal input */
                <form onSubmit={(e) => handlePaymentSubmit(e)} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nominal Bayar (Rp)</label>
                    <input
                      type="number"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                      placeholder="Contoh: 500000"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unggah Bukti Struk/Transfer</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer text-xs text-slate-300 transition-colors">
                      <Upload size={14} />
                      <span>{receiptFile ? receiptFile.name : 'Pilih File (Gambar, Max 2MB)'}</span>
                      <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan Pembayaran</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      placeholder="Contoh: Pembayaran cicilan bulan ke-3"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-purple-600/10 cursor-pointer"
                  >
                    {submitting ? 'Sedang Menyimpan...' : 'Simpan Pembayaran'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Payment Logs / History */}
        <div className="flex flex-col h-full border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-6 lg:pt-0 lg:pl-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Clock size={14} className="text-purple-400" />
            Riwayat Pembayaran
          </h3>
          
          {loadingPayments ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              <span className="text-[10px] text-slate-500 font-medium">Memuat riwayat...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/40 p-6">
              <FileText className="text-slate-700 mb-2" size={24} />
              <p className="text-xs text-slate-500">Belum ada riwayat pembayaran untuk hutang ini.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[50vh] lg:max-h-[65vh]">
              {payments.map((p) => (
                <div key={p.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/85 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">{formatRupiah(p.amount)}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{formatDateIndo(p.paid_at)}</p>
                    {p.notes && <p className="text-[11px] text-slate-400 italic">"{p.notes}"</p>}
                    
                    {/* View Proof Button */}
                    {p.receipt_image && (
                      <button
                        onClick={() => setPreviewImageUrl(p.receipt_image)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-purple-400 font-bold hover:underline"
                      >
                        <ImageIcon size={10} />
                        <span>Lihat Bukti Transfer</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors"
                    title="Hapus Pembayaran"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal Component */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="max-w-3xl w-full flex flex-col items-end gap-3">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} />
              <span>Tutup Struk</span>
            </button>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 overflow-hidden flex items-center justify-center max-h-[80vh]">
              <img 
                src={previewImageUrl} 
                alt="Bukti Transfer Struk" 
                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
