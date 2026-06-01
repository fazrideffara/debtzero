import React, { useState } from 'react'
import { useDebts } from '../hooks/useDebts'
import { formatRupiah, formatDateIndo } from '../utils/formatter'
import { DebtDetailModal } from '../components/debt/DebtDetailModal'
import { ScanDebtModal } from '../components/debt/ScanDebtModal'
import { determineRiskColor } from '../utils/calculator'
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Filter, 
  Calendar, 
  AlertTriangle,
  Info,
  Sparkles
} from 'lucide-react'

export const Debts: React.FC = () => {
  const { debts, loading, error, refetch, addDebt, deleteDebt } = useDebts()
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)

  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOption, setSortOption] = useState<string>('due-date')

  // Form states
  const [type, setType] = useState<'cicilan' | 'gadai' | 'personal'>('cicilan')
  const [creditorName, setCreditorName] = useState('')
  const [principalAmount, setPrincipalAmount] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [interestPeriod, setInterestPeriod] = useState<'monthly' | '15days' | 'none'>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [tenor, setTenor] = useState('')
  const [tenorUnit, setTenorUnit] = useState<'days' | 'months' | null>('months')
  const [notes, setNotes] = useState('')

  // Frontend validation state
  const [validationError, setValidationError] = useState('')

  // Helper to handle debt type change and set defaults
  const handleTypeChange = (newType: 'cicilan' | 'gadai' | 'personal') => {
    setType(newType)
    setValidationError('')
    if (newType === 'gadai') {
      setInterestPeriod('15days')
      setTenorUnit('days')
      setTenor('120') // Default Pegadaian tenor
      setInterestRate('1.2') // Common Pegadaian rate
    } else if (newType === 'cicilan') {
      setInterestPeriod('monthly')
      setTenorUnit('months')
      setTenor('12')
      setInterestRate('1.5')
    } else {
      setInterestPeriod('none')
      setTenorUnit(null)
      setTenor('')
      setInterestRate('0')
      setDueDate('')
    }
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')

    // Validations (ZARA's requirements)
    if (!creditorName.trim()) {
      setValidationError('Nama Kreditur / Pemberi Hutang wajib diisi.')
      return
    }

    const principal = parseFloat(principalAmount)
    if (isNaN(principal) || principal <= 0) {
      setValidationError('Nominal Pokok Hutang harus berupa angka positif lebih dari 0.')
      return
    }
    if (principal > 1000000000000) {
      setValidationError('Nominal pokok hutang terlalu besar. Maksimal Rp1 Triliun ya!')
      return
    }

    const rate = parseFloat(interestRate)
    if (type !== 'personal' && (isNaN(rate) || rate < 0)) {
      setValidationError('Persentase bunga tidak boleh negatif.')
      return
    }
    if (type !== 'personal' && rate > 100) {
      setValidationError('Persentase bunga tidak boleh melebihi 100% per periode.')
      return
    }

    let parsedTenor: number | null = null
    if (type !== 'personal') {
      parsedTenor = parseInt(tenor)
      if (isNaN(parsedTenor) || parsedTenor <= 0) {
        setValidationError('Tenor harus berupa angka bulat positif.')
        return
      }
      if (parsedTenor > 1200) {
        setValidationError('Tenor tidak boleh melebihi 1200 periode.')
        return
      }
    }

    // Auto calculate due date for Pawn if not manually set
    let finalDueDate = dueDate || null
    if (type === 'gadai' && parsedTenor && startDate) {
      const start = new Date(startDate)
      start.setDate(start.getDate() + parsedTenor)
      finalDueDate = start.toISOString().split('T')[0]
    } else if (type === 'cicilan' && parsedTenor && startDate) {
      const start = new Date(startDate)
      start.setMonth(start.getMonth() + parsedTenor)
      finalDueDate = start.toISOString().split('T')[0]
    }

    try {
      await addDebt({
        type,
        creditor_name: creditorName,
        principal_amount: principal,
        remaining_amount: principal, // remaining initially matches principal
        interest_rate: type === 'personal' ? 0 : rate,
        interest_period: interestPeriod,
        start_date: startDate,
        due_date: finalDueDate,
        tenor: parsedTenor,
        tenor_unit: tenorUnit,
        notes: notes || null,
      })

      // Reset Form & Close Modal
      setCreditorName('')
      setPrincipalAmount('')
      setInterestRate('')
      setTenor('')
      setNotes('')
      setDueDate('')
      setIsModalOpen(false)
    } catch (err: any) {
      setValidationError(err.message || 'Gagal menyimpan data hutang.')
    }
  }

  // Filter debts
  const filteredDebts = debts
    .filter((d) => {
      const matchesType = filterType === 'all' || d.type === filterType
      const matchesStatus = filterStatus === 'all' || d.status === filterStatus
      const matchesSearch = d.creditor_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (d.notes && d.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesType && matchesStatus && matchesSearch
    })
    .sort((a, b) => {
      if (sortOption === 'due-date') {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      if (sortOption === 'interest') {
        return b.interest_rate - a.interest_rate
      }
      if (sortOption === 'nominal') {
        return b.remaining_amount - a.remaining_amount
      }
      return 0
    })

  // Format inline inputs as Rupiah for user feedback
  const displayRupiahFeedback = (val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return ''
    return formatRupiah(num)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="text-emerald-500" />
            Daftar Hutang
          </h1>
          <p className="text-slate-550 text-sm">
            Pantau dan kelola rincian kewajiban cicilan, gadai, dan personal Anda di sini.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            id="btn-scan-debt"
            onClick={() => setIsScanModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 text-emerald-600 font-bold text-sm transition-colors cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Scan Tagihan (AI)</span>
          </button>
          <button
            id="btn-add-debt"
            onClick={() => {
              handleTypeChange('cicilan')
              setIsModalOpen(true)
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-600/10 cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Hutang</span>
          </button>
        </div>

      </div>

      {/* Database Fetch Error */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Dashboard */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-250/80 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider pl-1">
            <Filter size={14} />
            <span>Cari & Filter:</span>
          </div>
          {/* Search bar */}
          <input
            type="text"
            placeholder="Cari nama kreditur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 w-44"
          />
          {/* Type Filter */}
          <select
            id="filter-type-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Tipe</option>
            <option value="cicilan">Cicilan Bulanan</option>
            <option value="gadai">Gadai Emas</option>
            <option value="personal">Hutang Saudara/Personal</option>
          </select>
          {/* Status Filter */}
          <select
            id="filter-status-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="active">Aktif (Belum Lunas)</option>
            <option value="completed">Lunas (Completed)</option>
            <option value="all">Semua Status</option>
          </select>
          {/* Sorting Filter */}
          <select
            id="filter-sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="due-date">Jatuh Tempo Terdekat</option>
            <option value="interest">Bunga Tertinggi</option>
            <option value="nominal">Sisa Nominal Terbesar</option>
          </select>
        </div>
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
          Menampilkan {filteredDebts.length} catatan hutang
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
          <span className="text-slate-500 text-xs font-medium">Memuat daftar hutang...</span>
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-200 text-center">
          <Info className="mx-auto text-slate-400 mb-3" size={32} />
          <h2 className="text-slate-700 font-bold text-lg">Tidak ada catatan ditemukan</h2>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            Gunakan tombol "Tambah Hutang" untuk mendaftarkan cicilan, gadai, atau hutang personal Anda.
          </p>
        </div>
      ) : (
        /* Debt List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDebts.map((debt) => {
            const riskColor = determineRiskColor(debt.due_date, false)
            const riskBorderClass = 
              riskColor === 'red' ? 'border-l-4 border-l-rose-500' :
              riskColor === 'yellow' ? 'border-l-4 border-l-amber-500' :
              'border-l-4 border-l-emerald-500'

            return (
              <div 
                key={debt.id} 
                onClick={(e) => {
                  // Do not open details if user clicks the delete button
                  if ((e.target as HTMLElement).closest('button')) return
                  setSelectedDebt(debt)
                }}
                className={`glass-card glass-card-hover p-6 rounded-2xl border border-slate-200 shadow-md flex flex-col justify-between transition-all cursor-pointer ${riskBorderClass}`}
              >

                <div>
                  {/* Type Badge & Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      debt.type === 'cicilan' ? 'bg-emerald-100 text-emerald-700' :
                      debt.type === 'gadai' ? 'bg-amber-100 text-amber-700' :
                      'bg-teal-100 text-teal-700'
                    }`}>
                      {debt.type === 'cicilan' ? 'Cicilan' : debt.type === 'gadai' ? 'Gadai' : 'Personal'}
                    </span>
                    <button
                      id={`delete-debt-${debt.id}`}
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin menghapus data hutang ini? Semua riwayat pembayaran juga akan terhapus.')) {
                          deleteDebt(debt.id)
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-450 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus Hutang"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Creditor Name */}
                  <h3 className="text-lg font-bold text-slate-800 truncate">{debt.creditor_name}</h3>
                  
                  {/* Stats */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Sisa Tagihan</span>
                      <span className="text-sm font-extrabold text-slate-800">
                        {formatRupiah(debt.remaining_amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Pokok Awal</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {formatRupiah(debt.principal_amount)}
                      </span>
                    </div>
                    {debt.type !== 'personal' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Bunga</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {debt.interest_rate}% / {debt.interest_period === 'monthly' ? 'Bulan' : '15 Hari'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Details */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Jatuh Tempo:</span>
                  </div>
                  <span className="font-medium text-slate-600">
                    {debt.due_date ? formatDateIndo(debt.due_date) : 'Fleksibel'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dynamic Input Modal (Glassmorphism, mobile-first responsive) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg glass-card p-6 md:p-8 rounded-3xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-500" />
                Tambah Hutang Baru
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              >
                Tutup
              </button>
            </div>

            {/* Form Validation Errors */}
            {validationError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Type selector tab pills */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-white rounded-xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => handleTypeChange('cicilan')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  type === 'cicilan' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Cicilan Bulanan
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('gadai')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  type === 'gadai' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Gadai Emas
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('personal')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  type === 'personal' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Personal / Saudara
              </button>
            </div>

            {/* Main Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Creditor Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {type === 'personal' ? 'Nama Pemberi Pinjaman' : 'Nama Kreditur / Instansi'}
                </label>
                <input
                  type="text"
                  required
                  value={creditorName}
                  onChange={(e) => setCreditorName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder={type === 'personal' ? 'Contoh: Paman Budi' : 'Contoh: KPR Bank Mandiri, Pinjol A'}
                />
              </div>

              {/* Principal Amount & Live Rupiah Feedback */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nominal Pokok Hutang (Rupiah)</label>
                  <span className="text-xs font-bold text-emerald-600">
                    {displayRupiahFeedback(principalAmount)}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder="Contoh: 5000000"
                />
              </div>

              {/* Dynamic Pawn / Installment settings */}
              {type !== 'personal' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Interest Rate */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {type === 'gadai' ? 'Bunga per 15 hari (%)' : 'Bunga per bulan (%)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                      placeholder="1.2"
                    />
                  </div>

                  {/* Tenor input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Tenor ({type === 'gadai' ? 'Hari' : 'Bulan'})
                    </label>
                    {type === 'gadai' ? (
                      <select
                        value={tenor}
                        onChange={(e) => setTenor(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                      >
                        <option value="90">90 Hari</option>
                        <option value="120">120 Hari</option>
                        <option value="150">150 Hari</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        required
                        value={tenor}
                        onChange={(e) => setTenor(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                        placeholder="12"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Mulai Pinjam / Gadai</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder="Contoh: No. rekening pembayaran, agunan yang digadaikan, dll."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-sm font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-debt"
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-sm font-semibold shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  Simpan Hutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Debt Detail & Payment Modal */}
      {selectedDebt && (
        <DebtDetailModal
          debt={selectedDebt}
          onClose={() => setSelectedDebt(null)}
          onUpdate={refetch}
        />
      )}

      {/* Scan OCR Modal */}
      {isScanModalOpen && (
        <ScanDebtModal
          onClose={() => setIsScanModalOpen(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}


