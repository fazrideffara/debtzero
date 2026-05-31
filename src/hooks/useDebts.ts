import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Debt {
  id: string
  user_id: string
  type: 'cicilan' | 'gadai' | 'personal'
  creditor_name: string
  principal_amount: number
  remaining_amount: number
  interest_rate: number
  interest_period: 'monthly' | '15days' | 'none'
  start_date: string
  due_date: string | null
  tenor: number | null
  tenor_unit: 'days' | 'months' | null
  status: 'active' | 'completed'
  notes: string | null
  created_at: string
}

export const useDebts = () => {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDebts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setDebts(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch debts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDebts()
  }, [fetchDebts])

  const addDebt = async (debtData: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'status'>) => {
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user found')

      const { data, error: insertErr } = await supabase
        .from('debts')
        .insert({
          ...debtData,
          user_id: user.id,
          status: 'active',
        })
        .select()
        .single()

      if (insertErr) throw insertErr
      setDebts((prev) => [data, ...prev])
      return data
    } catch (err: any) {
      setError(err.message || 'Failed to add debt')
      throw err
    }
  }

  const updateDebt = async (
    id: string,
    debtData: Partial<Omit<Debt, 'id' | 'user_id' | 'created_at'>>
  ) => {
    setError(null)
    try {
      const { data, error: updateErr } = await supabase
        .from('debts')
        .update(debtData)
        .eq('id', id)
        .select()
        .single()

      if (updateErr) throw updateErr
      setDebts((prev) => prev.map((d) => (d.id === id ? data : d)))
      return data
    } catch (err: any) {
      setError(err.message || 'Failed to update debt')
      throw err
    }
  }

  const deleteDebt = async (id: string) => {
    setError(null)
    try {
      const { error: deleteErr } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)

      if (deleteErr) throw deleteErr
      setDebts((prev) => prev.filter((d) => d.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete debt')
      throw err
    }
  }

  return {
    debts,
    loading,
    error,
    refetch: fetchDebts,
    addDebt,
    updateDebt,
    deleteDebt,
  }
}
