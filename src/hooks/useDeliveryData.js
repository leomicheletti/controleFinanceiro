import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { computeKmPerLiter, periodRange } from '../utils/delivery'

const defaultSettings = { driver: 'a', initial_km_per_liter: 10 }
const SHIFT_SELECT = '*, delivery_earnings(*), delivery_expenses(*)'

export function useDeliveryData(period) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(defaultSettings)
  const [fuelUps, setFuelUps] = useState([])
  const [shifts, setShifts] = useState([])
  const [openShift, setOpenShift] = useState(null)
  const [lastOdometer, setLastOdometer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user) return
    const { start, end } = periodRange(period)
    let shiftsQuery = supabase.from('delivery_shifts').select(SHIFT_SELECT)
      .not('end_time', 'is', null).order('start_time', { ascending: false })
    if (period !== 'tudo') shiftsQuery = shiftsQuery.gte('start_time', start)
    if (end) shiftsQuery = shiftsQuery.lt('start_time', end)

    const [setRes, fuelRes, shiftRes, openRes, lastRes] = await Promise.all([
      supabase.from('delivery_settings').select('*').maybeSingle(),
      supabase.from('fuel_ups').select('*').order('date', { ascending: false }).order('odometer', { ascending: false }).limit(300),
      shiftsQuery,
      supabase.from('delivery_shifts').select(SHIFT_SELECT).is('end_time', null).order('start_time', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('delivery_shifts').select('start_odometer, end_odometer').order('start_time', { ascending: false }).limit(1).maybeSingle(),
    ])
    const err = setRes.error || fuelRes.error || shiftRes.error || openRes.error || lastRes.error
    setError(err ? 'Não foi possível carregar as entregas. Verifique se o arquivo supabase/migration_004_entregas.sql já foi executado no Supabase.' : '')

    const fuel = fuelRes.data || []
    setSettings({ ...defaultSettings, ...(setRes.data || {}) })
    setFuelUps(fuel)
    setShifts(shiftRes.data || [])
    setOpenShift(openRes.data || null)
    const candidates = [
      lastRes.data?.end_odometer, lastRes.data?.start_odometer, fuel[0]?.odometer,
    ].filter(v => v != null).map(Number)
    setLastOdometer(candidates.length ? Math.max(...candidates) : null)
    setLoading(false)
  }, [user, period])

  useEffect(() => { reload() }, [reload])

  const kmPerLiter = useMemo(
    () => computeKmPerLiter(fuelUps, settings.initial_km_per_liter),
    [fuelUps, settings.initial_km_per_liter]
  )

  return { settings, fuelUps, shifts, openShift, lastOdometer, kmPerLiter, loading, error, reload }
}
