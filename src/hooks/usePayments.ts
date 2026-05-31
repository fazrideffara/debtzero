import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Payment {
  id: string
  debt_id: string
  user_id: string
  amount: number
  paid_at: string
  receipt_image: string | null
  notes: string | null
}

export const usePayments = (debtId?: string) => {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async (targetDebtId?: string) => {
    const activeDebtId = targetDebtId || debtId
    if (!activeDebtId) return []

    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('payments')
        .select('*')
        .eq('debt_id', activeDebtId)
        .order('paid_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setPayments(data || [])
      return data || []
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments')
      return []
    } finally {
      setLoading(false)
    }
  }, [debtId])

  const addPayment = async (
    amount: number,
    notes: string | null,
    receiptFile: File | null,
    targetDebtId?: string
  ) => {
    const activeDebtId = targetDebtId || debtId
    if (!activeDebtId) throw new Error('No target debt ID provided')

    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user found')

      let publicUrl: string | null = null

      // 1. Upload proof file to Supabase Storage if present
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadErr } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, receiptFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadErr) throw uploadErr

        // 2. Get the public URL of the uploaded file
        const { data: { publicUrl: fetchedUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(filePath)

        publicUrl = fetchedUrl
      }

      // 3. Record the payment log
      const { data: paymentRecord, error: paymentErr } = await supabase
        .from('payments')
        .insert({
          debt_id: activeDebtId,
          user_id: user.id,
          amount,
          receipt_image: publicUrl,
          notes,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (paymentErr) throw paymentErr

      // Update local state if the hook instance is linked to this specific debt
      if (activeDebtId === debtId) {
        setPayments((prev) => [paymentRecord, ...prev])
      }

      return paymentRecord
    } catch (err: any) {
      setError(err.message || 'Failed to add payment')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePayment = async (paymentId: string, targetDebtId?: string) => {
    const activeDebtId = targetDebtId || debtId
    if (!activeDebtId) throw new Error('No target debt ID provided')

    setLoading(true)
    setError(null)
    try {
      // 1. Delete payment record
      const { error: deleteErr } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)

      if (deleteErr) throw deleteErr

      if (activeDebtId === debtId) {
        setPayments((prev) => prev.filter((p) => p.id !== paymentId))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment')
      throw err
    } finally {
      setLoading(false)
    }
  }


  return {
    payments,
    loading,
    error,
    fetchPayments,
    addPayment,
    deletePayment,
  }
}
