import { useEffect, useMemo, useRef, useState } from 'react'
import { money, statusLabel, statusTone } from './utils.js'

/* ------------------------------- icon set ------------------------------- */
const ICONS = {
  overview: <><rect x="3.5" y="3.5" width="7" height="7.5" rx="2" /><rect x="13.5" y="3.5" width="7" height="4.5" rx="2" /><rect x="13.5" y="10.5" width="7" height="10" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /></>,
  customers: <><circle cx="9" cy="8" r="3.4" /><path d="M3.6 19.5c.6-3.3 2.8-5.3 5.4-5.3s4.8 2 5.4 5.3" /><circle cx="17.2" cy="9" r="2.4" /><path d="M16.4 14.4c2.3.3 3.9 2.1 4.4 4.6" /></>,
  leads: <><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="4.4" /><circle cx="12" cy="12" r="1.1" fill="currentColor" /></>,
  orders: <><path d="M20.5 7.8 12 3.3 3.5 7.8v8.4L12 20.7l8.5-4.5V7.8Z" /><path d="m3.5 7.8 8.5 4.6 8.5-4.6" /><path d="M12 12.4v8.3" /></>,
  payments: <><path d="M7 4.8h10" /><path d="M7 8.6h10" /><path d="M13.6 4.8c2.6 0 4.2 1.5 4.2 3.9 0 2.4-1.7 3.9-4.3 3.9H7l8.2 6.6" /></>,
  tasks: <><rect x="3.5" y="4" width="17" height="16" rx="3.5" /><path d="m8 12.3 2.7 2.7 5.4-5.5" /></>,
  prescriptions: <><circle cx="6.6" cy="14.2" r="3.6" /><circle cx="17.4" cy="14.2" r="3.6" /><path d="M10.2 14.2c.7-1.1 2.9-1.1 3.6 0" /><path d="m3.2 12.6-1.5-3.1" /><path d="m20.8 12.6 1.5-3.1" /></>,
  inventory: <><rect x="3.5" y="13.4" width="7.4" height="7.1" rx="1.7" /><rect x="13.1" y="13.4" width="7.4" height="7.1" rx="1.7" /><rect x="8.3" y="3.5" width="7.4" height="7.1" rx="1.7" /></>,
  sales: <><path d="M3.5 16.6 9 11.1l3.4 3.4L20.5 6.4" /><path d="M15.4 6.4h5.1v5.1" /></>,
  reports: <><path d="M4 20V4.2" /><path d="M4 20h16.2" /><rect x="7.6" y="11" width="3.3" height="6" rx="1.2" /><rect x="13.6" y="7" width="3.3" height="10" rx="1.2" /></>,
  search: <><circle cx="11" cy="11" r="6.4" /><path d="m15.8 15.8 4.4 4.4" /></>,
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  refresh: <><path d="M20 11.6a8 8 0 1 0-2.3 5.6" /><path d="M20 5.4v6.2h-6.2" /></>,
  moon: <path d="M20 14.6A8.6 8.6 0 0 1 9.4 4 8.6 8.6 0 1 0 20 14.6Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5" /></>,
  bell: <><path d="M6.6 9.6a5.4 5.4 0 0 1 10.8 0c0 4.1 1.5 5.4 1.5 5.4H5.1s1.5-1.3 1.5-5.4Z" /><path d="M10.2 18.4a2 2 0 0 0 3.6 0" /></>,
  command: <path d="M9 6.4a2.2 2.2 0 1 0-2.2 2.2h10.4A2.2 2.2 0 1 0 15 6.4v11.2a2.2 2.2 0 1 0 2.2-2.2H6.8A2.2 2.2 0 1 0 9 17.6Z" />,
  download: <><path d="M12 4v10.4" /><path d="m8 10.8 4 4 4-4" /><path d="M4.6 19.4h14.8" /></>,
  trash: <><path d="M4.6 7h14.8" /><path d="M9.6 7V5.6A1.6 1.6 0 0 1 11.2 4h1.6a1.6 1.6 0 0 1 1.6 1.6V7" /><path d="m6.6 7 .8 11.5A1.6 1.6 0 0 0 9 20h6a1.6 1.6 0 0 0 1.6-1.5L17.4 7" /></>,
  edit: <><path d="M4.6 19.4h4l10-10a2.1 2.1 0 0 0-3-3l-10 10v3Z" /><path d="m14.6 6.4 3 3" /></>,
  printer: <><path d="M7 9.2V4.6h10v4.6" /><rect x="3.5" y="9.2" width="17" height="7" rx="2" /><path d="M7 13.6h10v5.8H7z" /></>,
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  chevronRight: <path d="m10 6 6 6-6 6" />,
  close: <path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" />,
  check: <path d="m5.2 12.6 4.6 4.6L18.8 7.2" />,
  sort: <><path d="m8 9.5 4-4 4 4" /><path d="m8 14.5 4 4 4-4" /></>,
  whatsapp: <><path d="M20 11.9a8 8 0 0 1-11.9 7L4 20.4l1.6-4A8 8 0 1 1 20 11.9Z" /><path d="M9.3 9.3c.4 2.4 2.4 4.4 4.8 4.9l1-1.3 1.7.8-.4 1.5c-2.9.5-6.9-3-7.6-6.6l1.5-.6.7 1.7-.7.6Z" fill="currentColor" stroke="none" /></>,
  logout: <><path d="M14.5 8V5.6A1.6 1.6 0 0 0 12.9 4H6.1A1.6 1.6 0 0 0 4.5 5.6v12.8A1.6 1.6 0 0 0 6.1 20h6.8a1.6 1.6 0 0 0 1.6-1.6V16" /><path d="M10.2 12h9.4" /><path d="m16.8 9 3 3-3 3" /></>,
  alert: <><path d="M12 8.6v4.6" /><circle cx="12" cy="16.3" r=".95" fill="currentColor" stroke="none" /><path d="M10.3 4.4 3.7 16.1A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.9L13.7 4.4a2 2 0 0 0-3.4 0Z" /></>,
  calendar: <><rect x="3.6" y="5.4" width="16.8" height="15" rx="2.6" /><path d="M3.6 10h16.8M8.4 3.6v3.4M15.6 3.6v3.4" /></>,
  arrow: <><path d="M5 12h13" /><path d="m13 7 5 5-5 5" /></>,
  eye: <><path d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12Z" /><circle cx="12" cy="12" r="3" /></>,
}

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name] || ICONS.overview}
    </svg>
  )
}

