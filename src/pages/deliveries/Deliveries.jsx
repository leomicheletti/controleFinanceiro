import React, { useCallback, useMemo, useState } from 'react'
import { useFinanceData } from '../../hooks/useFinanceData'
import { useDeliveryData } from '../../hooks/useDeliveryData'
import { priceAt, shiftMetrics, summarize } from '../../utils/delivery'
import Sheet from '../../components/Sheet'
import ShiftCard from './ShiftCard'
import SummaryTab from './SummaryTab'
import FuelTab from './FuelTab'
import OfferCalculator from './OfferCalculator'
import {
  EarningForm, EndShiftForm, ExpenseForm, FuelForm, LaunchFuelForm, LaunchShiftsForm, SettingsForm, StartShiftForm,
} from './DeliveryForms'

const PERIODS = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: '90d', label: '90 dias' },
]

const TABS = [
  { value: 'resumo', label: 'Resumo' },
  { value: 'jornadas', label: 'Jornadas' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'calculadora', label: 'Calculadora' },
]

const SHEET_TITLES = {
  start: 'Iniciar jornada', end: 'Encerrar jornada', earning: 'Adicionar ganho', expense: 'Adicionar gasto',
  fuel: 'Novo abastecimento', settings: 'Configurações das entregas', launchShifts: 'Lançar no financeiro',
  launchFuel: 'Lançar abastecimento',
}

export default function Deliveries() {
  const [period, setPeriod] = useState('semana')
  const [tab, setTab] = useState('resumo')
  const [sheet, setSheet] = useState(null) // { type, shift?, fuel? }
  const { accounts, coupleNames } = useFinanceData()
  const { settings, fuelUps, shifts, openShift, lastOdometer, kmPerLiter, loading, error, reload } = useDeliveryData(period)

  const ctx = useMemo(() => ({ fuelUps, kmPerLiter: kmPerLiter.value }), [fuelUps, kmPerLiter.value])
  const summary = useMemo(() => summarize(shifts, ctx), [shifts, ctx])

  const pending = useMemo(() => shifts
    .filter(s => !s.income_transaction_id && !s.expense_transaction_id)
    .map(s => ({ shift: s, m: shiftMetrics(s, ctx) }))
    .filter(x => x.m.earnings > 0 || x.m.expenses > 0), [shifts, ctx])

  const currentPrice = priceAt(fuelUps, new Date().toISOString())
  const currentCostPerKm = currentPrice && kmPerLiter.value ? currentPrice / kmPerLiter.value : null

  const close = useCallback(() => setSheet(null), [])
  const done = useCallback(() => { setSheet(null); reload() }, [reload])
  const open = (type, extra = {}) => setSheet({ type, ...extra })

  function renderSheet() {
    switch (sheet?.type) {
      case 'start': return <StartShiftForm lastOdometer={lastOdometer} onDone={done} />
      case 'end': return <EndShiftForm shift={sheet.shift} onDone={done} />
      case 'earning': return <EarningForm shift={sheet.shift} onDone={done} />
      case 'expense': return <ExpenseForm shift={sheet.shift} onDone={done} />
      case 'fuel': return <FuelForm lastOdometer={lastOdometer} onDone={done} />
      case 'settings': return <SettingsForm settings={settings} coupleNames={coupleNames} onDone={done} />
      case 'launchShifts': return <LaunchShiftsForm pending={pending} accounts={accounts} coupleNames={coupleNames} driver={settings.driver} onDone={done} />
      case 'launchFuel': return <LaunchFuelForm fuel={sheet.fuel} accounts={accounts} coupleNames={coupleNames} driver={settings.driver} onDone={done} />
      default: return null
    }
  }

  return (
    <div>
      <header className="page-header page-header-row">
        <div>
          <h1>Entregas</h1>
          <p className="muted">Quanto você realmente lucra com as entregas</p>
        </div>
        <button className="btn-ghost small" onClick={() => open('settings')} aria-label="Configurações das entregas">⚙ Ajustes</button>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {!loading && (openShift ? (
        <ShiftCard
          shift={openShift} ctx={ctx}
          onAddEarning={() => open('earning', { shift: openShift })}
          onAddExpense={() => open('expense', { shift: openShift })}
          onEnd={() => open('end', { shift: openShift })}
          onChanged={reload}
        />
      ) : (
        <button className="start-shift-btn" onClick={() => open('start')}>
          <span className="start-shift-icon">▶</span>
          <span>
            <strong>Iniciar jornada</strong>
            <span className="muted small">Anote o km do painel antes de sair</span>
          </span>
        </button>
      ))}

      <div className="segmented" role="tablist" aria-label="Seções">
        {TABS.map(t => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} className={tab === t.value ? 'active' : ''} onClick={() => setTab(t.value)}>{t.label}</button>
        ))}
      </div>

      {(tab === 'resumo' || tab === 'jornadas') && (
        <div className="filter-row">
          {PERIODS.map(p => (
            <button key={p.value} className={period === p.value ? 'active' : ''} onClick={() => setPeriod(p.value)}>{p.label}</button>
          ))}
        </div>
      )}

      {loading ? <p className="muted">Carregando…</p> : (
        <>
          {tab === 'resumo' && (
            <SummaryTab summary={summary} kmPerLiter={kmPerLiter} pendingCount={pending.length} onLaunch={() => open('launchShifts')} />
          )}

          {tab === 'jornadas' && (
            <div className="shift-list">
              {shifts.length === 0 && <p className="muted">Nenhuma jornada encerrada neste período.</p>}
              {shifts.map(s => (
                <ShiftCard
                  key={s.id} shift={s} ctx={ctx}
                  onAddEarning={() => open('earning', { shift: s })}
                  onAddExpense={() => open('expense', { shift: s })}
                  onChanged={reload}
                />
              ))}
            </div>
          )}

          {tab === 'combustivel' && (
            <FuelTab fuelUps={fuelUps} kmPerLiter={kmPerLiter} onAdd={() => open('fuel')} onLaunch={f => open('launchFuel', { fuel: f })} onChanged={reload} />
          )}

          {tab === 'calculadora' && (
            <OfferCalculator costPerKm={currentCostPerKm} summary={summary} />
          )}
        </>
      )}

      {sheet && <Sheet title={SHEET_TITLES[sheet.type]} onClose={close}>{renderSheet()}</Sheet>}
    </div>
  )
}
