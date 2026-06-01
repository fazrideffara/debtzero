import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight, 
  ArrowLeft, 
  Calculator, 
  TrendingDown,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../utils/formatter'
import { ShieldLogo } from '../components/layout/ShieldLogo'

const storeOtpInRedisMock = (email: string, otp: string) => {
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes TTL
  localStorage.setItem(`otp:${email}`, JSON.stringify({ otp, expiresAt }))
}

const verifyOtpInRedisMock = (email: string, otp: string): { success: boolean; message: string } => {
  const dataStr = localStorage.getItem(`otp:${email}`)
  if (!dataStr) {
    return { success: false, message: 'Kode OTP tidak ditemukan atau belum dikirim.' }
  }
  const { otp: storedOtp, expiresAt } = JSON.parse(dataStr)
  if (Date.now() > expiresAt) {
    localStorage.removeItem(`otp:${email}`)
    return { success: false, message: 'Kode OTP sudah kadaluwarsa (TTL 5 menit habis).' }
  }
  if (storedOtp !== otp) {
    return { success: false, message: 'Kode OTP salah, silakan cek kembali.' }
  }
  localStorage.removeItem(`otp:${email}`)
  return { success: true, message: 'OTP terverifikasi!' }
}

export const Login: React.FC = () => {
  // Navigation & Auth Form States
  const [step, setStep] = useState<'hero' | 'quiz' | 'calculator' | 'auth' | 'forgot' | 'otp'>('hero')
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Security additions
  const [showPassword, setShowPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [enteredOtp, setEnteredOtp] = useState('')
  const [otpExpiredTime, setOtpExpiredTime] = useState<number | null>(null)
  
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

  const handleRegisterInitiate = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!email || !password || !fullName) {
      setErrorMessage('Isi semua field pendaftaran ya, Bos!')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter ya!')
      return
    }

    // Generate 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store in mock Redis (TTL 5 mins)
    storeOtpInRedisMock(email, generatedOtp)
    setOtpExpiredTime(Date.now() + 5 * 60 * 1000)

    setSuccessMessage(`[Simulasi Redis Backend TTL 5m] Kode OTP berhasil dikirim ke ${email}. Gunakan kode: ${generatedOtp}`);
    setStep('otp')
  }

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const verification = verifyOtpInRedisMock(email, enteredOtp)
    if (!verification.success) {
      setErrorMessage(verification.message)
      setLoading(false)
      return
    }

    try {
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

      setSuccessMessage('Pendaftaran terverifikasi! Akun kamu berhasil dibuat, Bos. Silakan login di bawah ini.')
      setStep('auth')
      setIsRegister(false)
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mendaftarkan akun.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin + '/settings',
      })
      if (error) throw error
      setSuccessMessage('Link reset kata sandi telah dikirim ke email kamu, Bos!')
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim link reset password.')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      // Login flow
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      navigate('/')
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Visual background decorations with premium dynamic wave gradients */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl opacity-60"></div>
      
      {/* Elegant minimalist Green-White SVG Wave vector line */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-40 select-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto">
          <path fill="#10b981" fillOpacity="0.06" d="M0,192L80,186.7C160,181,320,171,480,181.3C640,192,800,224,960,224C1120,224,1280,192,1360,176L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          <path fill="#059669" fillOpacity="0.04" d="M0,96L80,112C160,128,320,160,480,170.7C640,181,800,171,960,149.3C1120,128,1280,96,1360,80L1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
      </div>

      <div className="w-full max-w-lg bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-3xl relative z-10 border border-emerald-500/10 shadow-[0_20px_50px_rgba(16,185,129,0.08)] transition-all duration-300 transform hover:scale-[1.005]">
        
        {/* HERO STEP */}
        {step === 'hero' && (
          <div className="space-y-6 text-center py-4 animate-in fade-in duration-300">
            <div className="inline-flex p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 mb-2 shadow-sm">
              <ShieldLogo size={36} />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Tenang, Kita Beresin <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Cicilanmu Sampai Tuntas.</span>
            </h1>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-md mx-auto">
              Tempat buat ngitung, rapihin, dan simulasiin jalan keluar dari jeratan utang secara terukur. Gak pake dihakimi, fokus kita cuma satu: Bantu kamu balik megang kendali penuh atas keuanganmu.
            </p>
            
            <div className="pt-6">
              <button
                onClick={() => setStep('quiz')}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 flex items-center justify-center gap-2 text-sm cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Mulai Hitung Solusinya (Gratis)</span>
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="text-center pt-2">
              <button
                onClick={() => setStep('auth')}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline underline-offset-4"
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
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Pertanyaan {quizIndex + 1} dari {quizQuestions.length}
              </span>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 leading-snug">
                {quizQuestions[quizIndex].question}
              </h2>
              <div className="space-y-3 pt-2">
                {quizQuestions[quizIndex].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuizAnswer(option)}
                    className="w-full text-left p-4 bg-white hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-500/30 rounded-2xl text-slate-700 hover:text-emerald-900 transition-all text-xs font-medium cursor-pointer"
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
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                <Calculator size={12} />
                Kalkulator Bebas Hutang
              </h2>
            </div>

            {!showResult ? (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Kira-kira berapa total hutang kamu saat ini?</h3>
                  <p className="text-[11px] text-slate-500">Gabungkan semua cicilan, paylater, kartu kredit, atau hutang personal.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hutang (Rp)</label>
                    <input
                      type="number"
                      value={calcDebt}
                      onChange={(e) => setCalcDebt(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Contoh: 15000000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kemampuan Bayar Bulanan (Rp)</label>
                    <input
                      type="number"
                      value={calcPay}
                      onChange={(e) => setCalcPay(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Contoh: 1500000"
                    />
                  </div>
                </div>

                <button
                  disabled={!calcDebt || !calcPay}
                  onClick={() => setShowResult(true)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-emerald-600/10 cursor-pointer mt-2"
                >
                  Hitung Estimasi Lunas
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Estimasi Bebas Hutang</p>
                  <p className="text-4xl font-extrabold text-slate-800">
                    {estMonths} <span className="text-lg font-medium text-slate-500">Bulan</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Jika kamu konsisten membayar sebesar <strong className="text-slate-800">{formatRupiah(monthlyPay)}</strong> per bulan.
                  </p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex gap-2">
                    <TrendingDown className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">Tips untuk kondisimu saat ini:</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {estMonths > 12 
                          ? "Perjalanan lunas membutuhkan waktu lebih dari setahun. Sebaiknya gunakan strategi pelunasan Avalanche untuk menekan total bunga cicilan."
                          : "Keren, kamu bisa lunas dalam waktu kurang dari setahun! Tetap konsisten dan pantau terus riwayat bayar kamu agar tidak terlambat."}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('auth')}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 flex items-center justify-center gap-2 text-xs cursor-pointer"
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
              <div className="inline-flex p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mb-3">
                <ShieldLogo size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                {isRegister ? 'Buat Akun Baru' : 'Masuk ke BebasHutang'}
              </h1>
              <p className="text-slate-500 text-xs mt-1.5 uppercase font-bold tracking-wider">
                Zeth Finance Management System
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 text-xs flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={isRegister ? handleRegisterInitiate : handleAuth} className="space-y-4">
              {isRegister && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alamat Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kata Sandi</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-12 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-slate-400 hover:text-slate-650 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {!isRegister && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('forgot');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-slate-450 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl mt-6 transition-all duration-200 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 flex items-center justify-center text-sm cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Sedang memproses...
                  </span>
                ) : (
                  isRegister ? 'Kirim Kode OTP' : 'Masuk Aplikasi'
                )}
              </button>
            </form>

            {/* Toggle link */}
            <div className="mt-8 text-center">
              <p className="text-slate-500 text-xs">
                {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
                <button
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setErrorMessage('')
                    setSuccessMessage('')
                  }}
                  className="text-emerald-600 hover:text-emerald-500 font-bold hover:underline transition-all"
                >
                  {isRegister ? 'Masuk di sini' : 'Daftar di sini'}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD STEP */}
        {step === 'forgot' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-50 border border-emerald-250 text-emerald-600 mb-3">
                <ShieldLogo size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Lupa Kata Sandi</h1>
              <p className="text-slate-500 text-xs mt-1.5 uppercase font-bold tracking-wider">BebasHutang Security System</p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 text-xs flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Masukkan Alamat Email Anda</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl mt-6 transition-colors text-sm cursor-pointer"
              >
                {loading ? 'Mengirim link...' : 'Kirim Link Reset Password'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setStep('auth');
                  setForgotEmail('');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-emerald-600 hover:text-emerald-500 font-bold hover:underline transition-all text-xs"
              >
                Kembali ke halaman Login
              </button>
            </div>
          </div>
        )}

        {/* OTP VERIFICATION STEP */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-50 border border-emerald-250 text-emerald-600 mb-3">
                <Lock size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Verifikasi OTP Email</h1>
              <p className="text-slate-500 text-xs mt-1.5 uppercase font-bold tracking-wider">Simulasi Redis Cache (TTL 5 Menit)</p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 text-xs flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-650 text-xs">
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block text-center">Masukkan 6 Digit Kode OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-850 text-center text-lg tracking-widest font-extrabold focus:outline-none focus:border-emerald-500"
                  placeholder="------"
                />
                {otpExpiredTime && (
                  <p className="text-[10px] text-slate-400 text-center">
                    Kode ini berlaku sampai dengan {new Date(otpExpiredTime).toLocaleTimeString('id-ID')} (TTL 5 Menit)
                  </p>
                )}
              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl mt-4 transition-colors text-sm cursor-pointer"
              >
                {loading ? 'Verifikasi...' : 'Verifikasi & Buat Akun'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('auth');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
              >
                Batal Pendaftaran
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

