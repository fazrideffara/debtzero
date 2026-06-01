import React, { useState, useEffect, useMemo } from 'react'
import { useDebts } from '../hooks/useDebts'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../utils/formatter'
import { calculateDSR, determineRiskColor } from '../utils/calculator'
import { checkAndTriggerReminders } from '../lib/telegram'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts'
import { 
  TrendingDown, 
  BellRing, 
  Sparkles, 
  AlertTriangle,
  LayoutDashboard,
  ArrowRight,
  Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'


export const Dashboard: React.FC = () => {
  const { debts, loading: loadingDebts } = useDebts()
  const [income, setIncome] = useState(0)
  const [payments, setPayments] = useState<any[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  // 1. Fetch User Settings & Payments
  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch user settings
        const { data: settings } = await supabase
          .from('user_settings')
          .select('monthly_income')
          .eq('user_id', user.id)
          .single()

        if (active && settings) {
          setIncome(Number(settings.monthly_income) || 0)
        }


        // Fetch all payments for trend calculation
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount, paid_at')
          .order('paid_at', { ascending: true })

        if (active && paymentsData) {
          setPayments(paymentsData)
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        if (active) setLoadingConfig(false)
      }
    }

    loadDashboardData()
    return () => {
      active = false
    }
  }, [])

  // Trigger Telegram reminders once debts are loaded
  useEffect(() => {
    if (loadingDebts || debts.length === 0) return

    async function triggerReminders() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await checkAndTriggerReminders(debts, user.id)
        }
      } catch (err) {
        console.error('Gagal menjalankan trigger Telegram:', err)
      }
    }

    triggerReminders()
  }, [debts, loadingDebts])

  // 2. Memoized Financial Calculations (ZARA: Query efficiency and memoization to prevent re-renders)
  const calculations = useMemo(() => {
    // Total Current Outstanding
    const totalDebt = debts.reduce((sum, d) => sum + d.remaining_amount, 0)

    // Calculate Monthly Commitment for DSR
    const totalMonthlyCommitment = debts.reduce((sum, d) => {
      if (d.status === 'completed') return sum
      if (d.type === 'cicilan') {
        const baseInstallment = d.principal_amount / (d.tenor || 1)
        const interestInstallment = d.principal_amount * (d.interest_rate / 100)
        return sum + baseInstallment + interestInstallment
      }
      if (d.type === 'gadai') {
        // Pawn monthly cost is interest per 15 days * 2
        return sum + (d.principal_amount * (d.interest_rate / 100) * 2)
      }
      return sum // Personal has no fixed monthly commitment
    }, 0)

    const dsr = calculateDSR(totalMonthlyCommitment, income)
    const dsrWarning = dsr > 35

    // Count urgent/overdue debts
    const urgentCount = debts.filter(d => {
      if (d.status === 'completed') return false
      return determineRiskColor(d.due_date, dsrWarning) === 'red'
    }).length

    // Sum of debts paid off this month
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    // We get completed debts that were resolved this month (we approximate from payments)
    const completedThisMonth = debts.filter(d => {
      if (d.status !== 'completed') return false
      const start = new Date(d.start_date)
      return start.getMonth() === currentMonth && start.getFullYear() === currentYear
    }).length

    return {
      totalDebt,
      dsr,
      dsrWarning,
      urgentCount,
      completedThisMonth,
    }
  }, [debts, income])

  // 3. Memoized Recharts Trend Data
  const chartData = useMemo(() => {
    if (debts.length === 0) return []

    // Sum of initial principal of all debts
    const initialDebtSum = debts.reduce((sum, d) => sum + d.principal_amount, 0)
    
    if (payments.length === 0) {
      // Return simple flat line representing current status if no payments exist
      return [
        { date: 'Initial', totalDebt: initialDebtSum },
        { date: 'Sekarang', totalDebt: calculations.totalDebt }
      ]
    }

    let runningTotal = initialDebtSum
    const trendPoints = [
      { date: 'Mulai', totalDebt: runningTotal }
    ]

    // Group payments by date to avoid duplicate days on XAxis
    const paymentsByDate: { [key: string]: number } = {}
    payments.forEach(p => {
      const dateStr = new Date(p.paid_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short'
      })
      paymentsByDate[dateStr] = (paymentsByDate[dateStr] || 0) + Number(p.amount)
    })

    // Substract sequentially to plot the trend
    Object.keys(paymentsByDate).forEach(dateLabel => {
      runningTotal = Math.max(0, runningTotal - paymentsByDate[dateLabel])
      trendPoints.push({
        date: dateLabel,
        totalDebt: runningTotal
      })
    })

    return trendPoints
  }, [debts, payments, calculations.totalDebt])

  const globalRisk = calculations.urgentCount > 0 ? 'red' : calculations.dsrWarning ? 'yellow' : 'green'

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const startDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = []
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }, [currentDate])

  const getDebtsForDate = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`
    return debts.filter(d => d.due_date === dateStr && d.status === 'active')
  }

  const debtsForSelectedDate = useMemo(() => {
    if (!selectedCalendarDate) return []
    return debts.filter(d => d.due_date === selectedCalendarDate && d.status === 'active')
  }, [debts, selectedCalendarDate])

  if (loadingDebts || loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
        <span className="text-slate-500 text-xs font-medium">Memuat dashboard BebasHutang...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="text-emerald-500" />
            Dashboard Utama
          </h1>
          <p className="text-slate-500 text-sm">
            Status kesehatan keuangan personal Anda berdasarkan rasio hutang saat ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">Status Risiko:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            globalRisk === 'red' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
            globalRisk === 'yellow' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
            'bg-emerald-100 text-emerald-750 border border-emerald-200'
          }`}>
            {globalRisk === 'red' ? '🔴 Bahaya (Harap Bayar)' : 
             globalRisk === 'yellow' ? '🟡 Peringatan (Rasio DSR Tinggi / Jatuh Tempo Dekat)' : 
             '🟢 Aman'}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Outstanding */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total Sisa Hutang</p>
          <p className="text-3xl font-bold mt-2 text-slate-800">{formatRupiah(calculations.totalDebt)}</p>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-500">
            <TrendingDown size={14} className="text-emerald-500" />
            <span>Aktif memantau {debts.length} catatan</span>
          </div>
        </div>

        {/* Urgent Debts */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Hutang Urgent (&lt; 3 Hari)</p>
          <p className="text-3xl font-bold mt-2 text-slate-800">{calculations.urgentCount}</p>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-500">
            <BellRing size={14} className={calculations.urgentCount > 0 ? 'text-rose-500' : 'text-slate-400'} />
            <span className={calculations.urgentCount > 0 ? 'text-rose-600 font-bold' : ''}>
              {calculations.urgentCount > 0 ? 'Ada tagihan segera jatuh tempo' : 'Semua tagihan aman'}
            </span>
          </div>
        </div>

        {/* Debt Service Ratio */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Debt Service Ratio (DSR)</p>
          <p className={`text-3xl font-bold mt-2 ${calculations.dsrWarning ? 'text-rose-600' : 'text-slate-800'}`}>
            {calculations.dsr} %
          </p>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-500">
            {calculations.dsrWarning ? (
              <>
                <AlertTriangle size={14} className="text-rose-500" />
                <span className="text-rose-600 font-bold">DSR melebihi ambang batas 35%!</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-emerald-500" />
                <span>Rasio cicilan bulanan sehat</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DSR Warning Alert Banner */}
      {calculations.dsrWarning && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
          <AlertTriangle className="shrink-0 animate-bounce" size={18} />
          <p>
            Rasio hutang bulanan Anda (DSR) berada di atas batas aman 35%. Zeth Finance merekomendasikan Anda untuk tidak menambah hutang baru dan fokus pada pelunasan prioritas (Avalanche/Snowball) di halaman <Link to="/risk" className="underline font-bold text-slate-900 hover:text-emerald-600">Risk & Strategy</Link>.
          </p>
        </div>
      )}

      {/* Grid: Graph and Quick Action Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Chart Card */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="text-emerald-500" />
            Tren Penurunan Total Hutang
          </h2>
          <hr className="border-slate-200" />
          
          <div className="w-full h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(value) => `Rp ${value / 1000000}M`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(Number(value)), 'Total Hutang']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  labelStyle={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalDebt" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#a7f3d0' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Strategy Suggestion Box */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-emerald-500 animate-pulse" />
              Saran Keuangan
            </h2>
            <hr className="border-slate-200" />
            
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Sistem BebasHutang mendeteksi Anda memiliki total sisa tagihan sebesar <strong className="text-slate-700 font-bold">{formatRupiah(calculations.totalDebt)}</strong>.
            </p>
            
            {globalRisk === 'red' ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold space-y-1">
                <p>🚨 Tindakan Segera:</p>
                <p className="font-normal text-slate-600">Ada tagihan dengan jatuh tempo sangat dekat. Segera lakukan perpanjangan gadai atau pembayaran cicilan untuk menghindari denda.</p>
              </div>
            ) : calculations.dsrWarning ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold space-y-1">
                <p>⚠️ Evaluasi Bulanan:</p>
                <p className="font-normal text-slate-600">Rasio DSR di atas 35% rawan menyebabkan gali lubang tutup lubang. Coba kurangi pengeluaran non-primer bulanan Anda.</p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold space-y-1">
                <p>🟢 Kondisi Sehat:</p>
                <p className="font-normal text-slate-600">Keuangan bulanan dan rasio hutang Anda berada dalam zona aman. Pertahankan momentum pembayaran teratur ini.</p>
              </div>
            )}
          </div>

          <Link
            id="dashboard-strategy-btn"
            to="/risk"
            className="mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-150 hover:bg-emerald-50 text-xs font-bold text-emerald-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-500/30 transition-all text-center"
          >
            <span>Buka Halaman Strategy</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Calendar Visualizer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Calendar Widget Card */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-emerald-500" />
              Kalender Jatuh Tempo Tagihan
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const prev = new Date(currentDate)
                  prev.setMonth(currentDate.getMonth() - 1)
                  setCurrentDate(prev)
                  setSelectedCalendarDate(null)
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
              >
                &larr;
              </button>
              <span className="text-xs font-extrabold text-slate-700">
                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  const next = new Date(currentDate)
                  next.setMonth(currentDate.getMonth() + 1)
                  setCurrentDate(next)
                  setSelectedCalendarDate(null)
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
              >
                &rarr;
              </button>
            </div>
          </div>
          <hr className="border-slate-250/60 animate-pulse" />
          
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/30 rounded-xl"></div>
              
              const dayDebts = getDebtsForDate(day)
              const hasDebts = dayDebts.length > 0
              
              const yyyy = day.getFullYear()
              const mm = String(day.getMonth() + 1).padStart(2, '0')
              const dd = String(day.getDate()).padStart(2, '0')
              const dateStr = `${yyyy}-${mm}-${dd}`
              
              const isSelected = selectedCalendarDate === dateStr
              
              // Find most urgent debt color on this day
              let dotColor = 'bg-emerald-500'
              if (dayDebts.some(d => {
                const remaining = Math.ceil((new Date(d.due_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                return remaining < 3
              })) {
                dotColor = 'bg-rose-500'
              } else if (dayDebts.some(d => {
                const remaining = Math.ceil((new Date(d.due_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                return remaining <= 7
              })) {
                dotColor = 'bg-amber-500'
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => hasDebts && setSelectedCalendarDate(dateStr)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-between p-2 relative transition-all border ${
                    isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-extrabold ring-2 ring-emerald-500/20' :
                    hasDebts ? 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-800 font-bold cursor-pointer shadow-sm' :
                    'border-transparent text-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <span className="text-[11px]">{day.getDate()}</span>
                  {hasDebts && (
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} absolute bottom-2`}></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Date Detail panel */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Detail Tanggal Jatuh Tempo</h2>
            <hr className="border-slate-250/60" />
            
            {selectedCalendarDate ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-700 font-bold">
                  Tagihan Jatuh Tempo Pada: <span className="text-emerald-600">{new Date(selectedCalendarDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </p>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {debtsForSelectedDate.map(debt => (
                    <div key={debt.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-slate-800">{debt.creditor_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          debt.type === 'cicilan' ? 'bg-emerald-100 text-emerald-700' :
                          debt.type === 'gadai' ? 'bg-amber-100 text-amber-700' :
                          'bg-teal-100 text-teal-700'
                        }`}>{debt.type}</span>
                      </div>
                      <div className="flex justify-between text-slate-550">
                        <span>Sisa Tagihan:</span>
                        <strong className="text-slate-700">{formatRupiah(debt.remaining_amount)}</strong>
                      </div>
                      {debt.interest_rate > 0 && (
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>Bunga:</span>
                          <span>{debt.interest_rate}% / {debt.interest_period === '15days' ? '15 Hari' : 'Bulan'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Calendar size={32} className="mx-auto opacity-50" />
                <p className="text-xs">Klik tanggal yang memiliki titik indikator untuk melihat rincian tagihan jatuh tempo.</p>
              </div>
            )}
          </div>
          
          {selectedCalendarDate && (
            <button
              onClick={() => setSelectedCalendarDate(null)}
              className="mt-6 w-full py-2 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-xs font-bold text-slate-650 rounded-xl transition-all cursor-pointer text-center"
            >
              Reset Pilihan Tanggal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
