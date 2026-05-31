/**
 * Financial Calculation Engine for DebtZero
 * Zeth Finance | Zeth Corporation
 */

import { daysRemaining } from './formatter'

interface DebtCalculationResult {
  interestAmount: number
  totalOutstanding: number
  nextPaymentDue: string | null
  estimatedCompletionDate: string | null
}

/**
 * Calculates interest and sisa tagihan for a standard monthly installment debt.
 * Formula: Outstanding = Principal + (Principal * InterestRate% * MonthsPassed) - TotalPaid
 */
export const calculateMonthlyInstallment = (
  principal: number,
  monthlyInterestRatePercent: number,
  startDateStr: string,
  tenorMonths: number,
  totalPaid: number
): DebtCalculationResult => {
  const start = new Date(startDateStr)
  const today = new Date()
  
  // Calculate months passed
  const yearsDiff = today.getFullYear() - start.getFullYear()
  const monthsDiff = today.getMonth() - start.getMonth()
  const monthsElapsed = Math.max(0, (yearsDiff * 12) + monthsDiff)
  
  // Cap elapsed months at tenor
  const activeMonths = Math.min(monthsElapsed, tenorMonths)
  
  // Calculate interest accrued
  const interestAmount = principal * (monthlyInterestRatePercent / 100) * activeMonths
  const totalAccrued = principal + interestAmount
  const totalOutstanding = Math.max(0, totalAccrued - totalPaid)

  // Next payment due: same day of next month
  const nextPayment = new Date(start)
  nextPayment.setMonth(start.getMonth() + activeMonths + 1)
  
  // Estimated completion
  const completion = new Date(start)
  completion.setMonth(start.getMonth() + tenorMonths)

  return {
    interestAmount,
    totalOutstanding,
    nextPaymentDue: nextPayment.toISOString().split('T')[0],
    estimatedCompletionDate: completion.toISOString().split('T')[0],
  }
}

/**
 * Calculates pawn gold (Pegadaian) interest.
 * Pokok tetap sampai ditebus. Bunga berjalan dihitung per 15 hari dari total nilai gadai.
 * Tenor: 90 / 120 / 150 hari.
 * Formula: Bunga = Nilai Gadai * Bunga% per 15 hari * (HariBerjalan / 15 dibulatkan ke atas)
 */
export const calculatePawnInterest = (
  principal: number,
  interestRatePer15DaysPercent: number,
  startDateStr: string,
  tenorDays: number,
  totalPaid: number // Represents payments towards accumulated interest
): DebtCalculationResult => {
  const start = new Date(startDateStr)
  start.setHours(0, 0, 0, 0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffTime = today.getTime() - start.getTime()
  const daysElapsed = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  
  // Calculate number of 15-day periods elapsed (round up)
  const periods = Math.ceil(daysElapsed / 15) || 0
  
  // Calculate interest
  const interestAmount = principal * (interestRatePer15DaysPercent / 100) * periods
  // Pawn outstanding: principal (remains constant) + interest - total interest paid
  const totalOutstanding = Math.max(0, (principal + interestAmount) - totalPaid)
  
  // Next payment due / end of tenor
  const due = new Date(start)
  due.setDate(start.getDate() + tenorDays)

  return {
    interestAmount,
    totalOutstanding,
    nextPaymentDue: due.toISOString().split('T')[0],
    estimatedCompletionDate: due.toISOString().split('T')[0],
  }
}

/**
 * Calculates Debt Service Ratio (DSR).
 * DSR = (Total Monthly Installments / Monthly Income) * 100
 */
export const calculateDSR = (
  totalMonthlyInstallments: number,
  monthlyIncome: number
): number => {
  if (monthlyIncome <= 0) return 0
  return parseFloat(((totalMonthlyInstallments / monthlyIncome) * 100).toFixed(2))
}

/**
 * Determines traffic light risk level.
 * 🔴 Merah: < 3 hari jatuh tempo atau overdue (daysRemaining < 3)
 * 🟡 Kuning: 4-7 hari jatuh tempo (daysRemaining >= 3 && daysRemaining <= 7) atau DSR > 35%
 * 🟢 Hijau: aman
 */
export const determineRiskColor = (
  dueDateStr: string | Date | null,
  dsrWarning: boolean = false
): 'red' | 'yellow' | 'green' => {
  if (!dueDateStr) return dsrWarning ? 'yellow' : 'green'
  
  const remaining = daysRemaining(dueDateStr)
  
  if (remaining < 3) {
    return 'red'
  }
  if (remaining <= 7 || dsrWarning) {
    return 'yellow'
  }
  return 'green'
}
