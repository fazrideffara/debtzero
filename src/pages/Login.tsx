import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight, 
  ArrowLeft, 
  Calculator, 
  TrendingDown
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../utils/formatter'

export const Login: React.FC = () => {
  // Navigation & Auth Form States
  const [step, setStep] = useState<'hero' | 'quiz' | 'calculator' | 'auth'>('hero')
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  // Quiz States
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<string[]>([])

  // Calculator States
  const [calcDebt, setCalcDebt] = useState('')
  const [calcPay, setCalcPay] = useState('')
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    // If user is already logged in, redirect directly to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })
  }, [navigate])

  const quizQuestions = [
    {
      question: "Tipe hutang apa nih yang paling sering bikin kamu kepikiran pas mau tidur?",
      options: [
        "Pinjol & Paylater (udah numpuk dan bunganya ngeri)",
        "Kartu Kredit (dikit-dikit gesek, tagihan membesar)",
        "Hutang ke temen atau keluarga (sungkan nagih, malu kalau ketemu)",
        "Cicilan KPR / Motor / Mobil (beban bulanan lumayan berat)"
      ]
    },
    {
      question: "Berapa persen dari pemasukan bulanan kamu habis cuma buat bayar cicilan?",
      options: [
        "Di bawah 30% - Masih aman santai kok",
        "30% sampai 50% - Mulai sesak napas tiap awal bulan",
        "Di atas 50% - Gali lubang tutup lubang terus-terusan!"
      ]
    },
    {
      question: "Gaya pelunasan mana yang paling cocok sama kepribadian kamu?",
      options: [
        "Snowball - Beresin yang kecil-kecil dulu biar cepet ngerasa lega",
        "Avalanche - Hajar yang bunganya paling gede biar hemat jangka panjang",
        "Urgensi - Prioritasin yang paling mepet tanggal jatuh temponya"
      ]
    }
  ]

  const handleQuizAnswer = (option: string) => {
    const newAnswers = [...quizAnswers, option]
    setQuizAnswers(newAnswers)
    
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(quizIndex + 1)
    } else {
      setStep('calculator')
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      if (isRegister) {
        // Register flow
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        if (error) throw error
        
        setSuccessMessage('Registrasi berhasil! Silakan periksa kotak masuk email Anda untuk verifikasi link.')
        setIsRegister(false)
      } else {
        // Login flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat autentikasi.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate Payoff Months
  const totalDebt = parseFloat(calcDebt) || 0
  const monthlyPay = parseFloat(calcPay) || 0
  const estMonths = monthlyPay > 0 ? Math.ceil(totalDebt / monthlyPay) : 0

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Visual background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-lg glass-card p-6 md:p-8 rounded-3xl relative z-10 border border-slate-800/80 shadow-2xl transition-all duration-300">
        
        {/* HERO STEP */}
        {step === 'hero' && (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2">
              <ShieldCheck size={36} className="animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
              Mulai Langkah Pertama <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Bebas Hutang</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-md mx-auto">
              Pusing dikejar pinjol? Kebanyakan cicilan paylater? Tenang, yuk beresin bareng <strong className="text-purple-400">BebasHutang</strong> secara privat, cerdas, dan terstruktur.
            </p>
            
            <div className="pt-4">
              <button
                onClick={() => setStep('quiz')}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <span>Mulai Cari Solusi</span>
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="text-center pt-2">
              <button
                onClick={() => setStep('auth')}
                className="text-slate-400 hover:text-white text-xs font-semibold underline underline-offset-4"
              >
                Langsung login jika sudah punya akun
              </button>
            </div>
          </div>
        )}

        {/* QUIZ STEP */}
        {step === 'quiz' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  if (quizIndex > 0) {
                    setQuizIndex(quizIndex - 1)
                    setQuizAnswers(quizAnswers.slice(0, -1))
                  } else {
                    setStep('hero')
                  }
                }}
                className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                Pertanyaan {quizIndex + 1} dari {quizQuestions.length}
              </span>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-100 leading-snug">
                {quizQuestions[quizIndex].question}
              </h2>
              <div className="space-y-3 pt-2">
                {quizQuestions[quizIndex].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuizAnswer(option)}
                    className="w-full text-left p-4 bg-slate-900/60 hover:bg-purple-950/20 border border-slate-800 hover:border-purple-500/30 rounded-2xl text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CALCULATOR STEP */}
        {step === 'calculator' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setStep('quiz')
                  setQuizIndex(quizQuestions.length - 1)
                  setQuizAnswers(quizAnswers.slice(0, -1))
                  setShowResult(false)
                }}
                className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                <Calculator size={12} />
                Kalkulator Bebas Hutang
              </h2>
            </div>

            {!showResult ? (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-100">Kira-kira berapa total hutang kamu saat ini?</h3>
                  <p className="text-[11px] text-slate-400">Gabungkan semua cicilan, paylater, kartu kredit, atau hutang personal.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Hutang (Rp)</label>
                    <input
                      type="number"
                      value={calcDebt}
                      onChange={(e) => setCalcDebt(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                      placeholder="Contoh: 15000000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kemampuan Bayar Bulanan (Rp)</label>
                    <input
                      type="number"
                      value={calcPay}
                      onChange={(e) => setCalcPay(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                      placeholder="Contoh: 1500000"
                    />
                  </div>
                </div>

                <button
                  disabled={!calcDebt || !calcPay}
                  onClick={() => setShowResult(true)}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-purple-600/10 cursor-pointer mt-2"
                >
                  Hitung Estimasi Lunas
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center space-y-2">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Estimasi Bebas Hutang</p>
                  <p className="text-4xl font-extrabold text-slate-100">
                    {estMonths} <span className="text-lg font-medium text-slate-400">Bulan</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Jika kamu konsisten membayar sebesar <strong className="text-slate-200">{formatRupiah(monthlyPay)}</strong> per bulan.
                  </p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="flex gap-2">
                    <TrendingDown className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">Tips untuk kondisimu saat ini:</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {estMonths > 12 
                          ? "Perjalanan lunas membutuhkan waktu lebih dari setahun. Sebaiknya gunakan strategi pelunasan Avalanche untuk menekan total bunga cicilan."
                          : "Keren, kamu bisa lunas dalam waktu kurang dari setahun! Tetap konsisten dan pantau terus riwayat bayar kamu agar tidak terlambat."}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('auth')}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <span>Simpan Rencana & Mulai Catat</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* AUTHENTICATION STEP */}
        {step === 'auth' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                {isRegister ? 'Buat Akun Baru' : 'Masuk ke BebasHutang'}
              </h1>
              <p className="text-slate-400 text-xs mt-1.5 uppercase font-bold tracking-wider">
                Zeth Finance Management System
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama Lengkap</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-500">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alamat Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kata Sandi</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-xl mt-6 transition-all duration-200 shadow-lg shadow-purple-600/10 hover:shadow-purple-600/25 flex items-center justify-center text-sm cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Sedang memproses...
                  </span>
                ) : (
                  isRegister ? 'Daftar Sekarang' : 'Masuk Aplikasi'
                )}
              </button>
            </form>

            {/* Toggle link */}
            <div className="mt-8 text-center">
              <p className="text-slate-400 text-xs">
                {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
                <button
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setErrorMessage('')
                  }}
                  className="text-purple-400 hover:text-purple-300 font-bold hover:underline transition-all"
                >
                  {isRegister ? 'Masuk di sini' : 'Daftar di sini'}
                </button>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