/* ------------------------------ status pills ---------------------------- */
export function StatusPill({ status }) {
  if (!status) return <span className="status-pill tone-neutral">—</span>
  return <span className={`status-pill tone-${statusTone(status)}`}>{statusLabel(status)}</span>
}

/* ------------------------------ sales chart ----------------------------- */
export function SalesChart({ data = [], height = 170 }) {
  const [hover, setHover] = useState(null)

  if (!data.length) {
    return <p className="muted" style={{ fontSize: 13 }}>No orders in this range yet — your sales line appears here once orders are added.</p>
  }

  const w = 640
  const h = height
  const padT = 16
  const padB = 24
  const padX = 10
  const max = Math.max(...data.map((d) => d.value), 1)
  const innerW = w - padX * 2
  const innerH = h - padT - padB
  const xAt = (i) => padX + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1))
  const yAt = (v) => padT + innerH - (v / max) * innerH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${xAt(data.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => max * f)
  const labelStep = Math.max(1, Math.ceil(data.length / 6))
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="chart-wrap">
      <div className="chart-total">
        <strong>{money(total)}</strong>
        <span>across {data.length} day{data.length === 1 ? '' : 's'} · peak {money(max)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Daily order value chart" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="arionChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <g className="chart-grid">
          {gridLines.map((v) => (
            <line key={v} x1={padX} x2={w - padX} y1={yAt(v)} y2={yAt(v)} />
          ))}
        </g>
        <path d={areaPath} fill="url(#arionChartFill)" />
        <path d={linePath} className="chart-line" />
        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            <rect
              className="chart-hit"
              x={xAt(i) - innerW / Math.max(data.length, 1) / 2}
              y={0}
              width={Math.max(innerW / Math.max(data.length, 1), 8)}
              height={h}
              onMouseEnter={() => setHover(i)}
            />
            {(hover === i || data.length <= 14) && (
              <circle className={`chart-dot ${hover === i ? 'active' : ''}`} cx={xAt(i)} cy={yAt(d.value)} r={hover === i ? 6 : 3.4} />
            )}
            {i % labelStep === 0 && (
              <text className="chart-axis" x={xAt(i)} y={h - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: `${(xAt(hover) / w) * 100}%`, top: `${(yAt(data[hover].value) / h) * 100}%` }}
        >
          {data[hover].label} · {money(data[hover].value)}
        </div>
      )}
    </div>
  )
}

/* -------------------------------- toasts -------------------------------- */
export function ToastStack({ toasts = [] }) {
  if (!toasts.length) return null
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast tone-${toast.tone || 'success'}`} key={toast.id} role="status">
          <span className="toast-icon">
            <Icon name={toast.tone === 'error' ? 'alert' : toast.tone === 'info' ? 'bell' : 'check'} size={15} />
          </span>
          <div>
            <span>{toast.message}</span>
            {toast.detail && <small>{toast.detail}</small>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* --------------------------- command palette ---------------------------- */
export function CommandPalette({ items = [], onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = needle
      ? items.filter((item) => `${item.title} ${item.sub || ''} ${item.group || ''}`.toLowerCase().includes(needle))
      : items
    return matched.slice(0, 40)
  }, [items, query])


  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % Math.max(filtered.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = filtered[safeActive]
      if (item) {
        onClose()
        onSelect(item)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  const safeActive = filtered.length ? Math.min(active, filtered.length - 1) : 0
  const rows = filtered.map((item, i) => ({
    item,
    i,
    showGroup: i === 0 || Boolean(item.group) && item.group !== filtered[i - 1].group,
  }))

  return (
    <div className="palette-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="palette" role="dialog" aria-label="Command palette">
        <div className="palette-field">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search modules, records and actions…"
            aria-label="Search"
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="palette-list">
          {filtered.length === 0 && (
            <div className="palette-empty">
              Nothing matches “{query}”. Try a customer name, order id or module.
            </div>
          )}
          {rows.map(({ item, i, showGroup }) => {
            return (
              <div key={`${item.group}-${item.title}-${i}`}>
                {showGroup && <div className="palette-group">{item.group}</div>}
                <button
                  type="button"
                  className={`palette-item ${i === safeActive ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { onClose(); onSelect(item) }}
                >
                  <span className="pi-icon"><Icon name={item.icon || 'arrow'} size={15} /></span>
                  <span>
                    {item.title}
                    {item.sub && <small>{item.sub}</small>}
                  </span>
                  {item.hint && <span className="pi-hint">{item.hint}</span>}
                </button>
              </div>
            )
          })}
        </div>
        <div className="palette-foot">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------- empty & loading --------------------------- */
export function EmptyState({ gif = '/gifs/empty.gif', title, text, action }) {
  return (
    <div className="empty-state">
      <img src={gif} alt="" loading="lazy" />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function Loader({ label = 'Loading workspace records…' }) {
  return (
    <div className="loading-panel">
      <img src="/gifs/loader.gif" alt="" />
      <span>{label}</span>
    </div>
  )
}
