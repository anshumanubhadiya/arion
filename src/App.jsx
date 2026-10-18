
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { INVOICE_LOGO_DATA_URL } from './assets/invoice-logo.js'
import { openInvoice, openPaymentReceipt } from './documents.jsx'
import { ReportsPage } from './reports.jsx'
import { Icon, StatusPill, SalesChart, ToastStack, CommandPalette, EmptyState, Loader } from './ui.jsx'
import { compareValues, money } from './utils.js'
import './App.css'

const MODULES = {
  overview: { label: 'Overview', icon: 'overview' },
  customers: { label: 'Customers', icon: 'customers' },
  leads: { label: 'Leads', icon: 'leads' },
  orders: { label: 'Orders', icon: 'orders' },
  payments: { label: 'Payments', icon: 'payments' },
  tasks: { label: 'Tasks', icon: 'tasks' },
  prescriptions: { label: 'Eye Prescriptions', icon: 'prescriptions' },
  inventory: { label: 'Optical Inventory', icon: 'inventory' },
  sales: { label: 'Sales', icon: 'sales' },
  reports: { label: 'Reports', icon: 'reports' },
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
      { name: 'customer_id', label: 'Customer', type: 'customer', required: true },
      { name: 'prescription_id', label: 'Linked eye prescription', type: 'prescription', required: true },
      { name: 'frame_inventory_id', label: 'Frame (if included)', type: 'inventory_frame' },
      { name: 'frame_quantity', label: 'Frame quantity', type: 'number', min: 1 },
      { name: 'lens_inventory_id', label: 'Lens (if included)', type: 'inventory_lens' },
      { name: 'lens_quantity', label: 'Lens quantity', type: 'number', min: 1 },
      { name: 'description', label: 'Order description / custom details', required: true },
      { name: 'amount', label: 'Total bill (₹)', type: 'number', required: true, min: 0, step: '0.01' },
      { name: 'advance_paid', label: 'Advance paid (₹)', type: 'number', required: true, min: 0, step: '0.01' },
      { name: 'remaining_balance_display', label: 'Remaining balance (auto)', type: 'calculated', readOnly: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['received', 'processing', 'ready', 'delivered', 'cancelled'],
        required: true,
      },
      { name: 'expected_delivery_date', label: 'Expected delivery date', type: 'date', required: true },
      { name: 'due_date', label: 'Due date', type: 'date', required: true },
    ],
    columns: [
      ['description', 'Order'],
      ['customer_id', 'Customer'],
      ['amount', 'Total bill'],
      ['advance_paid', 'Advance'],
      ['remaining_balance', 'Balance'],
      ['status', 'Status'],
      ['expected_delivery_date', 'Expected delivery'],
    ],
  },
  payments: {
    title: 'Payments',
    description: 'Record payments and monitor payment status.',
    table: 'payments',
    fields: [
      { name: 'order_id', label: 'Link to order (optional)', type: 'order' },
      { name: 'amount', label: 'Amount received / due (₹)', type: 'number', required: true, min: 0.01, step: '0.01' },
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
  prescriptions: {
    title: 'Eye Prescriptions',
    description: 'Save and review right-eye and left-eye prescription measurements.',
    table: 'eye_prescriptions',
    fields: [
      { name: 'customer_id', label: 'Customer', type: 'customer', required: true },
      { name: 'exam_date', label: 'Checkup date', type: 'date', required: true },
      { name: 'right_sph', label: 'Right eye · SPH', type: 'number', step: '0.25' },
      { name: 'right_cyl', label: 'Right eye · CYL', type: 'number', step: '0.25' },
      { name: 'right_axis', label: 'Right eye · Axis (0–180)', type: 'number' },
      { name: 'right_add', label: 'Right eye · ADD', type: 'number', step: '0.25' },
      { name: 'left_sph', label: 'Left eye · SPH', type: 'number', step: '0.25' },
      { name: 'left_cyl', label: 'Left eye · CYL', type: 'number', step: '0.25' },
      { name: 'left_axis', label: 'Left eye · Axis (0–180)', type: 'number' },
      { name: 'left_add', label: 'Left eye · ADD', type: 'number', step: '0.25' },
      { name: 'pd', label: 'PD (mm)', type: 'number', step: '0.5' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      ['customer_id', 'Customer'], ['exam_date', 'Checkup date'],
      ['right_sph', 'R SPH'], ['right_cyl', 'R CYL'], ['right_axis', 'R Axis'],
      ['left_sph', 'L SPH'], ['left_cyl', 'L CYL'], ['left_axis', 'L Axis'],
      ['pd', 'PD (mm)'],
    ],
  },
  inventory: {
    title: 'Optical Inventory',
    description: 'Track frames, lenses and stock levels. Items at or below reorder level are flagged.',
    table: 'optical_inventory',
    fields: [
      { name: 'item_name', label: 'Item name', required: true },
      { name: 'item_type', label: 'Type', type: 'select', options: ['frame', 'lens', 'sunglasses', 'contact_lens', 'accessory', 'other'] },
      { name: 'brand', label: 'Brand' },
      { name: 'model', label: 'Model / description' },
      { name: 'sku', label: 'SKU / barcode' },
      { name: 'quantity', label: 'Quantity in stock', type: 'number', required: true, min: 0 },
      { name: 'reorder_level', label: 'Low-stock threshold', type: 'number', min: 0 },
      { name: 'cost_price', label: 'Cost price (₹)', type: 'number', min: 0, step: '0.01' },
      { name: 'selling_price', label: 'Selling price (₹)', type: 'number', min: 0, step: '0.01' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      ['item_name', 'Item'], ['item_type', 'Type'], ['brand', 'Brand'],
      ['sku', 'SKU'], ['quantity', 'In stock'], ['reorder_level', 'Low-stock at'],
      ['cost_price', 'Cost'], ['selling_price', 'Selling price'],
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

// Soft click sound — place click.mp3 in public/sounds/
const clickAudio = typeof Audio !== 'undefined' ? new Audio('/sounds/click.mp3') : null
if (clickAudio) clickAudio.volume = 0.28

function playClick() {
  if (!clickAudio) return
  try {
    clickAudio.currentTime = 0
    clickAudio.play().catch(() => {})
  } catch {
    // ignore autoplay block or missing file
  }
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
  const [reportPeriod, setReportPeriod] = useState('30')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({})
  const [editingId, setEditingId] = useState(null)
  const orderRequestIdRef = useRef(null)
  const paymentRequestIdRef = useRef(null)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('arion-theme') || 'light' } catch { return 'light' }
  })
  const [toasts, setToasts] = useState([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })
  const [tablePage, setTablePage] = useState(1)

  const notify = useCallback((message, tone = 'success', detail = '') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((list) => [...list, { id, message, detail, tone }])
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 4200)
  }, [])

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('arion-theme', theme) } catch { /* storage unavailable */ }
  }, [theme])

  useEffect(() => {
    function onKeyDown(event) {
      const tag = event.target?.tagName || ''
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        setNotifsOpen(false)
        return
      }
      if (event.key === '/' && !typing) {
        event.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false)
        setNotifsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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
      notify('Welcome back', 'success', 'Signed in to your workspace.')
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
    playClick()
    setEditingId(null)
    setForm({})
    setShowForm(true)
    setError('')
    setNotice('')
  }

  function quickAdd(targetPage) {
    playClick()
    setPage(targetPage)
    setSearch('')
    setEditingId(null)
    setForm({})
    setShowForm(true)
    setError('')
    setNotice('')
  }

  function startEdit(record) {
    playClick()
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
      delete payload.remaining_balance_display

      if (['orders', 'payments'].includes(page) && payload.amount != null) {
        payload.amount = Number(payload.amount)
        if (!Number.isFinite(payload.amount) || payload.amount < 0 || (page === 'payments' && payload.amount <= 0)) {
          throw new Error(page === 'payments' ? 'Payment amount zero se zyada hona chahiye.' : 'Amount valid non-negative number hona chahiye.')
        }
      }

      let linkedPaymentOrder = null
      if (page === 'payments' && payload.order_id) {
        linkedPaymentOrder = (records.orders || []).find((order) => String(order.id) === String(payload.order_id))
        if (!linkedPaymentOrder) throw new Error('Selected order nahi mila. Order list refresh karke dobara try karo.')
        if (payload.status === 'paid' && Number(payload.amount) > Math.max(0, Number(linkedPaymentOrder.remaining_balance ?? (Number(linkedPaymentOrder.amount || 0) - Number(linkedPaymentOrder.advance_paid || 0))))) {
          throw new Error('Payment order ke remaining balance se zyada nahi ho sakta.')
        }
      }

      let selectedStock = []
      if (page === 'orders') {
        if (!(records.customers || []).some((customer) => String(customer.id) === String(payload.customer_id))) {
          throw new Error('Order save karne ke liye registered customer select karo.')
        }
        if (!(records.prescriptions || []).some((prescription) => String(prescription.id) === String(payload.prescription_id) && String(prescription.customer_id) === String(payload.customer_id))) {
          throw new Error('Selected customer ki valid eye prescription select karo.')
        }
        payload.amount = Number(payload.amount)
        payload.advance_paid = Number(payload.advance_paid)
        payload.frame_quantity = Number(payload.frame_quantity || 1)
        payload.lens_quantity = Number(payload.lens_quantity || 1)
        if (payload.advance_paid < 0 || payload.advance_paid > payload.amount) throw new Error('Advance paid total bill se zyada nahi ho sakta.')
        payload.remaining_balance = payload.amount - payload.advance_paid
        delete payload.remaining_balance_display
        if (!payload.expected_delivery_date || !payload.due_date) throw new Error('Expected delivery date aur due date dono required hain.')
        for (const [idKey, qtyKey, label] of [['frame_inventory_id', 'frame_quantity', 'frame'], ['lens_inventory_id', 'lens_quantity', 'lens']]) {
          if (payload[idKey]) {
            const item = (records.inventory || []).find((x) => String(x.id) === String(payload[idKey]))
            const qty = Number(payload[qtyKey] || 1)
            if (!item || Number(item.quantity || 0) < qty) throw new Error(`${label} stock mein required quantity available nahi hai.`)
            selectedStock.push({ id: item.id, quantity: qty, current: Number(item.quantity || 0), name: item.item_name })
          }
        }
      }

      if (page === 'prescriptions') {
        if (!(records.customers || []).some((customer) => String(customer.id) === String(payload.customer_id))) {
          throw new Error('Prescription save karne se pehle customer select karo.')
        }
        for (const key of ['right_axis', 'left_axis']) {
          if (payload[key] != null && payload[key] !== '') {
            const axis = Number(payload[key])
            if (!Number.isFinite(axis) || axis < 0 || axis > 180) throw new Error('Axis 0 se 180 ke beech hona chahiye.')
          }
        }
      }

      if (page === 'inventory') {
        for (const key of ['quantity', 'reorder_level', 'cost_price', 'selling_price']) {
          if (payload[key] != null && payload[key] !== '') {
            payload[key] = Number(payload[key])
            if (!Number.isFinite(payload[key]) || payload[key] < 0) throw new Error(`${key} valid non-negative number hona chahiye.`)
          }
        }
      }

      if (page === 'payments' && payload.status === 'paid' && !editingId) {
        payload.paid_at = new Date().toISOString()
      }

      if (page === 'orders') {
        // Keep the same request id when a network response is lost, so retrying cannot create a duplicate order.
        if (!editingId && !orderRequestIdRef.current) orderRequestIdRef.current = crypto.randomUUID()
        const { error: orderError } = await supabase.rpc('save_optical_order_atomic', {
          p_workspace_id: workspace.id,
          p_order_id: editingId || null,
          p_request_id: editingId ? null : orderRequestIdRef.current,
          p_payload: payload,
        })
        if (orderError) throw orderError
      } else if (page === 'payments') {
        // A stable request ID makes a retry idempotent if the network response is lost.
        if (!editingId && !paymentRequestIdRef.current) paymentRequestIdRef.current = crypto.randomUUID()
        const { error: paymentError } = await supabase.rpc('save_optical_payment_atomic', {
          p_workspace_id: workspace.id,
          p_payment_id: editingId || null,
          p_request_id: editingId ? null : paymentRequestIdRef.current,
          p_payload: payload,
        })
        if (paymentError) throw paymentError
      } else if (editingId) {
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

      if (page === 'orders' && !editingId) orderRequestIdRef.current = null
      if (page === 'payments' && !editingId) paymentRequestIdRef.current = null
      setShowForm(false)
      setForm({})
      setEditingId(null)
      setNotice(`${CONFIG[page].title} record saved successfully.`)
      notify(`${CONFIG[page].title} saved`, 'success', editingId ? 'Changes written to Supabase.' : 'New record added to this workspace.')
      await refreshData()
    } catch (err) {
      setError(readableError(err))
      notify('Could not save', 'error', readableError(err))
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
      if (page === 'orders' && newStatus === 'cancelled') {
        const { error: cancelError } = await supabase.rpc('set_optical_order_status_atomic', {
          p_workspace_id: workspace.id,
          p_order_id: record.id,
          p_status: newStatus,
        })
        if (cancelError) throw cancelError
      } else if (page === 'payments') {
        const { error: paymentStatusError } = await supabase.rpc('set_optical_payment_status_atomic', {
          p_workspace_id: workspace.id,
          p_payment_id: record.id,
          p_status: newStatus,
        })
        if (paymentStatusError) throw paymentStatusError
      } else {
        const { error: updateError } = await supabase
          .from(config.table)
          .update(payload)
          .eq('id', record.id)
          .eq('workspace_id', workspace.id)
        if (updateError) throw updateError
      }
      setNotice('Status updated.')
      notify(`Status updated to ${String(newStatus).replace('_', ' ')}`, 'success')
      await refreshData()
    } catch (err) {
      setError(readableError(err))
      notify('Status update failed', 'error', readableError(err))
    }
  }

  async function deleteRecord(record) {
    const config = CONFIG[page]
    if (!workspace?.id || !config) return
    const label = record[config.columns[0][0]] || record.id
    const confirmed = window.confirm(`Delete “${String(label).slice(0, 60)}”? This cannot be undone.`)
    if (!confirmed) return

    setError('')
    setNotice('')
    try {
      const { error: deleteError } = await supabase
        .from(config.table)
        .delete()
        .eq('id', record.id)
        .eq('workspace_id', workspace.id)
      if (deleteError) throw deleteError
      notify('Record deleted', 'success', 'Removed from this workspace.')
      await refreshData()
    } catch (err) {
      setError(readableError(err))
      notify('Delete failed', 'error', readableError(err))
    }
  }

  function openWhatsApp(phone, message) {
    const digits = String(phone || '').replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Is record mein valid phone number nahi hai. Pehle number add karo.')
      notify('No phone number', 'error', 'Add a mobile number to this record first.')
      return
    }
    const full = digits.length === 10 ? `91${digits}` : digits
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const alerts = useMemo(() => {
    const list = []
    const lowStock = (records.inventory || []).filter((item) => Number(item.quantity || 0) <= Number(item.reorder_level || 0))
    if (lowStock.length) {
      list.push({
        tone: 'red', icon: 'alert', title: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} low on stock`,
        sub: lowStock.slice(0, 2).map((item) => item.item_name).join(', '), page: 'inventory',
      })
    }
    const today = new Date().toISOString().slice(0, 10)
    const overdue = (records.tasks || []).filter((task) => task.due_at && String(task.due_at).slice(0, 10) < today && !['completed', 'cancelled'].includes(String(task.status)))
    if (overdue.length) {
      list.push({
        tone: 'amber', icon: 'calendar', title: `${overdue.length} task${overdue.length > 1 ? 's' : ''} overdue`,
        sub: overdue[0].title || 'Follow-up pending', page: 'tasks',
      })
    }
    const ready = (records.orders || []).filter((order) => String(order.status).toLowerCase() === 'ready')
    if (ready.length) {
      list.push({
        tone: 'green', icon: 'orders', title: `${ready.length} order${ready.length > 1 ? 's' : ''} ready for pickup`,
        sub: 'Notify customers to collect', page: 'orders',
      })
    }
    const unpaid = (records.payments || []).filter((payment) => String(payment.status).toLowerCase() === 'pending')
    if (unpaid.length) {
      list.push({
        tone: 'blue', icon: 'payments', title: `${unpaid.length} payment${unpaid.length > 1 ? 's' : ''} pending`,
        sub: 'Confirm or record receipts', page: 'payments',
      })
    }
    return list
  }, [records])

  const paletteItems = useMemo(() => {
    const gotoItems = Object.entries(MODULES).map(([key, item]) => ({
      group: 'Go to', icon: item.icon, title: item.label, sub: `Open ${item.label.toLowerCase()}`,
      run: () => { setPage(key); setSearch(''); setShowForm(false); setError(''); setNotice('') },
    }))
    const actionItems = [
      { group: 'Actions', icon: 'plus', title: 'Add a new order', sub: 'Frame, lens, bill and dates', run: () => quickAdd('orders') },
      { group: 'Actions', icon: 'customers', title: 'Add a customer', sub: 'Name, phone and notes', run: () => quickAdd('customers') },
      { group: 'Actions', icon: 'payments', title: 'Record a payment', sub: 'Cash, UPI, card or bank', run: () => quickAdd('payments') },
      { group: 'Actions', icon: 'prescriptions', title: 'Add an eye prescription', sub: 'SPH, CYL, axis and PD', run: () => quickAdd('prescriptions') },
      { group: 'Actions', icon: 'refresh', title: 'Refresh workspace data', run: () => refreshData() },
      { group: 'Actions', icon: 'sun', title: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode', run: () => setTheme((value) => (value === 'light' ? 'dark' : 'light')) },
      { group: 'Actions', icon: 'download', title: `Export ${CONFIG[page]?.title || 'data'} as CSV`, run: () => exportModuleCsv() },
      { group: 'Actions', icon: 'logout', title: 'Sign out', run: () => signOut() },
    ]
    const customerItems = (records.customers || []).slice(0, 40).map((customer) => ({
      group: 'Customers', icon: 'customers', title: customer.name || 'Unnamed customer',
      sub: [customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact saved',
      run: () => { setPage('customers'); setSearch(customer.name || '') },
    }))
    const orderItems = (records.orders || []).slice(0, 40).map((order) => {
      const customer = (records.customers || []).find((item) => String(item.id) === String(order.customer_id))
      return {
        group: 'Orders', icon: 'orders',
        title: `${order.description || 'Order'} · ${customer?.name || 'Customer'}`,
        sub: `${money(order.amount)} · ${String(order.status || '').replace('_', ' ')}`,
        run: () => { setPage('orders'); setSearch(customer?.name || order.description || '') },
      }
    })
    return [...gotoItems, ...actionItems, ...customerItems, ...orderItems]
  }, [records, page, theme, sort, workspace])

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

  const sortedRecords = useMemo(() => {
    if (!sort.key) return filteredRecords
    return [...filteredRecords].sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.dir))
  }, [filteredRecords, sort])

  const salesSeries = useMemo(() => {
    const days = 14
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(startOfToday)
      date.setDate(startOfToday.getDate() - (days - 1 - index))
      return { date, start: date.getTime(), value: 0 }
    })
    const activeOrders = (records.orders || []).filter((order) => String(order.status).toLowerCase() !== 'cancelled')
    activeOrders.forEach((order) => {
      const raw = order.created_at || order.order_date || order.expected_delivery_date
      if (!raw) return
      const when = new Date(raw).getTime()
      const bucket = buckets.find((entry) => when >= entry.start && when < entry.start + 86400000)
      if (bucket) bucket.value += Number(order.amount || 0)
    })
    return buckets.map((entry) => ({
      label: entry.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: entry.value,
    }))
  }, [records])

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / 10))
  const visibleRecords = sortedRecords.slice((tablePage - 1) * 10, tablePage * 10)

  function toggleSort(key) {
    playClick()
    setTablePage(1)
    setSort((current) => ({ key, dir: current.key === key && current.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function exportModuleCsv() {
    const config = CONFIG[page]
    if (!config) return
    const rows = [config.columns.map(([, label]) => label)]
    sortedRecords.forEach((record) => {
      rows.push(config.columns.map(([key]) => {
        if (key === 'remaining_balance') {
          return Math.max(0, Number(record.amount || 0) - Number(record.advance_paid || 0))
        }
        const value = record[key]
        if ((key === 'customer_id') && (page === 'orders' || page === 'prescriptions')) {
          return (records.customers || []).find((customer) => String(customer.id) === String(value))?.name || value || ''
        }
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return value
      }))
    })
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `arion-${page}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('CSV exported', 'success', `${sortedRecords.length} ${config.title.toLowerCase()} record(s).`)
  }

  function shareOrderWhatsApp(order) {
    const customer = (records.customers || []).find((item) => String(item.id) === String(order.customer_id)) || {}
    const total = Number(order.amount || 0)
    const balance = Math.max(0, Number(order.remaining_balance ?? total - Number(order.advance_paid || 0)))
    const text = `Namaste ${customer.name || 'ji'}! Aapka order “${order.description || 'Optical order'}” (${money(total)}) ka balance ${money(balance)} baaki hai. Status: ${String(order.status || '').replace('_', ' ')}. — ${workspace?.name || 'Mr & Mrs Optical'}`
    openWhatsApp(customer.phone, text)
  }

  const reportData = useMemo(() => {
    const orders = records.orders || []
    const payments = records.payments || []
    const inventory = records.inventory || []
    const now = new Date()
    const cutoff = reportPeriod === 'all' ? null : new Date(now.getTime() - Number(reportPeriod) * 86400000)
    const orderDate = (o) => o.created_at || o.order_date || o.created_on || o.expected_delivery_date || null
    const includedOrders = orders.filter((o) => {
      if (!cutoff) return true
      const d = orderDate(o)
      return d && new Date(d) >= cutoff
    })
    const activeOrders = includedOrders.filter((o) => String(o.status || '').toLowerCase() !== 'cancelled')
    const sales = activeOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0)
    const collected = payments.filter((p) => String(p.status || '').toLowerCase() === 'paid' && (!cutoff || new Date(p.paid_at || p.created_at || 0) >= cutoff)).reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const outstanding = activeOrders.reduce((sum, o) => sum + Math.max(0, Number(o.remaining_balance ?? (Number(o.amount || 0) - Number(o.advance_paid || 0)))), 0)
    const inventoryValue = inventory.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.cost_price || 0), 0)
    const lowStock = inventory.filter((i) => Number(i.quantity || 0) <= Number(i.reorder_level || 0))
    const orderCost = (o) => {
      const frame = inventory.find((i) => String(i.id) === String(o.frame_inventory_id))
      const lens = inventory.find((i) => String(i.id) === String(o.lens_inventory_id))
      return (frame ? Number(frame.cost_price || 0) * Number(o.frame_quantity || 1) : 0) + (lens ? Number(lens.cost_price || 0) * Number(o.lens_quantity || 1) : 0)
    }
    const estimatedCogs = activeOrders.reduce((sum, o) => sum + orderCost(o), 0)
    const estimatedGrossProfit = sales - estimatedCogs
    const profitCoverage = activeOrders.length > 0 && activeOrders.every((o) => !o.frame_inventory_id && !o.lens_inventory_id || inventory.some((i) => String(i.id) === String(o.frame_inventory_id)) || inventory.some((i) => String(i.id) === String(o.lens_inventory_id)))
    return { includedOrders, activeOrders, sales, collected, outstanding, inventoryValue, lowStock, estimatedCogs, estimatedGrossProfit, profitCoverage }
  }, [records, reportPeriod])

  function exportReportCsv() {
    const rows = [['Report','Metric','Value'],['Sales','Order value',reportData.sales],['Payments','Paid payments in period',reportData.collected],['Orders','Outstanding balance',reportData.outstanding],['Inventory','Stock cost value',reportData.inventoryValue],['Profit','Estimated COGS for linked frame/lens',reportData.estimatedCogs],['Profit','Estimated gross profit',reportData.estimatedGrossProfit],['Inventory','Low-stock item count',reportData.lowStock.length]]
    rows.push([], ['Inventory item','Type','Quantity','Reorder level','Cost price','Selling price','Stock cost value','Low stock'])
    ;(records.inventory || []).forEach((i) => rows.push([i.item_name, i.item_type, i.quantity, i.reorder_level, i.cost_price, i.selling_price, Number(i.quantity || 0) * Number(i.cost_price || 0), Number(i.quantity || 0) <= Number(i.reorder_level || 0) ? 'Yes' : 'No']))
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'arion-ai-os-sales-inventory-report.csv'; a.click(); URL.revokeObjectURL(url)
  }

  if (loading && !user) {
    return (
      <main className="app-loading">
        <img src="/gifs/welcome.gif" alt="" />
        <p>Connecting to Arion AI OS…</p>
      </main>
    )
  }

  if (!session || !user) {
    return (
      <main className="login-shell">
        <section className="login-visual">
          <img className="bg" src="/images/hero-shop.jpg" alt="" />
          <div className="brand-row">
            <div className="brand-mark">A</div>
            <div>
              <strong>Arion AI OS</strong>
              <small>Optical Business Workspace</small>
            </div>
          </div>
          <div className="login-pitch">
            <h2>Every frame, lens and rupee — in one calm workspace.</h2>
            <p>
              Customers, eye prescriptions, orders, payments and stock for your optical
              shop, connected straight to your Supabase project.
            </p>
            <div className="login-features">
              <span>Eye prescriptions</span>
              <span>Orders &amp; invoices</span>
              <span>Payments &amp; receipts</span>
              <span>Low-stock alerts</span>
              <span>Profit reports</span>
            </div>
          </div>
          <p className="login-legal">1st Floor, Darshan Complex, Opp. GEB, Dehgam, Dist. Gandhinagar – 382305</p>
        </section>

        <section className="login-side">
          <form className="login-card" onSubmit={signIn}>
            <img className="gif" src="/gifs/welcome.gif" alt="" />
            <p className="eyebrow">BUSINESS COMMAND CENTER</p>
            <h1>Sign in</h1>
            <p className="muted">Use your existing Supabase Auth account.</p>

            {error && <div className="alert error">{error}</div>}

            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="you@shop.com"
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />

            <button className="primary-btn" disabled={authBusy}>
              {authBusy ? 'Signing in…' : 'Sign in to workspace'}
            </button>
            <div className="login-hint">
              Inside the app press <span className="kbd">Ctrl / ⌘ + K</span> to jump to any
              module, customer or action.
            </div>
            <small>Row Level Security keeps every workspace’s data separate.</small>
          </form>
        </section>
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
            <small>Optical Business OS</small>
          </div>
        </div>

        <p className="nav-caption">WORKSPACE</p>
        <nav>
          {Object.entries(MODULES).map(([key, item]) => (
            <button
              key={key}
              className={`nav-button ${page === key ? 'active' : ''}`}
              onClick={() => {
                playClick()
                setPage(key)
                setSearch('')
                setShowForm(false)
                setError('')
                setNotice('')
              }}
            >
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              {item.label}
              {CONFIG[key] && (
                <span className="nav-count">{counts[key] ?? 0}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-tip">
          <strong>Keyboard shortcuts</strong>
          <span>
            <span className="kbd">Ctrl / ⌘ + K</span> opens search &amp; actions,{' '}
            <span className="kbd">/</span> focuses the module search.
          </span>
        </div>

        <div className="sidebar-bottom">
          <strong>{workspace?.name || 'Workspace'}</strong>
          <small>{profile?.full_name || user.email}</small>
          <small>Role: {profile?.membershipRole || profile?.role || 'member'}</small>
          <div className="row-actions" style={{ marginTop: '11px' }}>
            <button
              className="secondary-btn tiny"
              onClick={() => { playClick(); setTheme(theme === 'light' ? 'dark' : 'light') }}
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={14} />
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <button className="secondary-btn tiny" onClick={() => { playClick(); setPaletteOpen(true) }}>
              <Icon name="search" size={14} /> Search
            </button>
          </div>
          <button className="signout-btn" onClick={() => { playClick(); signOut() }}>
            <Icon name="logout" size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumbs">
            <span>Workspace</span>
            <span className="sep">/</span>
            <strong>{MODULES[page]?.label || 'Overview'}</strong>
          </div>
          <div className="topbar-actions">
            <button className="palette-trigger" onClick={() => { playClick(); setPaletteOpen(true) }} aria-label="Open command palette">
              <Icon name="search" size={16} />
              <span className="ph-text">Search anything…</span>
              <span className="kbd">Ctrl K</span>
            </button>
            <div className="topbar-right">
              <span className="connection-dot" />
              <span className="ph-text">Supabase connected</span>
              <button className="icon-btn" title="Refresh data" onClick={() => { playClick(); refreshData() }} disabled={loading}>
                <Icon name="refresh" size={17} />
              </button>
              <button
                className="icon-btn"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={() => { playClick(); setTheme(theme === 'light' ? 'dark' : 'light') }}
              >
                <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
              </button>
              <div className="bell-wrap">
                <button className="icon-btn" title="Needs attention" onClick={() => setNotifsOpen((open) => !open)}>
                  <Icon name="bell" size={17} />
                  {alerts.length > 0 && <span className="bell-badge">{alerts.length}</span>}
                </button>
                {notifsOpen && (
                  <div className="dropdown">
                    <h4>NEEDS ATTENTION</h4>
                    {alerts.length ? (
                      alerts.map((alert) => (
                        <button
                          key={alert.title}
                          onClick={() => { setNotifsOpen(false); setPage(alert.page); setSearch('') }}
                        >
                          <Icon name={alert.icon} size={15} />
                          <span>{alert.title}</span>
                        </button>
                      ))
                    ) : (
                      <p className="empty-note">All clear — nothing needs attention right now.</p>
                    )}
                  </div>
                )}
              </div>
              <span className="avatar" title={profile?.full_name || user.email}>
                {(profile?.full_name || user.email || 'A')
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
            </div>
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

          {page === 'sales' ? (
            <ReportsPage mode="sales" reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} reportData={reportData} records={records} onExportCsv={exportReportCsv} onOpenPage={(next) => { setPage(next); setSearch('') }} />
          ) : page === 'reports' ? (
            <ReportsPage mode="reports" reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} reportData={reportData} records={records} onExportCsv={exportReportCsv} onOpenPage={(next) => { setPage(next); setSearch('') }} />
          ) : page === 'overview' ? (
            <>
              <section className="hero">
                <div>
                  <p className="eyebrow">
                    {new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}
                    {' · '}{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <h1>Welcome back, <em>{profile?.full_name || 'Owner'}</em></h1>
                  <p className="sub">
                    {workspace?.name} · {counts.orders} order{counts.orders === 1 ? '' : 's'} on record,{' '}
                    {money(reportData.outstanding)} open to collect
                    {alerts.length ? `, and ${alerts.length} item${alerts.length === 1 ? '' : 's'} need your attention` : ' — nothing urgent on your desk'}.
                  </p>
                  <div className="hero-actions">
                    <button className="primary-btn" onClick={() => quickAdd('orders')}><Icon name="plus" size={16} /> New order</button>
                    <button className="secondary-btn" onClick={() => quickAdd('customers')}><Icon name="customers" size={16} /> New customer</button>
                    <button className="secondary-btn" onClick={() => { playClick(); refreshData() }}><Icon name="refresh" size={16} /> Refresh</button>
                  </div>
                </div>
                <figure className="hero-media">
                  <img src="/images/hero-shop.jpg" alt="Eyewear frames on display" />
                  <figcaption className="tag">{workspace?.name || 'Workspace'} · Live Supabase data</figcaption>
                </figure>
              </section>

              {loading ? (
                <div className="panel"><Loader label="Loading workspace records…" /></div>
              ) : (
                <>
                  <div className="metric-grid">
                    {[
                      { label: 'Customers', value: counts.customers, note: 'Saved in this workspace', icon: 'customers', to: 'customers', accent: 'var(--primary)', soft: 'var(--primary-soft)' },
                      { label: 'Open leads', value: (records.leads || []).filter((x) => !['converted', 'lost'].includes(x.status)).length, note: 'Enquiries not yet converted', icon: 'leads', to: 'leads', accent: 'var(--blue)', soft: 'var(--blue-soft)' },
                      { label: 'Orders', value: counts.orders, note: `${money(reportData.sales)} order value`, icon: 'orders', to: 'orders', accent: 'var(--green)', soft: 'var(--green-soft)' },
                      { label: 'Tasks to do', value: (records.tasks || []).filter((x) => x.status !== 'completed').length, note: 'Follow-ups still open', icon: 'tasks', to: 'tasks', accent: 'var(--amber)', soft: 'var(--amber-soft)' },
                    ].map((card) => (
                      <button
                        className="metric-card"
                        key={card.label}
                        style={{ '--accent-color': card.accent, '--accent-soft': card.soft }}
                        onClick={() => { playClick(); setPage(card.to); setSearch('') }}
                      >
                        <span>{card.label}</span>
                        <span className="metric-icon"><Icon name={card.icon} size={18} /></span>
                        <strong>{card.value}</strong>
                        <small>{card.note}</small>
                      </button>
                    ))}
                  </div>

                  <section className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Quick actions</h2>
                        <p className="muted">Jump straight into the workflow you need.</p>
                      </div>
                      <span className="chip"><Icon name="command" size={13} /> Ctrl / ⌘ + K</span>
                    </div>
                    <div className="quick-actions">
                      {[
                        { to: 'orders', icon: 'orders', label: 'New order', sub: 'Frame, lens & bill' },
                        { to: 'customers', icon: 'customers', label: 'Add customer', sub: 'Save contact details' },
                        { to: 'payments', icon: 'payments', label: 'Record payment', sub: 'Cash, UPI or card' },
                        { to: 'prescriptions', icon: 'prescriptions', label: 'Add prescription', sub: 'SPH, CYL, axis, PD' },
                        { to: 'inventory', icon: 'inventory', label: 'Stock entry', sub: 'Frames & lenses' },
                        { to: 'tasks', icon: 'tasks', label: 'New task', sub: 'Follow-up or reminder' },
                      ].map((action) => (
                        <button className="quick-action" key={action.to} onClick={() => quickAdd(action.to)}>
                          <span className="qa-icon"><Icon name={action.icon} size={17} /></span>
                          <span>{action.label}<small>{action.sub}</small></span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="overview-grid">
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Sales trend</h2>
                          <p className="muted">Order value per day · last 14 days</p>
                        </div>
                        <button className="text-btn" onClick={() => { playClick(); setPage('reports') }}>Full report →</button>
                      </div>
                      <SalesChart data={salesSeries} />
                    </section>

                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Needs attention</h2>
                          <p className="muted">Stock, tasks and pickups to chase</p>
                        </div>
                        <span className="chip gold">{alerts.length} open</span>
                      </div>
                      {alerts.length ? (
                        <div className="attention-list">
                          {alerts.map((alert) => (
                            <button
                              className={`attention-item tone-${alert.tone}`}
                              key={alert.title}
                              onClick={() => { playClick(); setPage(alert.page); setSearch('') }}
                            >
                              <span className="ai-icon"><Icon name={alert.icon} size={16} /></span>
                              <span><strong>{alert.title}</strong><span>{alert.sub}</span></span>
                              <span className="go"><Icon name="arrow" size={15} /></span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="Everything is up to date"
                          text="No low stock, overdue tasks or pending payments right now."
                        />
                      )}
                    </section>
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
                <div className="page-actions">
                  <button className="secondary-btn compact" onClick={() => { playClick(); setPaletteOpen(true) }}>
                    <Icon name="command" size={15} /> Jump to…
                  </button>
                  <button className="primary-btn compact" onClick={startAdd}>
                    <Icon name="plus" size={16} />
                    Add {{ prescriptions: 'prescription', inventory: 'item', leads: 'lead', tasks: 'task', customers: 'customer', orders: 'order', payments: 'payment' }[page] || 'record'}
                  </button>
                </div>
              </div>

              <div className="toolbar">
                <div className="search-wrap">
                  <Icon name="search" size={16} />
                  <input
                    className="search-input"
                    placeholder={`Search ${CONFIG[page]?.title.toLowerCase()}…`}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setTablePage(1) }}
                  />
                </div>
                <span className="muted">{filteredRecords.length} record(s)</span>
                <button className="secondary-btn compact" onClick={() => { playClick(); exportModuleCsv() }}>
                  <Icon name="download" size={15} /> Export CSV
                </button>
              </div>

              {showForm && (
                <form className="panel record-form" onSubmit={saveRecord}>
                  <h2>{editingId ? 'Edit record' : `Add ${{ prescriptions: 'prescription', inventory: 'inventory item', leads: 'lead', tasks: 'task', customers: 'customer', orders: 'order', payments: 'payment' }[page] || 'record'}`}</h2>
                  <div className="form-grid">
                    {CONFIG[page].fields.map((field) => (
                      <label className="form-field" key={field.name}>
                        <span>{field.label}{field.required ? ' *' : ''}</span>
                        {field.type === 'customer' ? (
                          <select
                            value={form[field.name] ?? ''}
                            onChange={(e) => setForm({ ...form, [field.name]: e.target.value, ...(page === 'orders' && field.name === 'customer_id' ? { prescription_id: '' } : {}) })}
                            required={field.required}
                          >
                            <option value="">Select customer…</option>
                            {(records.customers || []).map((customer) => (
                              <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>
                            ))}
                          </select>
                        ) : field.type === 'order' ? (
                          <select value={form[field.name] ?? ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}>
                            <option value="">No order linked</option>
                            {(records.orders || []).map((order) => {
                              const customer = (records.customers || []).find((item) => String(item.id) === String(order.customer_id))
                              const balance = Math.max(0, Number(order.remaining_balance ?? (Number(order.amount || 0) - Number(order.advance_paid || 0))))
                              return <option key={order.id} value={order.id}>#{String(order.id).slice(0, 8)} · {customer?.name || 'Customer'} · Balance ₹{balance.toLocaleString('en-IN')}</option>
                            })}
                          </select>
                        ) : field.type === 'prescription' ? (
                          <select value={form[field.name] ?? ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} required={field.required}>
                            <option value="">Select prescription…</option>
                            {(records.prescriptions || []).filter((p) => String(p.customer_id) === String(form.customer_id)).map((p) => (
                              <option key={p.id} value={p.id}>{p.exam_date || 'Undated'} · R {p.right_sph ?? '—'}/{p.right_cyl ?? '—'} · L {p.left_sph ?? '—'}/{p.left_cyl ?? '—'} · PD {p.pd ?? '—'}</option>
                            ))}
                          </select>
                        ) : field.type === 'inventory_frame' || field.type === 'inventory_lens' ? (
                          <select value={form[field.name] ?? ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}>
                            <option value="">No {field.type === 'inventory_frame' ? 'frame' : 'lens'} selected</option>
                            {(records.inventory || []).filter((item) => Number(item.quantity || 0) > 0 && (field.type === 'inventory_frame' ? ['frame','sunglasses'].includes(String(item.item_type).toLowerCase()) : ['lens','contact_lens'].includes(String(item.item_type).toLowerCase()))).map((item) => (
                              <option key={item.id} value={item.id}>{item.item_name} · Stock {item.quantity} · ₹{Number(item.selling_price || 0).toLocaleString('en-IN')}</option>
                            ))}
                          </select>
                        ) : field.type === 'calculated' ? (
                          <input value={`₹${Math.max(0, Number(form.amount || 0) - Number(form.advance_paid || 0)).toLocaleString('en-IN')}`} readOnly />
                        ) : field.type === 'textarea' ? (
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
                            min={field.type === 'number' ? (field.min ?? undefined) : undefined}
                            step={field.step || undefined}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="form-actions">
                    <button type="button" className="secondary-btn" onClick={() => { playClick(); setShowForm(false) }}>Cancel</button>
                    <button className="primary-btn" disabled={saving} onClick={playClick}>
                      {saving ? 'Saving…' : 'Save to Supabase'}
                    </button>
                  </div>
                </form>
              )}

              <section className="panel table-panel">
                {loading ? (
                  <Loader label={`Loading ${CONFIG[page]?.title.toLowerCase()}…`} />
                ) : (
                  <>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {CONFIG[page]?.columns.map(([key, label]) => (
                            <th
                              key={key}
                              className="sortable"
                              onClick={() => toggleSort(key)}
                              aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                            >
                              {label}
                              <span className="sort-ind">{sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                            </th>
                          ))}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRecords.map((record) => (
                          <tr key={record.id}>
                            {CONFIG[page]?.columns.map(([key]) => (
                              <td key={key}>
                                {page === 'prescriptions' && key === 'customer_id'
                                  ? (records.customers || []).find((customer) => String(customer.id) === String(record.customer_id))?.name || formatValue(record.customer_id)
                                  : page === 'orders' && key === 'customer_id'
                                    ? (records.customers || []).find((customer) => String(customer.id) === String(record.customer_id))?.name || formatValue(record.customer_id)
                                    : page === 'orders' && key === 'remaining_balance'
                                      ? `₹${Number(record.remaining_balance ?? Math.max(0, Number(record.amount || 0) - Number(record.advance_paid || 0))).toLocaleString('en-IN')}`
                                      : page === 'inventory' && ['cost_price', 'selling_price'].includes(key) && record[key] != null
                                    ? `₹${Number(record[key]).toLocaleString('en-IN')}`
                                    : page === 'inventory' && key === 'quantity' && Number(record.quantity || 0) <= Number(record.reorder_level || 0)
                                      ? <span className="status-pill tone-bad">Low: {formatValue(record.quantity)}</span>
                                      : (page === 'orders' && ['amount', 'advance_paid'].includes(key)) || (page === 'payments' && key === 'amount')
                                        ? money(record[key])
                                        : key === 'status'
                                        ? <StatusPill status={record.status} />
                                        : formatValue(record[key])}
                              </td>
                            ))}
                            <td>
                              <div className="row-actions">
                                {page === 'orders' && <button className="secondary-btn tiny" onClick={() => { playClick(); openInvoice(record, records, 'preview', setError) }}>Invoice</button>}
                                {page === 'payments' && String(record.status).toLowerCase() === 'paid' && <button className="secondary-btn tiny" onClick={() => { playClick(); openPaymentReceipt(record, records, 'preview', setError) }}>Receipt</button>}
                                <button className="secondary-btn tiny" onClick={() => startEdit(record)}>Edit</button>
                                {['customers', 'leads'].includes(page) && record.phone && (
                                  <button
                                    className="secondary-btn tiny wa-btn"
                                    title="Chat on WhatsApp"
                                    onClick={() => { playClick(); openWhatsApp(record.phone, `Namaste ${record.name || record.customer_name || 'ji'}! ${workspace?.name || ''} se.`) }}
                                  >
                                    <Icon name="whatsapp" size={14} />
                                  </button>
                                )}
                                {page === 'orders' && (
                                  <button
                                    className="secondary-btn tiny wa-btn"
                                    title="Share order on WhatsApp"
                                    onClick={() => { playClick(); shareOrderWhatsApp(record) }}
                                  >
                                    <Icon name="whatsapp" size={14} />
                                  </button>
                                )}
                                <button
                                  className="secondary-btn tiny"
                                  title="Delete record"
                                  onClick={() => deleteRecord(record)}
                                >
                                  <Icon name="trash" size={13} />
                                </button>
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
                        {visibleRecords.length === 0 && (
                          <tr>
                            <td colSpan={CONFIG[page]?.columns.length + 1} className="empty-cell">
                              <EmptyState
                                title={search ? `No ${CONFIG[page]?.title.toLowerCase()} match “${search}”` : `No ${CONFIG[page]?.title.toLowerCase()} yet`}
                                text={search
                                  ? 'Try another name, phone number or order id — or clear the search.'
                                  : 'Click Add to create your first record. Everything is saved straight to Supabase.'}
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-footer">
                    <span>
                      {sortedRecords.length === 0
                        ? 'No records to show'
                        : `Showing ${(tablePage - 1) * 10 + 1}–${Math.min(tablePage * 10, sortedRecords.length)} of ${sortedRecords.length}`}
                    </span>
                    {totalPages > 1 && (
                      <div className="pager">
                        <button onClick={() => { playClick(); setTablePage((p) => Math.max(1, p - 1)) }} disabled={tablePage === 1} aria-label="Previous page">
                          <Icon name="chevronLeft" size={15} />
                        </button>
                        <div className="pages">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((n) => n === 1 || n === totalPages || Math.abs(n - tablePage) <= 1)
                            .map((n, index, shown) => (
                              <span key={n} className="pager-slot">
                                {index > 0 && shown[index - 1] !== n - 1 && <span className="muted">…</span>}
                                <button className={n === tablePage ? 'on' : ''} onClick={() => { playClick(); setTablePage(n) }}>{n}</button>
                              </span>
                            ))}
                        </div>
                        <button onClick={() => { playClick(); setTablePage((p) => Math.min(totalPages, p + 1)) }} disabled={tablePage === totalPages} aria-label="Next page">
                          <Icon name="chevronRight" size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  </>
                )}
              </section>
            </>
          )}
          <footer>Arion AI OS · {workspace?.name} · Workspace-scoped records</footer>
        </section>
      </main>

      <ToastStack toasts={toasts} />
      {paletteOpen && (
        <CommandPalette
          items={paletteItems}
          onClose={() => setPaletteOpen(false)}
          onSelect={(item) => item.run()}
        />
      )}
    </div>
  )
}

function RecordPreview({ rows, nameField, detailField, empty }) {
  if (!rows.length) {
    return <EmptyState title={empty} text="Create your first record and it shows up here instantly." />
  }
  return (
    <div className="preview-list">
      {rows.map((row) => (
        <div className="preview-row" key={row.id}>
          <div>
            <strong>{row[nameField] || 'Untitled'}</strong>
            <small>{row[detailField] ? <StatusPill status={row[detailField]} /> : 'No status'}</small>
          </div>
          {row.amount != null && <strong>{money(row.amount)}</strong>}
        </div>
      ))}
    </div>
  )
}

export default App