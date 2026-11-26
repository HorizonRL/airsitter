import { ReactNode, useEffect } from 'react'
import { AIRCRAFT, AircraftModel, VENDORS, seatCount } from '../aircraft/aircraft'
import { Icon } from './Icon'

export function AppBar({ title, subtitle, onBack, actions }: { title: string; subtitle?: string | null; onBack?: () => void; actions?: ReactNode }) {
  return (
    <header className="appbar">
      {onBack && <button type="button" className="icon-btn" onClick={onBack} aria-label="Back"><Icon name="back" /></button>}
      <div className="appbar-titles">
        {subtitle && <div className="eyebrow">{subtitle}</div>}
        <h1>{title}</h1>
      </div>
      {actions}
    </header>
  )
}

export function Chip({ selected, onClick, children }: { selected?: boolean; onClick?: () => void; children: ReactNode }) {
  return <button type="button" className={`chip${selected ? ' selected' : ''}`} onClick={onClick} aria-pressed={selected}>{children}</button>
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, ReactNode][]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map(([v, label]) => (
        <button type="button" role="tab" key={v} aria-selected={v === value} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function AircraftPicker({ current, onClose, onPick }: { current: AircraftModel | null; onClose: () => void; onPick: (m: AircraftModel) => void }) {
  return (
    <Modal title="Aircraft" onClose={onClose}>
      {VENDORS.map((v) => (
        <div key={v}>
          <div className="eyebrow picker-vendor">{v}</div>
          {AIRCRAFT.filter((m) => m.vendor === v).map((m) => (
            <button type="button" key={m.id} className={`picker-row${m.id === current?.id ? ' current' : ''}`} onClick={() => onPick(m)}>
              <span>{m.model}</span>
              <span className="muted small num">{seatCount(m)} seats</span>
            </button>
          ))}
        </div>
      ))}
    </Modal>
  )
}

/** Country label that reads the same on every platform (Windows has no flag emoji). */
export function CountryChip({ name, iso2, minutes }: { name: string; iso2: string; minutes?: number }) {
  return (
    <span className="flag-chip" title={minutes ? `${minutes} min in view` : undefined}>
      <b>{/^[A-Z]{2}$/.test(iso2) ? iso2 : '—'}</b>{name}
    </span>
  )
}
