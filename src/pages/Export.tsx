import React, { useState, useEffect } from 'react'
import { useDebts } from '../hooks/useDebts'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../utils/formatter'
import { 
  Download, 
  Sparkles, 
  FileText, 
  Table, 
  Loader2, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'

export const Export: React.FC = () => {
  const { debts, loading: loadingDebts } = useDebts()
  const [payments, setPayments] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null)

  // Fetch all payments for reports
  useEffect(() => {
    async function loadPayments() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('payments')
          .select('*')
          .order('paid_at', { ascending: false })

        if (data) {
          setPayments(data)
        }
      } catch (err) {
        console.error('Gagal mengambil data riwayat pembayaran:', err)
      } finally {
        setLoadingPayments(false)
      }
    }
    loadPayments()
  }, [])

  // 1. Export Excel function
  const handleExportExcel = () => {
    setExportingType('excel')
    setFeedbackMessage(null)

    try {
      // Helper function to auto-fit column widths
      const autofitColumns = (ws: XLSX.WorkSheet) => {
        const objectMaxLength: number[] = [];
        const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
        rows.forEach((row: any) => {
          row.forEach((val: any, colIdx: number) => {
            const valStr = val ? String(val) : '';
            const cellLength = valStr.length;
            objectMaxLength[colIdx] = Math.max(objectMaxLength[colIdx] || 10, cellLength + 2);
          });
        });
        ws['!cols'] = objectMaxLength.map(width => ({ width }));
      };

      // Sheet 1: Summary Info
      const totalOutstanding = debts.reduce((sum, d) => sum + d.remaining_amount, 0)
      const activeDebtsCount = debts.filter(d => d.status === 'active').length
      const completedDebtsCount = debts.filter(d => d.status === 'completed').length

      const summaryData = [
        { 'Detail Laporan': 'Ringkasan Laporan Hutang - DebtZero', 'Nilai': '' },
        { 'Detail Laporan': 'Tanggal Ekspor', 'Nilai': new Date().toLocaleDateString('id-ID') },
        { 'Detail Laporan': 'Total Outstanding Hutang', 'Nilai': formatRupiah(totalOutstanding) },
        { 'Detail Laporan': 'Jumlah Hutang Aktif', 'Nilai': activeDebtsCount },
        { 'Detail Laporan': 'Jumlah Hutang Lunas', 'Nilai': completedDebtsCount },
      ]
      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      autofitColumns(summarySheet)

      // Sheet 2: Active Debts list
      const activeDebtsData = debts.filter(d => d.status === 'active').map((d, index) => ({
        'No': index + 1,
        'Nama Kreditur': d.creditor_name,
        'Jenis Hutang': d.type === 'cicilan' ? 'Cicilan Bulanan' : d.type === 'gadai' ? 'Gadai' : 'Personal',
        'Pokok Awal': formatRupiah(d.principal_amount),
        'Sisa Tagihan': formatRupiah(d.remaining_amount),
        'Suku Bunga (%)': d.type === 'personal' ? '0%' : `${d.interest_rate}% per ${d.interest_period === '15days' ? '15 hari' : 'bulan'}`,
        'Tanggal Mulai': d.start_date,
        'Jatuh Tempo': d.due_date || 'Fleksibel',
        'Catatan': d.notes || '-'
      }))
      const activeDebtsSheet = XLSX.utils.json_to_sheet(activeDebtsData)
      autofitColumns(activeDebtsSheet)

      // Sheet 3: Payments Log
      const paymentsData = payments.map((p, index) => {
        const parentDebt = debts.find(d => d.id === p.debt_id)
        return {
          'No': index + 1,
          'Kreditur / Target Hutang': parentDebt ? parentDebt.creditor_name : '-',
          'Nominal Pembayaran': formatRupiah(p.amount),
          'Tanggal Bayar': new Date(p.paid_at).toLocaleDateString('id-ID'),
          'Catatan': p.notes || '-'
        }
      })
      const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData)
      autofitColumns(paymentsSheet)

      // Assemble workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan')
      XLSX.utils.book_append_sheet(workbook, activeDebtsSheet, 'Daftar Hutang Aktif')
      XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Riwayat Pembayaran')

      // Save workbook
      XLSX.writeFile(workbook, `Laporan_Hutang_DebtZero_${Date.now()}.xlsx`)
      setFeedbackMessage({ text: 'File Excel (XLSX) berhasil diekspor!', isError: false })
    } catch (err: any) {
      setFeedbackMessage({ text: `Gagal ekspor Excel: ${err.message || err}`, isError: true })
    } finally {
      setExportingType(null)
    }
  }

  // 2. Export PDF function
  const handleExportPDF = () => {
    setExportingType('pdf')
    setFeedbackMessage(null)

    try {
      const doc = new jsPDF()

      // Header branding
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(139, 92, 246) // Purple
      doc.text('DebtZero', 14, 20)

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text('Personal Debt Report | Powered by Zeth Finance', 14, 26)

      // Separator line
      doc.setDrawColor(226, 232, 240)
      doc.line(14, 30, 196, 30)

      // General Stats info
      doc.setTextColor(51, 65, 85)
      doc.setFontSize(11)
      doc.setFont('Helvetica', 'normal')
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 38)

      const totalDebt = debts.reduce((sum, d) => sum + d.remaining_amount, 0)
      doc.setFont('Helvetica', 'bold')
      doc.text(`Total Akumulasi Sisa Hutang: ${formatRupiah(totalDebt)}`, 14, 45)

      // Table header setup - Clean light mode, print-friendly
      doc.setFontSize(9)
      doc.setFillColor(241, 245, 249) // light gray background for print
      doc.rect(14, 52, 182, 8, 'F')
      doc.setTextColor(51, 65, 85)
      doc.setFont('Helvetica', 'bold')
      doc.text('No', 17, 57)
      doc.text('Kreditur / Pemberi Hutang', 25, 57)
      doc.text('Tipe', 85, 57)
      doc.text('Bunga', 120, 57)
      doc.text('Sisa Tagihan (Rp)', 155, 57)

      // Draw rows for active debts
      doc.setTextColor(51, 65, 85)
      let y = 68
      const activeDebts = debts.filter(d => d.status === 'active')

      if (activeDebts.length === 0) {
        doc.setFont('Helvetica', 'italic')
        doc.text('Tidak ada catatan hutang aktif saat ini.', 14, y)
      } else {
        activeDebts.forEach((debt, index) => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }

          doc.setFont('Helvetica', 'normal')
          doc.text(String(index + 1), 17, y)
          doc.text(debt.creditor_name, 25, y)
          doc.text(debt.type === 'cicilan' ? 'Cicilan' : debt.type === 'gadai' ? 'Gadai' : 'Personal', 85, y)
          doc.text(debt.type === 'personal' ? '0%' : `${debt.interest_rate}%`, 120, y)
          
          doc.setFont('Helvetica', 'bold')
          doc.text(formatRupiah(debt.remaining_amount), 155, y)

          // Thin row separator line
          doc.setDrawColor(241, 245, 249)
          doc.line(14, y + 2, 196, y + 2)
          y += 10
        })
      }

      // Footer disclaimer note
      y += 12
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.setFont('Helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text('Laporan ini digenerate secara otomatis melalui platform privat DebtZero (Zeth Corporation).', 14, y)
      doc.text('Semua kalkulasi dilakukan secara real-time dan terisolasi demi menjaga privasi data Anda.', 14, y + 4)

      // Save PDF file
      doc.save(`Laporan_Hutang_DebtZero_${Date.now()}.pdf`)
      setFeedbackMessage({ text: 'Laporan PDF berhasil diekspor!', isError: false })
    } catch (err: any) {
      setFeedbackMessage({ text: `Gagal ekspor PDF: ${err.message || err}`, isError: true })
    } finally {
      setExportingType(null)
    }
  }

  const isLoading = loadingDebts || loadingPayments

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
          <Download className="text-purple-500" />
          Ekspor Data & Laporan
        </h1>
        <p className="text-slate-400 text-sm">
          Unduh rekapitulasi lengkap riwayat pembayaran dan status hutang kamu dalam format dokumen siap cetak.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="text-slate-500 text-xs font-medium">Menghubungkan ke database...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Feedback Toast Banner */}
          {feedbackMessage && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
              feedbackMessage.isError 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {feedbackMessage.isError ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
              <p>{feedbackMessage.text}</p>
            </div>
          )}

          {/* Cards for Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Option: PDF */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 flex flex-col justify-between items-start space-y-6">
              <div className="space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <FileText size={24} />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Cetak Dokumen Laporan (PDF)</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Unduh ringkasan data hutang aktif kamu dalam format dokumen resmi A4 yang rapi, bersih, dan siap untuk langsung dicetak.
                </p>
              </div>

              <button
                disabled={exportingType !== null || debts.length === 0}
                onClick={handleExportPDF}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/10"
              >
                {exportingType === 'pdf' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Mempersiapkan PDF...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Unduh PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Card Option: Excel Spreadsheet */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 flex flex-col justify-between items-start space-y-6">
              <div className="space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Table size={24} />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Ekspor Data Tabular (Excel / XLSX)</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Unduh seluruh database riwayat transaksi pembayaran dan detail hutang kamu ke dalam file spreadsheet Excel dengan tab terpisah.
                </p>
              </div>

              <button
                disabled={exportingType !== null || debts.length === 0}
                onClick={handleExportExcel}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/10"
              >
                {exportingType === 'excel' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Membuat Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Unduh File Excel</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Quick Notice Info Box */}
          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex gap-3 items-start text-xs text-slate-400">
            <Sparkles className="text-purple-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <p className="font-bold text-slate-300">Tips Laporan & Ekspor:</p>
              <p className="leading-relaxed font-normal">
                File Excel yang diekspor akan berisi 3 sheet terpisah untuk membantu kamu menyaring/menganalisis riwayat pelunasan secara manual menggunakan Microsoft Excel, Google Sheets, atau aplikasi sejenis.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
