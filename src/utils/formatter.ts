/**
 * Formatter Utilities for BebasHutang
 * Zeth Finance | Zeth Corporation
 */

/**
 * Formats a number to Indonesian Rupiah currency format.
 * @param amount Number to format
 * @returns string formatted as Rp X.XXX.XXX,XX
 */
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a date string to Indonesian long date format (e.g. 1 Juni 2026).
 * @param dateStr Date string or Date object
 * @returns string formatted date
 */
export const formatDateIndo = (dateStr: string | Date): string => {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Calculates the number of days remaining from today to target date.
 * Returns negative if target date is overdue.
 * @param targetDateStr Target date string
 * @returns number of days remaining
 */
export const daysRemaining = (targetDateStr: string | Date): number => {
  const target = new Date(targetDateStr)
  // Set time of target to midnight for accurate day difference
  target.setHours(0, 0, 0, 0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
