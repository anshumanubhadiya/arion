
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const MODULES = {
  overview: { label: 'Overview', icon: '◫' },
  customers: { label: 'Customers', icon: '♙' },
  leads: { label: 'Leads', icon: '◉' },
  orders: { label: 'Orders', icon: '▣' },
  payments: { label: 'Payments', icon: '₹' },
  tasks: { label: 'Tasks', icon: '✓' },
}

const CONFIG = {
  customers: {
    title: 'Customers',
    description: 'Manage customer details in your workspace.',
    table: 'customers',
    fields: [
      { name: 'name', label: 'Customer name', required: true },
      { name: 'phone', label: 'Phone number' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      ['name', 'Customer'],
      ['phone', 'Phone'],
      ['email', 'Email'],
      ['notes', 'Notes'],
    ],
  },
  leads: {
    title: 'Leads',
    description: 'Track enquiries and potential customers.',
    table: 'leads',
    fields: [
      { name: 'customer_name', label: 'Customer name', required: true },
      { name: 'phone', label: 'Phone number' },
      { name: 'source', label: 'Source', placeholder: 'Walk-in, WhatsApp, referral...' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      ['customer_name', 'Lead'],
      ['phone', 'Phone'],
      ['source', 'Source'],
      ['status', 'Status'],
      ['notes', 'Notes'],
    ],
  },
  orders: {
    title: 'Orders',
    description: 'Track orders, values and delivery status.',
    table: 'orders',
    fields: [
      { name: 'customer_id', label: 'Customer ID (optional)' },
      { name: 'description', label: 'Order description', required: true },
      { name: 'amount', label: 'Amount (₹)', type: 'number', required: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['received', 'processing', 'ready', 'delivered', 'cancelled'],
      },
      { name: 'due_date', label: 'Due date', type: 'date' },
    ],
    columns: [
      ['description', 'Order'],
      ['customer_id', 'Customer ID'],
      ['amount', 'Amount'],
      ['status', 'Status'],
      ['due_date', 'Due date'],
    ],
  },
  payments: {
    title: 'Payments',
    description: 'Record payments and monitor payment status.',
    table: 'payments',
    fields: [
      { name: 'order_id', label: 'Order ID (optional)' },
      { name: 'amount', label: 'Amount (₹)', type: 'number', required: true },
      {
        name: 'method',
        label: 'Payment method',
        type: 'select',
        options: ['cash', 'upi', 'card', 'bank_transfer', 'other'],
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['pending', 'paid', 'failed', 'refunded'],
      },
    ],
    columns: [
      ['order_id', 'Order ID'],
      ['amount', 'Amount'],
      ['method', 'Method'],
      ['status', 'Status'],
      ['paid_at', 'Paid at'],
    ],
  },
  tasks: {
    title: 'Tasks',
    description: 'Manage work, follow-ups and due dates.',
    table: 'tasks',
    fields: [
      { name: 'title', label: 'Task title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['pending', 'in_progress', 'completed', 'cancelled'],
      },
      { name: 'due_at', label: 'Due date', type: 'date' },
    ],
    columns: [
      ['title', 'Task'],
      ['description', 'Description'],
      ['status', 'Status'],
      ['due_at', 'Due date'],
    ],
  },
}

function readableError(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString('en-IN')
  return String(value)
}

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('overview')
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({})
  const [editingId, setEditingId] = useState(null)

  const loadWorkspace = useCallback(async (currentUser) => {
    setError('')
    setWorkspace(null)
    setProfile(null)

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profileData) {
      throw new Error('Profile nahi mila. Supabase mein profile aur owner setup check karo.')
    }

    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (memberError) throw memberError
    if (!membership) {
      throw new Error('Workspace membership nahi mili. Is user ko workspace se connect karo.')
    }

    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', membership.workspace_id)
      .maybeSingle()

    if (workspaceError) throw workspaceError
    if (!workspaceData) {
      throw new Error('Workspace nahi mila. Workspace access aur RLS policies check karo.')
    }

    setProfile({ ...profileData, membershipRole: membership.role })
    setWorkspace(workspaceData)
  }, [])

  const loadTable = useCallback(async (key, workspaceId) => {
    const config = CONFIG[key]
    const { data, error: queryError } = await supabase
      .from(config.table)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (queryError) throw queryError
    return data || []
  }, [])

  const refreshData = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)
    setError('')
    try {
      const results = await Promise.all(
        Object.keys(CONFIG).map(async (key) => [
          key,
          await loadTable(key, workspace.id),
        ]),
      )
      setRecords(Object.fromEntries(results))
    } catch (err) {
      setError(readableError(err))
    } finally {
      setLoading(false)
    }
  }, [workspace?.id, loadTable])

  useEffect(() => {
    let alive = true

    async function restoreSession() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!alive) return

        setSession(data.session)
        setUser(data.session?.user || null)

        if (data.session?.user) {
          await loadWorkspace(data.session.user)
        }
      } catch (err) {
        if (alive) setError(readableError(err))
      } finally {
        if (alive) setLoading(false)
      }
    }

    restoreSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
        setUser(nextSession?.user || null)
        if (!nextSession) {
          setWorkspace(null)
          setProfile(null)
          setRecords({})
          setLoading(false)
          setError('')
        }
      },
    )

    return () => {
      alive = false
      authListener.subscription.unsubscribe()
    }
  }, [loadWorkspace])

  useEffect(() => {
    if (session?.user && workspace?.id) refreshData()
  }, [session?.user?.id, workspace?.id, refreshData])

  async function signIn(event) {
    event.preventDefault()
    setAuthBusy(true)
    setError('')
    setNotice('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError
      setSession(data.session)
      setUser(data.user)
      await loadWorkspace(data.user)
      setNotice('Login successful. Workspace connected.')
    } catch (err) {
      setError(readableError(err))
    } finally {
      setAuthBusy(false)
      setLoading(false)
    }
  }

  async function signOut() {
    setError('')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(readableError(signOutError))
  }

  function startAdd() {
    setEditingId(null)
    setForm({})
    setShowForm(true)
    setError('')
    setNotice('')
  }

  function startEdit(record) {
    setEditingId(record.id)
    const next = {}
    CONFIG[page].fields.forEach((field) => {
      let value = record[field.name] ?? ''
      if (field.type === 'date' && value) value = String(value).slice(0, 10)
      next[field.name] = value
    })
    setForm(next)
    setShowForm(true)
    setError('')
    setNotice('')
  }

  async function saveRecord(event) {
    event.preventDefault()
    if (!workspace?.id || !CONFIG[page]) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = { ...form }
      CONFIG[page].fields.forEach((field) => {
        if (payload[field.name] === '') payload[field.name] = null
      })

      if (['orders', 'payments'].includes(page) && payload.amount != null) {
        payload.amount = Number(payload.amount)
        if (!Number.isFinite(payload.amount) || payload.amount < 0) {
          throw new Error('Amount valid non-negative number hona chahiye.')
        }
      }

      if (page === 'payments' && payload.status === 'paid' && !editingId) {
        payload.paid_at = new Date().toISOString()
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from(CONFIG[page].table)
          .update(payload)
          .eq('id', editingId)
          .eq('workspace_id', workspace.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from(CONFIG[page].table)
          .insert({ ...payload, workspace_id: workspace.id })

        if (insertError) throw insertError
      }

      setShowForm(false)
      setForm({})
      setEditingId(null)
      setNotice(`${CONFIG[page].title} record saved successfully.`)
      await refreshData()
    } catch (err) {
      setError(readableError(err))
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(record, newStatus) {
    const config = CONFIG[page]
    if (!workspace?.id || !config) return

    setError('')
    setNotice('')
    const payload = { status: newStatus }

    if (page === 'payments' && newStatus === 'paid') {
      payload.paid_at = new Date().toISOString()
    }

    try {
      const { error: updateError } = await supabase
        .from(config.table)
        .update(payload)
        .eq('id', record.id)
        .eq('workspace_id', workspace.id)

      if (updateError) throw updateError
      setNotice('Status updated.')
      await refreshData()
    } catch (err) {
      setError(readableError(err))
    }
  }

  const currentRecords = records[page] || []
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return currentRecords
    return currentRecords.filter((record) =>
      Object.values(record).some((value) =>
        String(value ?? '').toLowerCase().includes(q),
      ),
    )
  }, [currentRecords, search])

  const counts = Object.fromEntries(
    Object.keys(CONFIG).map((key) => [key, (records[key] || []).length]),
  )

  if (loading && !user) {
    return <main className="app-loading">Connecting to Arion AI OS…</main>
  }

  if (!session || !user) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={signIn}>
          <div className="brand-mark">A</div>
          <p className="eyebrow">BUSINESS COMMAND CENTER</p>
          <h1>Arion AI OS</h1>
          <p className="muted">Sign in to your workspace</p>

          {error && <div className="alert error">{error}</div>}

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <button className="primary-btn" disabled={authBusy}>
            {authBusy ? 'Signing in…' : 'Sign in'}
          </button>
          <small>Use your existing Supabase Auth account.</small>
        </form>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">A</div>
          <div>
            <strong>Arion AI OS</strong>
            <small>Business Command Center</small>
          </div>
        </div>

        <p className="nav-caption">WORKSPACE</p>
        <nav>
          {Object.entries(MODULES).map(([key, item]) => (
            <button
              key={key}
              className={`nav-button ${page === key ? 'active' : ''}`}
              onClick={() => {
                setPage(key)
                setSearch('')
                setShowForm(false)
                setError('')
                setNotice('')
              }}
            >
              <span>{item.icon}</span> {item.label}
              {key !== 'overview' && (
                <span className="nav-count">{counts[key] ?? 0}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <strong>{workspace?.name || 'Workspace'}</strong>
          <small>{profile?.full_name || user.email}</small>
          <small>Role: {profile?.membershipRole || profile?.role || 'member'}</small>
          <button className="signout-btn" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="muted">Workspace / </span>
            <strong>{MODULES[page]?.label || 'Overview'}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection-dot" /> Supabase connected
            <button className="secondary-btn" onClick={refreshData} disabled={loading}>
              {loading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
        </header>

        <section className="content-area">
          {error && (
            <div className="alert error">
              <span>{error}</span>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}
          {notice && <div className="alert success">{notice}</div>}

          {page === 'overview' ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR BUSINESS AT A GLANCE</p>
                  <h1>Welcome back, {profile?.full_name || 'Owner'} 👋</h1>
                  <p className="muted">{workspace?.name} · Live workspace data</p>
                </div>
                <button className="primary-btn compact" onClick={() => setPage('customers')}>
                  + Manage customers
                </button>
              </div>

              {loading ? (
                <div className="panel loading-panel">Loading workspace records…</div>
              ) : (
                <>
                  <div className="metric-grid">
                    {[
                      ['Customers', counts.customers, '♙'],
                      ['Open leads', (records.leads || []).filter((x) => !['converted', 'lost'].includes(x.status)).length, '◉'],
                      ['Orders', counts.orders, '▣'],
                      ['Tasks', (records.tasks || []).filter((x) => x.status !== 'completed').length, '✓'],
                    ].map(([label, value, icon]) => (
                      <button className="metric-card" key={label} onClick={() => setPage(label === 'Open leads' ? 'leads' : label.toLowerCase())}>
                        <span>{label}</span><span className="metric-icon">{icon}</span>
                        <strong>{value}</strong><small>Records in this workspace</small>
                      </button>
                    ))}
                  </div>

                  <div className="overview-grid">
                    <section className="panel">
                      <h2>Recent orders</h2>
                      <p className="muted">Latest records from Supabase</p>
                      <RecordPreview
                        rows={(records.orders || []).slice(0, 5)}
                        nameField="description"
                        detailField="status"
                        empty="No orders yet. Add your first order."
                      />
                      <button className="text-btn" onClick={() => setPage('orders')}>View all orders →</button>
                    </section>
                    <section className="panel">
                      <h2>Tasks & follow-ups</h2>
                      <p className="muted">Actions that need attention</p>
                      <RecordPreview
                        rows={(records.tasks || []).slice(0, 5)}
                        nameField="title"
                        detailField="status"
                        empty="No tasks yet. Add a follow-up."
                      />
                      <button className="text-btn" onClick={() => setPage('tasks')}>View all tasks →</button>
                    </section>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ARION WORKSPACE</p>
                  <h1>{CONFIG[page]?.title}</h1>
                  <p className="muted">{CONFIG[page]?.description}</p>
                </div>
                <button className="primary-btn compact" onClick={startAdd}>
                  + Add {page === 'leads' ? 'lead' : page === 'tasks' ? 'task' : page.slice(0, -1)}
                </button>
              </div>

              <div className="toolbar">
                <input
                  className="search-input"
                  placeholder={`Search ${CONFIG[page]?.title.toLowerCase()}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="muted">{filteredRecords.length} record(s)</span>
              </div>

              {showForm && (
                <form className="panel record-form" onSubmit={saveRecord}>
                  <h2>{editingId ? 'Edit record' : `Add ${CONFIG[page]?.title.slice(0, -1)}`}</h2>
                  <div className="form-grid">
                    {CONFIG[page].fields.map((field) => (
                      <label className="form-field" key={field.name}>
                        <span>{field.label}{field.required ? ' *' : ''}</span>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={form[field.name] ?? ''}
                            onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                            required={field.required}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            value={form[field.name] ?? field.options[0]}
                            onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                            required={field.required}
                          >
                            {field.options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={form[field.name] ?? ''}
                            onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                            placeholder={field.placeholder || ''}
                            required={field.required}
                            min={field.type === 'number' ? 0 : undefined}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="form-actions">
                    <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
                    <button className="primary-btn" disabled={saving}>
                      {saving ? 'Saving…' : 'Save to Supabase'}
                    </button>
                  </div>
                </form>
              )}

              <section className="panel table-panel">
                {loading ? (
                  <div className="loading-panel">Loading {CONFIG[page]?.title.toLowerCase()}…</div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {CONFIG[page]?.columns.map(([key, label]) => <th key={key}>{label}</th>)}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((record) => (
                          <tr key={record.id}>
                            {CONFIG[page]?.columns.map(([key]) => (
                              <td key={key}>
                                {key === 'amount' && record[key] != null
                                  ? `₹${Number(record[key]).toLocaleString('en-IN')}`
                                  : formatValue(record[key])}
                              </td>
                            ))}
                            <td>
                              <div className="row-actions">
                                <button className="secondary-btn tiny" onClick={() => startEdit(record)}>Edit</button>
                                {record.status && (
                                  <select
                                    className="status-select"
                                    value={record.status}
                                    aria-label={`Change status for ${record.id}`}
                                    onChange={(e) => updateStatus(record, e.target.value)}
                                  >
                                    {(CONFIG[page].fields.find((f) => f.name === 'status')?.options || [record.status]).map((status) => (
                                      <option key={status} value={status}>{status}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredRecords.length === 0 && (
                          <tr><td colSpan={CONFIG[page]?.columns.length + 1} className="empty-cell">
                            {search ? 'No matching records.' : 'No records yet. Click Add to create one.'}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
          <footer>Arion AI OS · {workspace?.name} · Workspace-scoped records</footer>
        </section>
      </main>
    </div>
  )
}

function RecordPreview({ rows, nameField, detailField, empty }) {
  if (!rows.length) return <p className="empty-cell">{empty}</p>
  return (
    <div className="preview-list">
      {rows.map((row) => (
        <div className="preview-row" key={row.id}>
          <div><strong>{row[nameField] || 'Untitled'}</strong><small>{row[detailField] || 'No status'}</small></div>
          {row.amount != null && <strong>₹{Number(row.amount).toLocaleString('en-IN')}</strong>}
        </div>
      ))}
    </div>
  )
}

export default App