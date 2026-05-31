import React, { useState, useEffect, useMemo } from 'react'
import { useDebts } from '../hooks/useDebts'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../utils/formatter'
import { calculateDSR } from '../utils/calculator'
import { 
  ShieldAlert, 
  Sparkles, 
  AlertTriangle, 
  Info,
  Layers,
  HelpCircle
} from 'lucide-react'


export const Risk: React.FC = () => {
  const { debts, loading: loadingDebts } = useDebts()
  const [income, setIncome] = useState(0)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [selectedStrategy, setSelectedStrategy] = useState<'snowball' | 'avalanche'>('snowball')

  // Simulator States
  const [selectedDebtAId, setSelectedDebtAId] = useState('')
  const [sourceLoanName, setSourceLoanName] = useState('')
  const [sourceLoanInterest, setSourceLoanInterest] = useState('')
  const [sourceLoanTenor, setSourceLoanTenor] = useState('')

  // Load user income settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('user_settings')
          .select('monthly_income')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setIncome(Number(data.monthly_income) || 0)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
      } finally {
        setLoadingConfig(false)
      }
    }
    loadSettings()
  }, [])

  // 1. Calculate Active commitments and DSR
  const activeDebts = useMemo(() => debts.filter(d => d.status === 'active'), [debts])

  const totals = useMemo(() => {
    const totalMonthlyCommitment = activeDebts.reduce((sum, d) => {
      if (d.type === 'cicilan') {
        const baseInstallment = d.principal_amount / (d.tenor || 1)
        const interestInstallment = d.principal_amount * (d.interest_rate / 100)
        return sum + baseInstallment + interestInstallment
      }
      if (d.type === 'gadai') {
        return sum + (d.principal_amount * (d.interest_rate / 100) * 2)
      }
      return sum
    }, 0)

    const dsr = calculateDSR(totalMonthlyCommitment, income)
    return {
      totalMonthlyCommitment,
      dsr,
      isDsrHigh: dsr > 35
    }
  }, [activeDebts, income])

  // 2. Payoff Strategy Lists
  const strategyList = useMemo(() => {
    const sorted = [...activeDebts]
    if (selectedStrategy === 'snowball') {
      // Snowball: Smallest remaining_amount first
      return sorted.sort((a, b) => a.remaining_amount - b.remaining_amount)
    } else {
      // Avalanche: Highest interest_rate first, personal (0 interest) last
      return sorted.sort((a, b) => b.interest_rate - a.interest_rate)
    }
  }, [activeDebts, selectedStrategy])

  // 3. Simulator calculations
  const debtA = useMemo(() => activeDebts.find(d => d.id === selectedDebtAId), [activeDebts, selectedDebtAId])

  const simulationResult = useMemo(() => {
    if (!debtA || !sourceLoanInterest || !sourceLoanTenor) return null

    const rateB = parseFloat(sourceLoanInterest)
    const tenorB = parseInt(sourceLoanTenor)
    const amountToRefinance = debtA.remaining_amount

    if (isNaN(rateB) || isNaN(tenorB)) return null

    // Determine Debt A's remaining interest cost
    // For cicilan, approximate remaining months
    let remainingInterestA = 0
    let monthlyRateA = debtA.interest_rate

    if (debtA.type === 'cicilan') {
      remainingInterestA = amountToRefinance * (monthlyRateA / 100) * (debtA.tenor || 1)
    } else if (debtA.type === 'gadai') {
      // 1 period of 15 days = 1.2%. Monthly equivalent = 2.4%
      monthlyRateA = debtA.interest_rate * 2
      remainingInterestA = amountToRefinance * (debtA.interest_rate / 100) * ((debtA.tenor || 120) / 15)
    }

    // Determine Debt B's interest cost
    // Assumed monthly rate for the source loan
    const remainingInterestB = amountToRefinance * (rateB / 100) * tenorB

    const isDangerous = rateB > monthlyRateA
    const netLossOrGain = Math.abs(remainingInterestB - remainingInterestA)


    return {
      amountToRefinance,
      interestA: remainingInterestA,
      interestB: remainingInterestB,
      rateA: monthlyRateA,
      rateB,
      isDangerous,
      netLossOrGain,
      saving: remainingInterestA - remainingInterestB
    }
  }, [debtA, sourceLoanInterest, sourceLoanTenor])

  if (loadingDebts || loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
        <span className="text-slate-500 text-xs font-medium">Memuat analisis risiko...</span>
      </div>
    )
  }

  // Circular Gauge Calculations
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const dsrValue = Math.min(totals.dsr, 100)
  const strokeDashoffset = circumference - (dsrValue / 100) * circumference
  const gaugeColor = totals.isDsrHigh ? '#f43f5e' : '#10b981' // Red if DSR > 35%, else green

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
          <ShieldAlert className="text-purple-500" />
          Manajemen Risiko & Strategi
        </h1>
        <p className="text-slate-400 text-sm">
          Analisis rasio cicilan bulanan Anda dan simulasikan strategi pelunasan terbaik.
        </p>
      </div>

      {/* TOP SECTION: Gauge DSR & Strategy recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DSR SVG CIRCULAR GAUGE */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col items-center justify-center text-center">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Debt Service Ratio (DSR)</h2>
          
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* SVG Circular Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={gaugeColor}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-100">{totals.dsr}%</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">Batas Aman: 35%</span>
            </div>
          </div>

          <div className="mt-6 space-y-1">
            <p className="text-xs text-slate-300 font-medium">
              Komitmen Bulanan: <strong className="text-white">{formatRupiah(totals.totalMonthlyCommitment)}</strong>
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              Pendapatan Terdaftar: {formatRupiah(income)}
            </p>
          </div>
        </div>

        {/* STRATEGY RECOMMENDATIONS (Snowball vs Avalanche) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Rekomendasi Strategi Pelunasan</h2>
              
              {/* Strategy Selector Switch */}
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedStrategy('snowball')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedStrategy === 'snowball' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Snowball
                </button>
                <button
                  onClick={() => setSelectedStrategy('avalanche')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedStrategy === 'avalanche' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Avalanche
                </button>
              </div>
            </div>
            
            <hr className="border-slate-800/80" />

            <div className="p-3 bg-purple-600/5 border border-purple-500/15 rounded-xl text-xs text-slate-400 leading-relaxed flex gap-2.5">
              <Info className="text-purple-400 shrink-0 mt-0.5" size={14} />
              <p>
                {selectedStrategy === 'snowball' 
                  ? 'Metode Snowball mengurutkan pembayaran dari hutang terkecil terlebih dahulu untuk memberikan suntikan motivasi psikologis setiap kali satu tagihan lunas.'
                  : 'Metode Avalanche mengutamakan pelunasan hutang dengan suku bunga tertinggi terlebih dahulu untuk meminimalkan beban bunga secara keseluruhan.'}
              </p>
            </div>

            {/* payoffs list queue */}
            {strategyList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">Belum ada tagihan aktif untuk dianalisis.</p>
            ) : (
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                {strategyList.map((item, index) => (
                  <div key={item.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-200">{item.creditor_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                          {item.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-200">{formatRupiah(item.remaining_amount)}</p>
                      {item.type !== 'personal' && (
                        <p className="text-[10px] text-slate-500 font-medium">Bunga: {item.interest_rate}%</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: GALI LUBANG TUTUP LUBANG SIMULATOR */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="text-purple-500" />
            Simulator Gali Lubang Tutup Lubang
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Simulasikan dampak nyata jika Anda membayar satu tagihan menggunakan dana pinjaman baru dari tempat lain.
          </p>
        </div>

        <hr className="border-slate-800/80" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Simulator Form Inputs */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <HelpCircle size={14} className="text-purple-400" />
              Skenario Simulasi
            </h3>

            {/* Selection Debt A */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Hutang Yang Akan Dibayar (Hutang A)</label>
              <select
                value={selectedDebtAId}
                onChange={(e) => setSelectedDebtAId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Pilih Hutang Aktif --</option>
                {activeDebts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.creditor_name} - Sisa: {formatRupiah(d.remaining_amount)} (Bunga: {d.type === 'personal' ? '0' : d.interest_rate}%)
                  </option>
                ))}
              </select>
            </div>

            {debtA && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Parameter Pinjaman Baru (Hutang B)</p>
                
                {/* Source Loan Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Nama Kreditur Baru</label>
                  <input
                    type="text"
                    value={sourceLoanName}
                    onChange={(e) => setSourceLoanName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                    placeholder="Contoh: Pinjol B, Kartu Kredit X"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Source Loan Interest */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Bunga Pinjaman Baru (% / Bulan)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sourceLoanInterest}
                      onChange={(e) => setSourceLoanInterest(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                      placeholder="Contoh: 3.5"
                    />
                  </div>

                  {/* Source Loan Tenor */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Tenor Pinjaman Baru (Bulan)</label>
                    <input
                      type="number"
                      value={sourceLoanTenor}
                      onChange={(e) => setSourceLoanTenor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                      placeholder="Contoh: 12"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simulator Calculations Visual Outputs */}
          <div className="flex flex-col justify-center">
            {!simulationResult ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-900/30 rounded-2xl border border-slate-800/40">
                <Layers className="text-slate-700 mb-2" size={24} />
                <p className="text-xs text-slate-500 font-medium">Lengkapi skenario di sebelah kiri untuk melihat hasil dampak simulasi.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hasil Analisis Simulasi</h3>
                
                {simulationResult.isDangerous ? (
                  /* WARNING TEXT (Owner's requirement: bright red, warning tag) */
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <AlertTriangle size={18} className="animate-pulse" />
                      <span>Sangat Tidak Direkomendasikan!</span>
                    </div>
                    <p className="text-xs text-slate-300 font-normal leading-relaxed">
                      Anda mencoba membayar hutang bunga rendah (<span className="text-white font-bold">{simulationResult.rateA}%</span>) menggunakan pinjaman baru dengan suku bunga lebih tinggi (<span className="text-rose-400 font-bold">{simulationResult.rateB}%</span>). Tindakan ini akan menambah beban bunga berjalan secara signifikan!
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Sparkles size={18} />
                      <span>Pelunasan Konsolidasi Alternatif</span>
                    </div>
                    <p className="text-xs text-slate-300 font-normal leading-relaxed">
                      Pinjaman baru memiliki suku bunga lebih rendah (<span className="text-emerald-400 font-bold">{simulationResult.rateB}%</span>) dibanding hutang asal (<span className="text-white font-bold">{simulationResult.rateA}%</span>). Skema restrukturisasi/take-over ini secara teoritis menguntungkan.
                    </p>
                  </div>
                )}

                {/* Mathematical visual breakdowns */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/85 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Jumlah Pengalihan Dana</span>
                    <span className="text-slate-200 font-bold">{formatRupiah(simulationResult.amountToRefinance)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Beban Bunga Hutang A (Asal)</span>
                    <span className="text-slate-200 font-semibold">{formatRupiah(simulationResult.interestA)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Beban Bunga Hutang B (Baru)</span>
                    <span className={`font-semibold ${simulationResult.isDangerous ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatRupiah(simulationResult.interestB)}
                    </span>
                  </div>

                  <hr className="border-slate-800" />

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 font-bold">
                      {simulationResult.isDangerous ? 'Potensi Kerugian Akumulatif' : 'Potensi Penghematan Bunga'}
                    </span>
                    <span className={`font-extrabold ${simulationResult.isDangerous ? 'text-rose-500 text-base' : 'text-emerald-400 text-base'}`}>
                      {formatRupiah(simulationResult.netLossOrGain)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
