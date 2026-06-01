import { supabase } from './supabase'
import { daysRemaining, formatRupiah } from '../utils/formatter'

/**
 * Sends a text message to a Telegram chat using Telegram Bot API.
 */
export const sendTelegramMessage = async (token: string, chatId: string, text: string): Promise<boolean> => {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    })
    return response.ok
  } catch (err) {
    console.error('Gagal mengirim pesan Telegram:', err)
    return false
  }
}

/**
 * Checks all active debts for a user, identifies upcoming due dates,
 * and triggers Telegram notifications if they haven't been sent yet.
 */
export const checkAndTriggerReminders = async (debts: any[], userId: string): Promise<void> => {
  try {
    // 1. Fetch user's Telegram settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('telegram_bot_token, telegram_chat_id, notif_enabled')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings || !settings.notif_enabled) {
      return // Notifications disabled or configuration missing
    }

    const { telegram_bot_token, telegram_chat_id } = settings
    if (!telegram_bot_token || !telegram_chat_id) {
      return // Token or Chat ID not configured
    }

    // 2. Loop through active debts
    const activeDebts = debts.filter(d => d.status === 'active' && d.due_date)

    for (const debt of activeDebts) {
      const daysLeft = daysRemaining(debt.due_date)
      let type: '7d' | '3d' | '1d' | 'overdue' | null = null

      if (daysLeft === 7) {
        type = '7d'
      } else if (daysLeft === 3) {
        type = '3d'
      } else if (daysLeft === 1) {
        type = '1d'
      } else if (daysLeft < 0) {
        type = 'overdue'
      }

      if (!type) continue

      // 3. Check if we already sent this notification type for this debt
      const { data: existingLog, error: logError } = await supabase
        .from('notifications_log')
        .select('id')
        .eq('debt_id', debt.id)
        .eq('type', type)
        .limit(1)

      if (logError) {
        console.error('Gagal mengecek log notifikasi:', logError)
        continue
      }

      if (existingLog && existingLog.length > 0) {
        continue // Already sent!
      }

      // 4. Construct friendly Indonesian warning message
      let statusTimeText = ''
      if (type === 'overdue') {
        statusTimeText = `lewat jatuh tempo <b>${Math.abs(daysLeft)} hari</b> nih!`
      } else {
        statusTimeText = `sisa <b>${daysLeft} hari lagi</b> jatuh tempo.`
      }

      const message = `🚨 <b>Halo Bos! Token reminder nih!</b>\n\n` +
        `Hutang kamu di <b>${debt.creditor_name}</b> sebesar <b>${formatRupiah(debt.remaining_amount)}</b> ${statusTimeText}\n\n` +
        `Jangan sampai kelewat ya! Yuk segera dibayar biar tidur lebih nyenyak dan beban berkurang! 💪`

      // 5. Send message and write to log on success
      const success = await sendTelegramMessage(telegram_bot_token, telegram_chat_id, message)
      if (success) {
        await supabase
          .from('notifications_log')
          .insert({
            debt_id: debt.id,
            user_id: userId,
            type,
            status: 'sent'
          })
      }
    }
  } catch (err) {
    console.error('Terjadi kesalahan pada sistem reminder Telegram:', err)
  }
}

/**
 * Sends a daily ping message to a Telegram chat with financial summary.
 */
export const sendDailyPingMessage = async (
  token: string,
  chatId: string,
  debts: any[],
  monthlyIncome: number
): Promise<boolean> => {
  // calculate total outstanding debt (excluding NON_UTANG)
  const activeDebts = debts.filter(d => d.status === 'active')
  const totalRemainingAmount = activeDebts.reduce((sum, d) => {
    if (d.notes?.startsWith('[NON_UTANG]')) return sum
    return sum + d.remaining_amount
  }, 0)

  // calculate monthly commitments (total monthly installment of debts)
  const totalMonthlyCommitment = activeDebts.reduce((sum, d) => {
    if (d.notes?.startsWith('[NON_UTANG]')) {
      const baseInstallment = d.principal_amount / (d.tenor || 1)
      const interestInstallment = d.principal_amount * (d.interest_rate / 100)
      return sum + baseInstallment + interestInstallment
    }
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

  const finalIncome = monthlyIncome <= 0 ? 0 : monthlyIncome
  const monthlyAllocatable = Math.max(100000, finalIncome * 0.4 - totalMonthlyCommitment)
  const monthsToFreedom = totalRemainingAmount > 0 ? Math.ceil(totalRemainingAmount / monthlyAllocatable) : 0

  const message = `Halo Bos, pengingat harian. Sisa utang berjalanmu <b>${formatRupiah(totalRemainingAmount)}</b>. Menuju tanggal merdeka utangmu tinggal <b>${monthsToFreedom} bulan lagi</b>. Tetap semangat, kurangi jajan kopi hari ini! 💪`

  return sendTelegramMessage(token, chatId, message)
}

