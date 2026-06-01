import React, { useState, useEffect, useMemo } from 'react'
import { useDebts } from '../hooks/useDebts'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../utils/formatter'
import { calculateDSR } from '../utils/calculator'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  CartesianGrid, 
  Legend
} from 'recharts'
import { 
  ShieldAlert, 
  Sparkles, 
  AlertTriangle, 
  Layers,
  HelpCircle,
  TrendingDown,
  RefreshCw,
  Percent
} from 'lucide-react'

export const Risk: React.FC = () => {
  const { debts, loading: loadingDebts } = useDebts()
  const [income, setIncome] = useState(0)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [selectedStrategy, setSelectedStrategy] = useState<'snowball' | 'avalanche'>('snowball')

  // Interactive DSR Simulator state
  const [simulatedIncomeOffset, setSimulatedIncomeOffset] = useState<number>(0)
  const [simulatedCommitmentOffset, setSimulatedCommitmentOffset] = useState<number>(0)

  // Simulator States for Gali Lubang Tutup Lubang
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

    const finalIncome = Math.max(1, income + simulatedIncomeOffset)
    const finalCommitment = Math.max(0, totalMonthlyCommitment + simulatedCommitmentOffset)
    const dsr = calculateDSR(finalCommitment, finalIncome)

    return {
      baseMonthlyCommitment: totalMonthlyCommitment,
      totalMonthlyCommitment: finalCommitment,
      income: finalIncome,
      dsr,
      isDsrHigh: dsr > 35
    }
  }, [activeDebts, income, simulatedIncomeOffset, simulatedCommitmentOffset])

  // 2. Payoff Strategy Lists (Both generated for side-by-side comparison)
  const snowballList = useMemo(() => {
    return [...activeDebts].sort((a, b) => a.remaining_amount - b.remaining_amount)
  }, [activeDebts])

  const avalancheList = useMemo(() => {
    return [...activeDebts].sort((a, b) => b.interest_rate - a.interest_rate)
  }, [activeDebts])

  // 3. Simulator calculations
  const debtA = useMemo(() => activeDebts.find(d => d.id === selectedDebtAId), [activeDebts, selectedDebtAId])

  const simulationData = useMemo(() => {
    if (!debtA || !sourceLoanInterest || !sourceLoanTenor) return null

    const rateB = parseFloat(sourceLoanInterest)
    const tenorB = parseInt(sourceLoanTenor)
    const amountToRefinance = debtA.remaining_amount

    if (isNaN(rateB) || isNaN(tenorB)) return null

    // Determine Debt A's remaining months/days to calculate exact remaining interest
    let remainingMonthsA = 0
    let monthlyRateA = debtA.interest_rate

    if (debtA.type === 'cicilan') {
      const start = new Date(debtA.start_date)
      const today = new Date()
      const yearsDiff = today.getFullYear() - start.getFullYear()
      const monthsDiff = today.getMonth() - start.getMonth()
      const monthsElapsed = Math.max(0, (yearsDiff * 12) + monthsDiff)
      
      remainingMonthsA = Math.max(0, (debtA.tenor || 1) - monthsElapsed)
    } else if (debtA.type === 'gadai') {
      const start = new Date(debtA.start_date)
      start.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const diffTime = today.getTime() - start.getTime()
      const daysElapsed = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      const remainingDays = Math.max(0, (debtA.tenor || 120) - daysElapsed)
      
      remainingMonthsA = Math.max(0, Math.ceil(remainingDays / 30)) // approximate as months
      monthlyRateA = debtA.interest_rate * 2 // Gadai is 15-day rate, so monthly is 2x
    } else {
      // personal
      remainingMonthsA = 1
      monthlyRateA = 0
    }

    // Remaining Interest for Debt A if we DO NOT refinance (under flat interest rate model)
    const remainingInterestA = amountToRefinance * (monthlyRateA / 100) * remainingMonthsA

    // Interest for Debt B (refinancing loan)
    const remainingInterestB = amountToRefinance * (rateB / 100) * tenorB

    const isDangerous = rateB > monthlyRateA
    const netLossOrGain = Math.abs(remainingInterestB - remainingInterestA)
    const isLoss = remainingInterestB > remainingInterestA

    // Generate monthly projection data for Recharts Graph
    const maxMonths = Math.max(remainingMonthsA, tenorB, 1)
    const chartPoints = []

    for (let m = 0; m <= maxMonths; m++) {
      // Cumulative interest calculated over months
      let cumIntA = 0
      if (debtA.type === 'cicilan' || debtA.type === 'gadai') {
        const activeM = Math.min(m, remainingMonthsA)
        cumIntA = amountToRefinance * (monthlyRateA / 100) * activeM
      }

      const activeM_B = Math.min(m, tenorB)
      const cumIntB = amountToRefinance * (rateB / 100) * activeM_B

      chartPoints.push({
        month: `Bulan ${m}`,
        'Hutang A (Berjalan)': Math.round(cumIntA),
        'Hutang B (Simulasi Baru)': Math.round(cumIntB),
      })
    }

    return {
      amountToRefinance,
      interestA: remainingInterestA,
      interestB: remainingInterestB,
      rateA: monthlyRateA,
      rateB,
      isDangerous,
      netLossOrGain,
      isLoss,
      remainingMonthsA,
      tenorB,
      chartPoints
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
  // Clean dynamic coloring: Green if DSR <= 35%, Red if DSR > 35%
  const gaugeColor = totals.dsr > 35 ? '#ef4444' : '#10b981'
  const glowShadow = totals.dsr > 35 
    ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' 
    : 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
          <ShieldAlert className="text-purple-500" />
          Rasio Cicilan & Strategi Bebas Hutang
        </h1>
        <p className="text-slate-400 text-sm">
          Pantau kesehatan keuangan kamu dan simulasikan cara pelunasan yang paling tepat.
        </p>
      </div>

      {/* TOP SECTION: Gauge DSR & Interactive Simulators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DSR SVG CIRCULAR GAUGE WITH INTERACTIVE ADJUSTMENTS */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Rasio Cicilan (DSR)</h2>
            
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
              {/* SVG Circular Ring */}
              <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-slate-800/60"
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
                  style={{ filter: glowShadow }}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-100">{totals.dsr}%</span>
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full mt-1 ${
                  totals.dsr > 35 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {totals.dsr > 35 ? '🔴 Bahaya (>35%)' : '🟢 Aman (≤35%)'}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-1">
              <p className="text-xs text-slate-300 font-medium">
                Total Cicilan Bulanan: <strong className="text-white">{formatRupiah(totals.totalMonthlyCommitment)}</strong>
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">
                Gaji Bulanan Kamu: {formatRupiah(totals.income)}
              </p>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="w-full mt-6 pt-4 border-t border-slate-800/80 space-y-4 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coba Simulasikan Keuanganmu</span>
            
             {/* Income Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Simulasi Gaji Bulanan</span>
                <span className="font-semibold text-slate-200">
                  {simulatedIncomeOffset >= 0 ? '+' : ''}{formatRupiah(simulatedIncomeOffset)}
                </span>
              </div>
              <input
                type="range"
                min={-Math.round(income * 0.8)}
                max={Math.round(income * 2)}
                step={500000}
                value={simulatedIncomeOffset}
                onChange={(e) => setSimulatedIncomeOffset(Number(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Installment Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Simulasi Nambah Cicilan Baru</span>
                <span className="font-semibold text-slate-200">+{formatRupiah(simulatedCommitmentOffset)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={15000000}
                step={250000}
                value={simulatedCommitmentOffset}
                onChange={(e) => setSimulatedCommitmentOffset(Number(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {(simulatedIncomeOffset !== 0 || simulatedCommitmentOffset !== 0) && (
              <button
                onClick={() => {
                  setSimulatedIncomeOffset(0)
                  setSimulatedCommitmentOffset(0)
                }}
                className="w-full py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw size={10} />
                Kembalikan ke Awal (Reset)
              </button>
            )}
          </div>
        </div>

        {/* STRATEGY RECOMMENDATIONS COMPARATOR (Snowball vs Avalanche Side-by-Side) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Rekomendasi Metode Pelunasan</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Metode Terpilih:</span>
                <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
                  <button
                    onClick={() => setSelectedStrategy('snowball')}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      selectedStrategy === 'snowball' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Snowball
                  </button>
                  <button
                    onClick={() => setSelectedStrategy('avalanche')}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      selectedStrategy === 'avalanche' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Avalanche
                  </button>
                </div>
              </div>
            </div>
            
            <hr className="border-slate-800/80" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method A Info */}
              <div className={`p-4 rounded-2xl border transition-all ${
                selectedStrategy === 'snowball' ? 'bg-purple-950/20 border-purple-500/30' : 'bg-slate-900/40 border-slate-800/80'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="text-purple-400" size={16} />
                  <span className="text-xs font-bold text-slate-200">Snowball ❄️ (Fokus Nominal Kecil)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Urutin tagihan kamu dari sisa nominal terkecil ke terbesar. Sangat direkomendasikan biar dapet rasa puas/lega duluan pas ada hutang yang beres!
                </p>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {snowballList.map((item, idx) => (
                    <div key={item.id} className="bg-slate-950/50 p-2 rounded-lg border border-slate-850 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold">#{idx + 1} {item.creditor_name}</span>
                      <span className="text-slate-200 font-semibold">{formatRupiah(item.remaining_amount)}</span>
                    </div>
                  ))}
                  {snowballList.length === 0 && <span className="text-[11px] text-slate-500 italic">Tidak ada hutang aktif</span>}
                </div>
              </div>

              {/* Method B Info */}
              <div className={`p-4 rounded-2xl border transition-all ${
                selectedStrategy === 'avalanche' ? 'bg-purple-950/20 border-purple-500/30' : 'bg-slate-900/40 border-slate-800/80'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="text-purple-400" size={16} />
                  <span className="text-xs font-bold text-slate-200">Avalanche ⚡ (Hajar Bunga Terbesar)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Urutin tagihan kamu berdasarkan bunga tertinggi ke terendah. Paling hemat karena langsung nekan akumulasi biaya bunga berjalan!
                </p>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {avalancheList.map((item, idx) => (
                    <div key={item.id} className="bg-slate-950/50 p-2 rounded-lg border border-slate-850 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold">#{idx + 1} {item.creditor_name}</span>
                      <span className="text-slate-200 font-semibold">{item.type === 'personal' ? '0%' : `${item.interest_rate}%`}</span>
                    </div>
                  ))}
                  {avalancheList.length === 0 && <span className="text-[11px] text-slate-500 italic">Tidak ada hutang aktif</span>}
                </div>
              </div>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex gap-2">
              <Sparkles className="text-purple-400 shrink-0 mt-0.5" size={14} />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Saran Zeth Finance:</strong> Pilih metode <strong className="text-white">Avalanche</strong> kalau kamu mau hemat total pembayaran bunga, atau pilih metode <strong className="text-white">Snowball</strong> kalau kamu butuh dorongan mental dengan melunasi tagihan-tagihan kecil satu per satu secara cepat.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: GALI LUBANG TUTUP LUBANG SIMULATOR */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="text-purple-500" />
            Simulator Gali Lubang Tutup Lubang 🕳️
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Simulasiin efeknya kalau kamu nekat ngambil pinjaman baru cuma buat nutupin tagihan lama.
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Hutang Lama yang Mau Dilunasi (Hutang A)</label>
              <select
                value={selectedDebtAId}
                onChange={(e) => setSelectedDebtAId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Pilih Hutang Kamu Saat Ini --</option>
                {activeDebts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.creditor_name} - Sisa: {formatRupiah(d.remaining_amount)} (Bunga: {d.type === 'personal' ? '0' : d.interest_rate}%)
                  </option>
                ))}
              </select>
            </div>

            {debtA && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Detail Pinjaman Baru (Hutang B)</p>
                
                {/* Source Loan Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Nama Pinjaman / Kreditur Baru</label>
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
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Bunga Pinjaman Baru (% per Bulan)</label>
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
            {!simulationData ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-900/30 rounded-2xl border border-slate-800/40">
                <Layers className="text-slate-700 mb-2" size={24} />
                <p className="text-xs text-slate-500 font-medium">Lengkapi skenario di sebelah kiri untuk melihat hasil dampak simulasi.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hasil Analisis Simulasi</h3>
                
                {simulationData.isDangerous ? (
                  /* WARNING TEXT (Owner's requirement: bright red, warning tag) */
                  <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl space-y-1.5 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-red-500">
                      <AlertTriangle size={18} className="animate-pulse" />
                      <span>🚨 BAHAYA BANGET! (Gali Lubang Tutup Lubang)</span>
                    </div>
                    <p className="text-xs text-slate-300 font-normal leading-relaxed">
                      Kamu mencoba bayar hutang lama bermotif bunga (<span className="text-white font-bold">{simulationData.rateA}%</span>) pakai pinjaman baru yang bunganya malah lebih gede (<span className="text-red-500 font-bold">{simulationData.rateB}%</span>). Ini bakal bikin kamu makin tenggelam dalam jebakan bunga!
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Sparkles size={18} />
                      <span>✅ Boleh Dicoba (Konsolidasi Bunga)</span>
                    </div>
                    <p className="text-xs text-slate-300 font-normal leading-relaxed">
                      Pinjaman baru punya bunga (<span className="text-emerald-400 font-bold">{simulationData.rateB}%</span>) yang lebih rendah daripada hutang lama (<span className="text-white font-bold">{simulationData.rateA}%</span>). Cara ini secara hitungan aman buat memangkas total beban bunga kamu.
                    </p>
                  </div>
                )}

                {/* Recharts chart showing cumulative interest projections */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">Grafik Akumulasi Beban Bunga</span>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={simulationData.chartPoints}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={simulationData.isDangerous ? '#ef4444' : '#10b981'} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={simulationData.isDangerous ? '#ef4444' : '#10b981'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 9 }} />
                        <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                        <ChartTooltip 
                          contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '12px' }}
                          labelStyle={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8' }}
                          itemStyle={{ fontSize: 11, color: '#f8fafc' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                        <Area 
                          type="monotone" 
                          dataKey="Hutang A (Berjalan)" 
                          stroke="#8b5cf6" 
                          fillOpacity={1} 
                          fill="url(#colorA)" 
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Hutang B (Simulasi Baru)" 
                          stroke={simulationData.isDangerous ? '#ef4444' : '#10b981'} 
                          fillOpacity={1} 
                          fill="url(#colorB)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Mathematical visual breakdowns */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/85 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Jumlah Pengalihan Dana</span>
                    <span className="text-slate-200 font-bold">{formatRupiah(simulationData.amountToRefinance)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Beban Bunga Hutang A (Asal)</span>
                    <span className="text-slate-200 font-semibold">{formatRupiah(simulationData.interestA)} ({simulationData.remainingMonthsA} bulan)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Beban Bunga Hutang B (Baru)</span>
                    <span className={`font-semibold ${simulationData.isLoss ? 'text-red-500' : 'text-emerald-400'}`}>
                      {formatRupiah(simulationData.interestB)} ({simulationData.tenorB} bulan)
                    </span>
                  </div>

                  <hr className="border-slate-800" />

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 font-bold">
                      {simulationData.isLoss ? 'Potensi Kerugian Akumulatif' : 'Potensi Penghematan Bunga'}
                    </span>
                    <span className={`font-extrabold ${simulationData.isLoss ? 'text-red-500 text-base' : 'text-emerald-400 text-base'}`}>
                      {formatRupiah(simulationData.netLossOrGain)}
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
