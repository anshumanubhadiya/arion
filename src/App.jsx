
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const MODULES = {
  overview: { label: 'Overview', icon: '◫' },
  customers: { label: 'Customers', icon: '♙' },
  leads: { label: 'Leads', icon: '◉' },
  orders: { label: 'Orders', icon: '▣' },
  payments: { label: 'Payments', icon: '₹' },
  tasks: { label: 'Tasks', icon: '✓' },
  prescriptions: { label: 'Eye Prescriptions', icon: '👓' },
  inventory: { label: 'Optical Inventory', icon: '▤' },
  sales: { label: 'Sales', icon: '↗' },
  reports: { label: 'Reports', icon: '▥' },
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
    playClick()
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
      await refreshData()
    } catch (err) {
      setError(readableError(err))
    } finally {
      setSaving(false)
    }
  }

  function openInvoice(order, action = 'print') {
    const customer = (records.customers || []).find((item) => String(item.id) === String(order.customer_id)) || {}
    const prescription = (records.prescriptions || []).find((item) => String(item.id) === String(order.prescription_id)) || {}
    const frame = (records.inventory || []).find((item) => String(item.id) === String(order.frame_inventory_id))
    const lens = (records.inventory || []).find((item) => String(item.id) === String(order.lens_inventory_id))
    const total = Number(order.amount || 0)
    const advance = Number(order.advance_paid || 0)
    const balance = Math.max(0, Number(order.remaining_balance ?? total - advance))
    const invoiceNo = `AR-${String(order.id).slice(0, 8).toUpperCase()}`
    const date = new Date().toLocaleDateString('en-IN')
    const safe = (value) => String(value ?? '—').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
    const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const detailRows = [
      [order.description || 'Optical order', '', 1, total],
      ...(frame ? [[`Frame: ${frame.item_name}${frame.brand ? ` · ${frame.brand}` : ''}`, 'Included in order total', Number(order.frame_quantity || 1), 0]] : []),
      ...(lens ? [[`Lens: ${lens.item_name}${lens.brand ? ` · ${lens.brand}` : ''}`, 'Included in order total', Number(order.lens_quantity || 1), 0]] : []),
    ]
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${safe(invoiceNo)}</title><style>
      *{box-sizing:border-box}body{font:14px/1.5 Arial,Helvetica,sans-serif;color:#182033;margin:0;background:#f3f5f9}.toolbar{display:flex;justify-content:center;gap:10px;padding:18px}.toolbar button{border:0;border-radius:8px;padding:11px 16px;font-weight:700;cursor:pointer;background:#635bdb;color:#fff}.toolbar .secondary{background:#e7e9f2;color:#182033}.sheet{width:min(850px,calc(100% - 32px));margin:0 auto 28px;background:#fff;padding:44px;border:1px solid #e2e6ef;box-shadow:0 8px 30px #18203312}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #635bdb;padding-bottom:24px}.brand{font-size:27px;font-weight:800;letter-spacing:-1px;color:#4038a8}.muted{color:#667085}.right{text-align:right}.label{font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#667085;font-weight:700}.title{font-size:28px;font-weight:800;margin:22px 0 4px}.details{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:26px 0}.details p{margin:4px 0}.details h3{margin:7px 0;font-size:14px}.table{width:100%;border-collapse:collapse;margin:20px 0}.table th{background:#f2f3fb;color:#525a70;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.7px}.table th,.table td{padding:13px 12px;border-bottom:1px solid #e6e9f0}.num{text-align:right;white-space:nowrap}.totals{width:min(340px,100%);margin-left:auto}.totals div{display:flex;justify-content:space-between;padding:8px 0}.totals .balance{border-top:2px solid #635bdb;font-size:18px;font-weight:800;color:#4038a8;padding-top:13px}.note{background:#f7f8fc;border-radius:8px;padding:13px;margin-top:24px}.foot{border-top:1px solid #e5e8ef;margin-top:32px;padding-top:16px;text-align:center;color:#667085;font-size:11px}@page{size:A4;margin:12mm}@media print{body{background:#fff}.toolbar{display:none}.sheet{width:100%;margin:0;border:0;box-shadow:none;padding:8px}.no-print{display:none}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Print invoice</button><button class="secondary" onclick="window.print()">Download PDF · Save as PDF</button></div><main class="sheet"><header class="head"><div><div style="display:inline-block;background:#000;padding:8px 12px;border-radius:8px;margin-bottom:10px"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABLAAAASwCAYAAADrIbPPAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAACAASURBVHic7N1/kNT1ffjxFyhFjcpSNVohcRXHCMpwFq35YXXxR4kay6oYopN6R+yYpJ2WM2mbtJOJZ8c/msQpEJtMw7TjkppWqxmOtqMtmHDEmaKpGY5OYozR3mm1TbQOe2rxB9XP948Ev4lB+Oyxe/uCezxmXjMZ+Xw+7/cuEPDpZz87JSKKAAAAAICkpnZ7AwAAAACwJwIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEAAACQmoAFAAAAQGoCFgAAAACpCVgAAAAApCZgAQAAAJCagAUAAABAagIWAAAAAKkJWAAAAACkJmABAAAAkJqABQAAAEBqAhYAAAAAqQlYAAAAAKQmYAEA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agIWAADQdaecckqsWbMmHnnkkXjxxRdj586d8eyzz8bmzZvjYx/7WLe3x09t2bIliqIoNSMjI93eLnAAObjbGwAAACa3q6++Or785S9HpVL5uX9+9NFHx7nnnhvnnntuXHXVVfHBD34wnnvuuS7tEoBuErCAtpk7d24cc8wx4z5/y5YtsXPnzjbuaO9mz54dJ5100rjPf/zxx+Ppp59u4454s2OOOSaWLVsW73nPe+LUU0+NX/mVX4lKpRLTp0+P1157LXbs2BHPPvtsjIyMxHe+8534+te/Hg899FC3t73PzjrrrDj00EPHde6OHTu68h7Mmzcvjj766HGf/+1vfztefvnlNu6IyeD000+PxYsXx2mnnRYnnHBCHHfccfG2t70tDj300JgyZUq8/PLLsWPHjvjRj34UTz75ZPzgBz+IDRs2xL/92791e+v81K//+q/HmjVr4vDDD9/jceeff3589atfjUsvvXSCdgZANoUxxrRj7r777mJf9Pb2Tvieb7/99n3a84oVK7r+vh+o8773va/4+te/XuzYsaOln5PXX3+9eOCBB4oPfehDXX8N+zIjIyPj/nX58ssvF7NmzZrwPT/yyCPj3nNRFMWcOXO6/r6b/WPOOuus4ktf+lLxH//xH+P+9fb0008Xt912W3H++ed3/fVM9rnvvvta+rmr1+td3/Nkni1btpT+uRoZGen6fo0xB854BhaQxpVXXjmh602bNi1+4zd+Y0LXZO9mzJgRf/3Xfx2bNm2KK664ouW7kKZMmRJnn312/N3f/V3cc889MXv27A7tNK/p06dHb2/vhK557rnnxrve9a4JXZPJ54ILLoiNGzfGgw8+GL/zO78TJ5544rivdfzxx0dfX1984xvfiAceeCCWLl3axp1S1syZM+Occ85p6ZzLL7+8Q7sBIDMBC0hj0aJFMXPmzAlbb9myZfv0kUfab968efGv//qv8ZGPfCSmTZu2z9e7+OKL4/77748zzzyzDbvbv1x22WUTut6HP/zhCV2PyWX27Nlx1113xcaNG+PCCy+MKVOmtPX6Z599dtx1111x3333xbx589p6bfZs3rx5MX369JbOOeGEEzq0GwAyE7CANA4//PD4rd/6rQlbz39tz2X+/PmxYcOGtv/LY7VajcHBwTj55JPbet3szjrrrJg7d+6Erff+979/wtZicvngBz8YDz30UCxdurTt4erNLrjggtiyZUv83u/9XkfX4f97/fXXWz6nKIoO7ASA7DzEHUilXq/HF7/4xY6vM2PGjFi0aFHH16Gco446Ku6+++6YNWtWR64/a9asuOOOO2LRokXxwgsvdGSNbA466KC49tpr44//+I87vtaSJUviHe94R8fXYfL57Gc/G5/5zGfackdmWUceeWSsXr06TjvttPjYxz424U0WUwAAIABJREFUYetmdO6557b0H5a+/OUvx9atW1ta4+GHH46XXnqppY+Lj46OtrQGAAcGAQtI5b3vfW/Mnj07nnrqqY6u8+EPfziOPPLIjq5BeV/60pfilFNO6egaCxcujC984QuT6l9IL7300gkJWMuWLev4Gkw+K1eujP7+/q6sPWXKlPjoRz8aRx999KS+W3fu3Lnx27/926WPv+eee1oOWGNjY7F58+bSd3EWRRF33XVXS2sAcGDwEUIglYl6+HS9Xu/4GpRz8cUXx1VXXTUha1177bVx+umnT8haGZx++ulx9tlnd3SNadOmxUUXXdTRNZh8brnllq7Fq5915ZVXiiUTYGBgIJ5//vlSx65bty7uueeeDu8IgIwELCCd3/zN3+zo9WfNmtXyNx7ROZ/85Cdj6tSJ+ePo0EMPnZA7krKYMmVKxx+ufvXVV8fRRx/d0TWYXH73d383PvGJT3R7G29YunRp3HLLLd3exgHtwQcfjN7e3nj22Wf3eNw//dM/RV9f38RsCoB0fIQQSGfhwoUxb968ePjhhzty/WuvvTYOOeSQjlyb1pxyyilRq9VaOmfr1q3xrW99K/7rv/4rpk+fHvPnz4/FixeX/kjoBRdcMI6d7r8uueSSjj6Q+sorr+zYtZl8Fi1aFJ///Oc7/rD2VvX398e///u/x1e/+tVub+WANTg4GA899FDccMMNUavVYvbs2TF9+vRoNpvx8MMPx+233x5/+7d/2+1tAtBFAhaQzkEHHRS9vb3xqU99qiPX7/QdXpS3bNmyOOigg0od+8orr8Qf/MEfxF/8xV/8wo/NmTMn7rjjjjjzzDP3ep1jjz02Lr744rj33ntb3u/+6KSTTorFixfHv/zLv7T92r4MgXaaNm1a3HrrrXHYYYeN6/ynnnoqNmzYEPfff38MDw/Hf/7nf8brr78es2bNigULFsQ555wTF110UcyZM6flax900EHxhS98Ib75zW92/BmNk9lTTz0Vn/zkJ7u9DQCS8hFCIKVLL720I9d917veVSpyMDF+7dd+rfSxN998827jVUTE448/HvV6PZ5++ulS1/rVX/3V0useCK6++uqOXPfaa6+NI444oiPXZvK5+eab47TTTmv5vGeffTb+8A//ME466aS47rrrotFoxPDwcDz33HOxffv2+O53vxtf+9rX4uMf/3icfPLJ8dGPfnRcEertb397/Pmf/3nL5wEA7SFgASnNmzcv3vOe97T9ur29vXHwwW4+zeLkk08uddzo6GjcfPPNezzm6aeffsvA9WbHHntsqeMOFIsXL+7IdX0ZAu3yzne+Mz7+8Y+3fN7WrVvjnHPOiVtuuSV27txZ6pw1a9bEu9/97ti8eXPL61155ZXuOgSALhGwgJQ69fDpTt3ZxfiUDUn33XdfqePuvPPOUsf98i//cqnjDhTHHXdcLFu2rK3XnD17drzvfe9r6zWZvP7kT/6k5bv5hoeHY/HixfHoo4+2vN7TTz8dl1xySQwNDbV03tSpU+PTn/50y+sBAPtOwALSuuSSS9p6vbPOOivmz5/f1muybw4//PBSx/3whz8sddyPf/zjKIpir8ft2LGj1PUOJFdddVVbr9fb2xvTp09v6zWZnI455pi45pprWjrnf/7nf+Kaa67Z67fW7cmOHTvimmuuiZGRkZbOu/DCCztyhzAAsGc+RwN0RVEUe/2WqWq12taHbV977bWlvtmqzN5accQRR8SFF15Y6tjnn38+vvGNb/zCP1+8eHFcc801sXDhwpg9e3Ycfvjh8eqrr8bzzz8f3//+9+PTn/50PPjgg23b80Qp+wD3qVPL/feWBQsWlPq5e+aZZ0pdb39Q9tfrBRdcEIcddljb4t1ll11W6rh2/346+eSTS4foJ598Mr7zne/8wj//yEc+EkuWLInTTz89jj322DjkkEPipZdeiueeey6Gh4fH/dHII444Is4///x473vfG2eccUbMmjUrjjzyyDjiiCPibW97W+zcuTP+93//N1588cV4/vnn47HHHovh4eF44IEH4v7774+XX355XOvu76677rqW7766+eab4/vf//4+r/3f//3f8Ud/9Efx93//96V/nU6dOjWuu+662LJlyz6v34rZs2fHwoUL4/jjj4/DDjssXnnllWg2m/HII4/Etm3bSn+EMqPVq1fH7//+75c+ft68eW35+d+lWq3GJZdcEu9+97tjzpw5cfzxx8fMmTPjkEMOiV/6pV+KV199NXbs2BHPPPNMPPXUU/Hd7343Nm3aFOvXr2/bHspYuHBhvP/974/58+fHnDlz4u1vf3vMnDkzpk+fHgcffHDs2LEjnn/++XjhhRfiqaeeeuP/XzZu3BhjY2MTuleATimMMaYdc/fddxdlfe973yt13Nq1a9u2v8cee6yteyuKolixYsVe112wYEHp6z322GM/d+78+fOLb37zm8Xrr7++x/OWLVvW9Z//8cwLL7xQ6n1Zs2ZNqet97nOfK3W9er3e9de+txkZGSn1Wl555ZXihz/8Yaljr7/++rbsbe7cucX//d//7XW9nTt3lt5bURTFnDlz9rr2pz71qdLXu/POO3/u3Msvv7x45JFH9rrnVt+PM888s1i7dm3RbDZL7+3Nnn322WLNmjXFwoULu/5rb6Ln29/+dkvv1fe+972272Hjxo0t7eHHP/5xMW3atL1e9/rrry8ee+yxUvOJT3xit7+2vvKVrxSPPvroHv8cePHFF4v777+/+OxnP1sce+yxLb/+f/zHf2zp9Y/Hbbfd9pbrr169uqVrzZ07ty0/79dff32xefPm4tVXXx3Xa3rmmWeKNWvWFPPnz+/Y74/Zs2cXn//854sf/OAH49pjURRFs9ksbr/99uKcc85py562bNlSeu2RkZGOvTfGmEk5Xd+AMeYAmVYC1he/+MVSx/3oRz8q9S8Je5uLLrqo1HrNZrP42te+Vvp1tDtgPfPMM2+cd8UVVxTbt28vdd7SpUu7/vM/nnn88cdLvb43h73dzVFHHVU8+eSTe73W9u3bi8MOO6zrr31vUzZgFUVR3HrrraWOu/fee9uytz/7sz8rtd63vvWtloJwuwPWP//zP79x3p/+6Z8WO3fu3Os5L7/8cun34Z3vfGfxD//wD6ViXlmvvfZacc899xSnnHJK138NTsRUq9WW37/+/v627+MDH/hAyz9XZUJ4K79ev/KVr7xx3oknnljcfffdpX7NvtkLL7xQ3HrrrcVRRx1V+vVPtoC1dOnSlv6/aW9eeuml4q/+6q9aes/3NjNnzixuvfXW0v+hp4zXX3+92LBhQzFv3rx92puAZYzp1ngGFtAVjz76aDz55JN7Pe7YY4+NpUuX7vN6ZZ+vsnHjxq4+12fXx2g+8IEPxN/8zd9EpVIpdd5rr73WyW11TNmHL8+ZMyeuuOKKPR6zZs2aeMc73rHXa23YsOGAewbWunXrSj3767zzzmvLNzCW/TKEdevWxWGHHbbP643XjBkzIiLixhtvjM985jOlvoG0zPsYEbFs2bJ44IEH4rLLLiv9Udgypk6dGhdffPH/Y+/+472e7//x39uUo6RPEgv5Mc1vKgz5Nczv6Yc0bKH8zBbDNsKYtmHMMIlhrKJEfhSR3+V3UiNkKT9KKqq1OiqVyuv7x755+9E55/k857zO61Gu18vlebnodR6/Xq/zOsd53l6PH/Hyyy/HOeecU2vtpqpTp065Xr/y8vLo169frY/j4YcfjnfffTdXnUMOOaRWx7DhhhtGRESXLl1izJgxcfTRR1fr1Nx11103zjzzzBg3blytj3F1V1ZWFv369Yt77rkntt9++1pt95RTTol//etftfKaH3bYYfHqq6/GmWeemXmvyCzq1asXBx98cIwePTp+97vf1Vq7AHVFgAWURKNGjWLEiBGZytZGgHXooYdmKjd48OBYZ511atxfdZWVlcX2228ft912W64b/9U1wHr++eczl7344otX+Xj9+vXjnnvuqTLgiohYvnx5XHvttZn7XF3MnTs3Xn311SrLrbPOOnHCCSfUqK8999wzdthhhyrLLVy4MO64444oKyurUX81sd5660Xnzp3j4osvzry/0eeff15lmV69esWgQYOiRYsWNR1ihZo2bRrXXXddUcKalOy33365yo8ePbpoe/mMHDkyV/na3si9efPmcdppp8XAgQOjefPmNW5viy22iGHDhhXlRN/VUbNmzeKxxx6L7t27Z95XMa/NN988hg4dGqecckq12+jZs2cMGzYstthii9ob2Nest956cdlll8Xdd98d9evXL1o/ALVNgAWURMOGDWPAgAGZZjv8+Mc/zr3B75cdc8wxmW40p0+fHg888EBJA6yIiFtuuSX3LJksN90pGjx4cOaNq9u2bRtnn332Vx7bc88946WXXopjjjkmUxv33HPParnZfVXWW2+9GDZsWKayHTt2rFFfxx9/fKYwaOTIkTF37tySBlhNmzaNa665Jtcslqp+lnr27BlXXHFFrc66qkz37t3jn//8Z530VQrbbbddrvJ5Qu+8nnzyyVzlt95661q9+d9+++3jhhtuqNVZwOuss07cdtttcdRRR9Vam6ujsrKyuP/+++NHP/pR0ftq2LBh3HjjjXHiiSfmrnv22WdHnz596mwm+LHHHhu33357nfQFUBsEWEBJNGrUKF5++eV48803qyzbpEmT6Nq1a7X7+ulPf5qp3COPPBIRUfIAa5999sldZ/ny5UUYSfFNmTIlHnvssczle/fuHdtvv33Ur18//vznP8fIkSNjt912y1T3gw8+iHPPPbe6Q01akyZNon///rF06dIqy+6xxx6x1VZbVbuvI444IlO5e+65JyKipAFWixYtcs9iqCzA2nfffePqq68u2uyNipx00klx3nnn1WmfdaGsrCy23HLLXHVeeumlIo0m4umnn871u7Rhw4ax55571lr/K0+Tq21rr7123HrrrbW6ZG51c8stt9RJeLXS2muvHX379s01S++oo44qye+XE044Ic4666w67ROgugRYQEmsXB43fPjwTOWr++lxw4YN48c//nGV5QqFQtx5550RUfoAqzpW1xlYERFXXnll5pvG//f//l/0798/Xnnllbjgggsyf68WLFgQJ510UsyZM6cmQ03WuuuuG9OnT880O6V+/frVmhkQ8b+luFkCh1mzZsW9994b9evXL+mectVR2azQPn36lOz3w+9///vYZpttStJ3sey555653h9LliyJF198sWjjmTdvXkydOjVXnbZt2xZnMLVsgw02iOuvv77UwyiJbt261XjpdHU0btw4br755kxlmzdvHn379i3Zcr5LL720VpatAhSbAAsoiZUBVr9+/WLZsmVVlt93332rtd9M165do2nTplWWe+utt764MSrljJHqWl1nYEVEjBkzJu67777M5X/4wx9GmzZtMpdfvHhx9OjRI0aNGlWd4a0WVm7ye//992cq3759+2r1k/UwhEcffTSWLVsWG264Yea9p1JRURh8+umn53rfRURMmjQp+vTpE6effnocffTRccIJJ8SFF14YDzzwQO6DBNZdd9249NJLc9VJXd7ZcTNnzsz0/4uamDFjRq7ym2yySZFGUvsOOuig6N69e6mHUaeaNWsWV1xxRcl+D+28885xwQUXVFmud+/esfHGG+du//33348nnngi7r333njooYfi5ZdfrtYhJc2aNVsjZ3kCa578R5sA1IKVsxjee++9GD16dJUb+a7cfPovf/lLrn6yztx66KGHvjG21cnqHGBFRFx44YVx6KGHZgob81iwYEGcfPLJuQKy1VGjRo0iIuKOO+6IP//5z1WeXtmmTZto27ZtvPbaa7n6yXq61sCBAyMiav37WRcqOhChW7dumdtYvnx59O7dOy6//PIKy2y11VYxcODAXEvQ2rdvH82bN19jZhLmDX9mzZpVpJH8n5kzZ+Yq/73vfa9IIymO888/P/r37/+Nx++7777497///Y3HW7VqlemAjJUGDRpUYQg4bty4zO3UluoEQ4VCIcaOHRuvvvpqfPzxx7FgwYJo1qxZ7LzzzrHvvvt+cbppVj169IhrrrmmwvC1adOm8bOf/SxXm2PGjIkLL7xwlR/MNGvWLC6++OI488wzc+3/d9RRR8X555+faxwApVBwuVyu2rjuu+++QlYPPfTQF/XOOeecTHVeeOGFXONp3rx5YdGiRVW2u2zZskKrVq2+qDd79uzMz+Pss8+uchytW7fO3F517bPPPiX//tf0Ou+882r1NZkyZUphv/32K/nzqu41ZcqUzM/1oosu+qLekCFDMtW59tprc43nuOOOy9Tu22+//UWdffbZJ/NzKBQKha222qrKcfTq1StXm3nNnj37G31utNFGhaVLl2Zu4/e//32m17Rp06aFt99+O9f4evToUfL3Zm1dN9xwQ67n/sgjjxR9TH379s01pkcffbRo79dp06YV+vTpUzjqqKMKW221VaFx48aFNm3aFI455pjCwIEDC/PmzatWu127ds38evTo0SNX20cddVS1Xvfrr78+Vz/bbbddlW22aNGiUF5enqvd1157rfDDH/6wwjY32WSTwsCBA3O1WShU/pqfccYZudoaPXp0oaysrMrnf+aZZ+Ye55577pnp+zV69OjMbU6ZMqXkv2tcLteac5mBBZTEl2c5DRgwIP74xz9WedLgHnvsEa1atYp33303Ux8nnnjiF0sVKzN69OivtJnaEsKFCxfG2LFj480334wPPvggPvnkk2jQoEGsv/76sf7660fTpk1j9uzZpR5mjV199dVx5JFHVjkbL4vHHnssTj311NzLgVZXX36fDx48ONPBBUcccUT8+te/ztxHly5dMpX78r52NTk9tFhmzZoVY8aMibfffjumT58en376aTRq1CiaNWsW66+//irr7LffftGgQYNM7X/88cfxxz/+MVPZefPmxeWXXx533HFH5vHvvvvuccstt2Qun7K8s10/+eSTIo3k/5SXl+cqX4wZuytWrIi//e1vceGFF35j1s748eNj/PjxMWTIkNh6663jzjvvjN133z1X+926dYtBgwbV5pCTdM4558R6662XufyLL74YP/nJTyp9D8yYMSOOP/74+M9//vONU3Er06lTpwpf87wHt/Tq1SvT6b19+/aNDh06xMEHH5y57QMPPDBefvnlXOMBqEsCLKAkvvxH/7x582LkyJHRsWPHSuustdZa0a1bt7jkkksy9VFVeysNHTr0K/9OJcBatGhR3HTTTXHNNdfUydKZFJx++unx4osvRrNmzapVf9GiRXHZZZfFlVdeWcsjS9uXA6yhQ4fGhx9+GC1btqy0zjbbbBP7779/PPPMM1W237hx40yHIaxYsSIGDBjwlXqpmDFjRvz5z3+OW2+9Nfc+Snn2anr77bdztX333XfHDTfckHlZUt59o1KW93ftZ599VqSR/J8sJ3l+WW0fUlAoFOL888+Pa6+9tsqykydPjgMOOCDGjBkTO+64Y+Y+9t133zVqKWpF8hz+smTJkjjnnHMyB5jnnHNO7LHHHpmXAO+6664Vfi3PqbDTpk2L5557LnP5f/7zn7kCrK233jpzWYBSsIk7UBJf/9R6yJAhmeodeeSRmcptueWWmf6wXLhw4VdmPzRs2LBkpwB92axZs+KII46I888//1sTXkX8730xd+7catV9880346CDDvrWhVcR8Y2ZhiNGjMhUL+um7D//+c+r3Fcr4n973EyYMOGLf6/cXL7Uxo4dG3vssUfceOON1doEPMtMzpXyhjLLli2LadOmxeeff57pWrnf2Zog66y2leoiwMrbR20HWA888ECm8GqlTz/9NE4//fRcwVtZWVkcc8wx1RneauOAAw6IH/zgB5nLP/LII7n36Mrz/5otttgiNtpoo1V+rUGDBrFkyZJM17Rp03KN8ZFHHsn13qjORvIAdUmABZTE1wOse++9Nz7++OMq67Vu3brSTzJX6t69e6YgauTIkV8JTCr6A7MuLVu2LLp3757rU9Y1Qffu3WPUqFHV/gR43Lhx39qlD18PWAYMGBCFQqHKeocffnim9rNu4jxs2LCv/DuFAOvDDz+Mzp0712g56eLFizOXbdu2bbRu3TpX+zvvvHN897vfzXTl2fQ9dd/5Tnp/hmb5ufmy2n4Od955Z+46o0ePjscffzxXnb322it3P6uTI444Ilf5r8/EzuLBBx/MHCjVq1evwlNMd91111hnnXUyXfvuu2+uMS5YsCDXh0JrUkAOrJksIQRK4usB1rJly+LRRx+Nk046qdJ69erVixNPPDH+9a9/VVquffv2mcbx9ZlfWWaZFNuwYcPiscceK/Uw6tRVV10Vv/3tb2t0M3jSSSfFe++9V+nJb1922mmnZbqJu/322+OFF16o9rjqwtcDrNGjR8eECRNip512qrTepptuGkcddVSlN28bbbRRppumxYsXf2X5YEQaN0PXXnttTJ8+vUZtfPDBB5nLrr322nHXXXdF586dY9KkSTXql2+fzz//vFr1brrppujQoUPm8nlD1tVNnqD3008/jfvvv79a/bzxxhux2WabZSq76aabVquPmlq0aFHmsrU9oxCgtgmwgJJY1TKbgQMHVhlgRfzvk9XKNk9t06ZNhZ90ftmsWbO+EWDlPR67GD788MNSD6HO1K9fPwYPHhxHH310rbR36aWXxpQpU+Kuu+6qsuyhhx6aqd8nn3yyNoZWVKvaSHr48OFVBlgREcccc0ylAVa3bt0ybVT9zDPPxEcfffSVx/IsvSuW9957r8ZtvPDCC7F8+fLMR9Jvv/32MWbMmOjfv3/8/e9/F2RVIO9spxRVN3CqbY8//nh89NFH0aJFi0zlt9xyyyKPqLS22WabzGUnT56caVP0VZkxY0bmusXY8D+LPD9n9erVK+JIAGouvbnbwLfCqgKskSNHZrrRa9WqVaUbSp944omZ/gh79NFHv7EfTkqbTq/pGjZsGA8//HCthVcR/wvEbrrppkynOmWdHZRn+ViprOrGqF+/frF8+fIq6x588MGV7tuUdVbHqmYwpBBg1YYZM2ZUOevz65o0aRJnn312TJgwIcaOHRvXXXdddOnSJYmQPBV595vKu2dWdeTdAzHvpu/FlGcJdcOGDTN90LM62nLLLaN58+aZy+c9eOHLzjjjjMzL//r27VvtfgD4HwEWUBIV3TAPHz48U/3KNp/OuvfFwIEDv/GYAKtulJWVxfDhw+OQQw6p9babNGkSd911V5UnO62//vqZ2lu4cGFtDKuoVhVgvfvuuzF69Ogq6zZr1iyOO+64VX6tVatWsccee1TZxty5c1d5RHwKSwhryz//+c9q1VtrrbVit912i3POOSfuvffemDVrVrz22mtx++23xymnnJLrRntNkzf8qYsAK+8SqrrYWD6rvDP9WrVqVaSRlNa2226bq3xNlxjXlW222SbOOOOMuPnmm+PRRx+N119/PaZNmxbz58+PJUuWxIoVK6JQKHzjcrIgsCYRYAElsfbaa6/yk+4BAwbEihUrqqx/2GGHrfLx/fbbL9PSgUmTJsXTTz/9jcdT2HT62+Duu++OAw88sGjtt2zZMoYMGVJpILnFFltkaivP/kelUlEgnHVj4opmwXXr1i3TsrnHH398lctoSrVkphhuvfXWeOmll2rcztprrx1t2rSJk08+OW677bb44IMPYtSoUXH++ednXv61pvj0009zla+LDxjy7oNY3aVnxTBx4sRc5VM4tKQYWrZsmat8TQ54KLY2bdpE3759Y+LEiTFx4sT4+9//Hj169IjDDjssdt5552jZsmU0adIk1l577SQPRQCobX7TASVRr1692GCDDb7x+IQJEzIdZb3xxhtHly5dvvH48ccfn6n/hx9+eJWPr0kzRlJ1+eWXR8eOHTOXX7hwYZx66qnx4IMP5upnl112WeUsu4iIzTbbLDbccMMq21i+fHlMnjw5V7+lUFFQ1L9//0wzyPbff/9o2rTpNx4/8sgjM/U/ePDgVT6+piwhXOnkk0+u9dka66yzTuy///5x1VVXxeTJk+Ouu+6Kvffeu1b7SNWcOXNyla+LQzZW9XNQmTwnvBXb1/egq0oKh5YUQ96gc/bs2UUaSfW1a9cuRowYEePGjYuePXvGtttua38qgBBgASVU0Y3CsGHDMtX/6U9/+o3HKpqZ9WUrVqyI/v37r/JrAqzi2n///eM3v/lN5vKLFi2Kn//853H77bfHCSecEGPHjs3VX4cOHeL6669f5eNZfPzxx7n6K5WKZmDNmzcvRo4cWWX9ddddN0488cSvPNa2bdtMJ5VNmTKlwkB4TQuwJk2aFB06dIh33nmnKO2vu+668bOf/Syef/75GD58eLRt27Yo/aRi5syZucp/73vfK9JI/k/eWXAp/Y6YP39+rvJr6olzle3ptyqp7XN4zTXXxKhRo+Lwww+P7373u6UeDkBSBFhAyVQUYPXr1y/TH5Rf33y6U6dOmZYOjBs3LiZMmLDKrwmwiqtXr16Zb5oKhUKce+65X+yLtmDBgjj22GNj6tSpufo866yzvnFq5cEHH5ypbt6+SqWypXpfP2mzIp06dfrKv7t165bpE/9HHnmkWuNaXb322mux9957xx133JFpk/zqqFevXhx55JExevTouOGGG3LfkK8u8i7P3XjjjXNvsp7XJptskqt83hCumD755JNc5dfUACtv6JNKgNW0adN46qmn4te//vUa+70BqCkBFlAyFU3znzVrVjz77LNV1m/atGl07dr1i38fe+yxmfqtbCnamjZjJCWtW7eOgw46KHP5ESNGxD/+8Y+vPDZlypT4+c9/nmumQb169eLKK6/8Ytli48aNM51SGPG/jdBXB5UFHEOGDIlZs2ZV2Ua7du1is802++LfWQ5DKBQKMWDAgAq/viaRc0oFAAAgAElEQVQGWBH/W/rWrVu3aN++fe5ZgXmsvfbaceaZZ8aTTz4ZzZo1K1o/pTJmzJhcIeA666wT7dq1K9p4GjZsmHlvvJXefPPN4gymGvLu4fj5558XaSSllWUfzdSUlZXF0KFDKz1hGQABFlBCle1Tcd9992Vqo3PnzhHxvz/+soQjixcvrnD5YMSae8Odgk6dOmXaEHylio4cHz16dPTo0SPX6V9lZWVx++23x6677ho9e/bMfALhmDFjMvdRSpUFWMuWLYtHH320yjbWXnvtL5YRHnDAAfGDH/ygyjrjx4+vdM+6NXXm0EqPPfZY7L777tGpU6cYNWpU0WZk7bPPPnH33XcXpe1SKi8vzz0Lq5j7g+2///65Zr589tln8fzzzxdtPHnl3fsp7ymQq4u8G+uncHjLddddFz/60Y+qVXf58uUxderUePPNN2PMmDHx8ssvf+VatGhRLY8WoHQEWEDJVLZcb9CgQZk2x/3Rj34UzZo1i2OPPXaVm8J/3bPPPlvpRreWEBbPHnvskbnsnDlz4rHHHqvw60OGDImLL744CoVC5jabNWsWd999d5x00kmZyhcKhXj88cczt19KDRo0qHT2YEWb2X/dyr3BvjyzsTJVbaz/bQmEH3zwwTjwwANjhx12iCuuuCJef/31Wg+zDjrooOjVq1ettpmCt99+O1f5fffdt0gjiTjkkENylX///fdzn6RYTKvzCYq1acGCBbnKlzrA2m+//eLUU0/NVWfZsmXx4IMPfvG3z5Zbbhk777xz7LnnntGuXbuvXCmfsgiQlwALKJnK/mhcsmRJPPHEE1W20ahRozjxxBPj6KOPztRnVTO7vi033KWQZ2nOpEmTqixz9dVXx80335xrDK1atYqtt946U9k333wzpkyZkqv9UqoswH366acznaa4yy67xI477pjpMISlS5dWunww4tv38zR58uT43e9+F23atIktt9wyfvGLX8SgQYNi0qRJtbKs6Ve/+lXR94Cqay+++GKu8nvttVc0adKkKGM54IADcpV/5ZVXijKO6mrVqlWu8v/5z3+KNJLS+vDDD3OV//LS6VK44IILcs1OnjFjRnTo0CE6deoUQ4YMifLy8iKODiAtAiygZKqa7XTXXXdlaqdLly6Zbjzmzp0bgwYNqrTMt+2Guy7luenMemP1y1/+MtPyuOpYXWZfrVTRoQgrrdwMvzLf/e534+qrr860kfWLL75Y5Sb3a/oSwspMnz49br755jj++ONj2223jS222CJ+8YtfxAMPPFDt4GDjjTeO4447rpZHWlrDhg3LNZOySZMm0b1791ofx9577x077bRTrjpPP/10rY+jJjbffPNc5VPagL42TZw4MVf5UgZYm222WRx44IGZy5eXl0eXLl0qnaEMsCYTYAEl06BBg0q//vDDD2c6BW6vvfbKtATgiSeeqHLJxJo2uyElecLBPPvQ/OxnP4vXX3+9OkOq0PLly+OOO+6o1TaLrarXt3///pk2bc4y+yoi4oEHHqiyjJ+n/7My0Dr66KOjZcuW0bNnz0wzDb8uz0EIq4OJEyfGW2+9latO3uVWWZxzzjmZTt1cacGCBVUuoa1rO+ywQ+ayhUIh3njjjSKOpnSmTp0ac+bMyVx+u+22K+JoKtepU6dc/7+78cYb4+WXXy7iiADSJsACSibLzcLDDz9ca/1lmdGV5waGfPJsuv69730vc9ny8vI45phjYvr06dUZ1io9/fTTMWHChFprry5U9d6dMGFCpRuu51FeXr7aBXwpWbJkSdx0002x0047ZZ5pulLWJbCrk6FDh+Yqv+OOO8aZZ55Za/3vvffeX+z/ltXjjz+e3NKttm3bZi47Z86cWv2dmZo84XCe4O/r/vSnP8W///3vTNcJJ5zwjfp5vmefffZZ3HTTTdUeK8CaIPuCa4ASGDBgQPTs2bPGwdLUqVNrNQwjv/Ly8thoo40yld1hhx1io402ilmzZmUqP3ny5OjatWsMHz481ltvvZoMMwqFQvTp06dGbaTqwQcfjN13373G7Tz11FO5N0peXd10002Z92/74x//mGt2xLJly6J79+6x4447xs4775ypTvPmzTO3v7q47bbb4rzzzsu15PSSSy6Jxx57LN59990a9V2/fv247rrrqpwR/HWpBbidO3fOtYl7dWb/rU7GjBkT++yzT6ayTZo0ic6dO2eaVfp1bdq0yTyDa1UzUvMsX5w2bZoN2YFvPQEWkLRx48bF+PHjc31KuSrfpvCqrKwsDjrooNh8883jO9/5TkybNi2efPLJkp+WNX369MyzRxo0aBDnnntuXHDBBZnbf+655+KXv/xl9O/fP9eGuF/3xBNPxIgRI6pdP2X9+vWLiy++uMZ7vd199921NKL07bLLLplP0BwxYkTu5T0rTxPLGmBV53u3zTbbRLt27aJp06ZRXl4er7zySlIzDKdNmxYPPPBA/PznP89cZ8MNN4xBgwbFIYccUqOZULfcckv88Ic/zFVn3LhxmfaUq47q/u46+eSTc5X/17/+Va1+qpJnOVwxPfLII/Gb3/wmc/kuXbpUK8DK8955//33v/FY48aNM9cv9f/DAVJgCSGQvIceeqhG9QuFQpWnpa0JGjZsGH369ImPPvoohg8fHn379o0+ffrEsGHD4uOPP46bb7451x/LtS3vPjenn356tGnTJledQYMGRe/evXPV+bJFixbFxRdfXO36qfvoo4/iueeeq1EbM2bMqPI0zzXJtGnTMpfde++9q9XHJ598krlsnqW4hx9+eIwZMyYmTpwY/fr1i2uvvTZuv/32eOONN+LVV1+Njh07Vme4RXH55ZdXuUfh1+2+++7x8MMPZzp0YFVuvfXWOOmkk3LXu+aaa6rVXxann3567jrt2rXLvTda1k3Aly1blqvdFi1a5CpfLKNGjYp33nknc/mOHTvm3sT/wgsvzDyreOnSpas8tfK73/1u5v423njjzGVXateuXbRs2TJ3PYBUCbCA5PXv3z/XTdvXjR8/vtb2/klV48aNY+TIkXHWWWetchlJ48aNo0ePHvHMM89UeVpdseQ9satp06YxePDg3Hv+vPrqqzF79uxcdVa6+uqr1/j3yv3331+j+mvq7LSKjB07NnPZww8/vFp7VP3gBz/IXDbrCYannnpqDB06NHbfffdvLMGuV69etG3bNoYMGRK//OUvc421WP79739X64OGffbZJ1588cXo2rVr5jp77rlnvPjii3Haaafl7u/5558v6gzEww47LP74xz9mLl9WVhY33XRTrplP06dPz3zK6n//+9/M7UZE5mV7dSHP3morPwBq2LBhpvKHH354XHTRRZnbHz9+/CpnUC1cuDBzGxtssEGuEzhbt24dgwcPdroysEYRYAHJmzp1arz44ovVrp/aSVHFcOONN2Za5rTLLruUbBPYBx98MPemwdtuu22MGjUqevToUWm5+vXrx4knnhhPPPFEPPLII7HhhhtWa4xZP01fnQ0aNCj3TemXpbb3T7Hde++9mWcGNWnSJPr3759rn6pNNtkk10yoLHsXtW7dOq677roqQ40GDRrEX//619h1110z919MvXr1ynTy7NdtvvnmMXDgwBg/fnz84Q9/iL333vsb+w1tt9128atf/Soef/zxeP7552OvvfbK3c+iRYvi7LPPzl0vr4svvjhuvfXWKmfMbrHFFjFy5MjcM1XzzGrOGpiu1L59+zjjjDNy1SmWPn365JrduP/++8ezzz5b6c9Dw4YN49JLL4377rsv0+nHK1UUGOaZ4RkRccUVV2T6fnfr1i2eeuqp2HzzzXO1D5A6e2ABq4UHHnggDjjggNz1li5dusYvH9x6663j2GOPzVy+S5cuX5ycVNcGDx4c5513Xq46G2+8cdx8881xwQUXxEsvvRTvv/9+zJ8/P9Zdd93YYIMNYocddoiddtopNthggxqP74wzzohp06bFlVdeWeO2UvXpp5/GE088Eccdd1zuum+99Va88MILRRhVuqZOnRojRoyIzp07Zyrfrl27eOmll6J3794xaNCgSsv+8Ic/jH/84x+5gtMnnniiyjLnnXde5pvrddZZJ84777xqvR9qW3l5eZx77rkxZMiQVW54XZXWrVtH69at4/e//30sXbo0FixYECtWrIhGjRrlChsqctVVV8Vrr71W43aqUq9evTjttNOiQ4cOMXTo0Bg1alSMHz8+Pvroo9h8883jBz/4QbRv3z46duwY66+/fq62ly1bFjfffHPm8lOnTo1CoZD5IJX69evH3//+9zj33HNjwoQJUV5eHg0aNIj11lsvmjdvHu3atcs13pqYMWNG3HnnndGzZ8/MdXbbbbd45ZVXYuzYsfHqq6/Gxx9/HJ988kk0bdo0dthhh9hnn31yf9CxcOHC+Mc//rHKr40bNy6OP/74zG21aNEiRo4cGX379o1+/frFlClTvvjaZpttFh06dIjjjjuu2suZq/NzB1DXCi6Xy1Ub13333VfI4/e//33mtps0aVKYP39+rvYLhULh6aefzvUcnn766Vztn3322VW22bp161xtXnPNNbnG/Nvf/jZX+4VCodCrV6+SvEeaN29emD17du7x1qXPPvus0LVr15L/PE2ZMiXXuNu1a5e57Q4dOlTrtbniiityPYf//ve/udrfaqutqmyzV69eudps3759jb8Xbdq0KSxevDhXv4VCofDee+8V+vfvX/jNb35TOOGEEwpdu3Yt/PKXvyxcffXVhWeffbawdOnSXO1NmzatUL9+/SrHO3Xq1Nztlvr9/uXrkksuyTX+unDfffdV67nkfb8WW3WeR97fRRVZvHhxhX1cf/31udrabrvtMo29WbNmhZkzZ9bK+KurT58+FY5vk002KXz66afVavfzzz8vzJ49uzBt2rTCf/7zn8Lnn39e47G+8847mV7X0aNHZ25zypQpJf+d4nK51pzLDCxgtVBeXh5PPfVUHH300bnqVedUodXNpptuWid1asOcOXPiD3/4Q/Tt27ck/WexcgbBzJkzY9SoUaUeTlE89NBDMXXq1Nhiiy0y11m+fHn079+/aGNK2fjx46NPnz5x/vnn56r3/e9/P77//e/X2jj69OmTaVPtvEtoU1s6+6c//Sm22mqr6NatW6mHEhERr7zySpxyyimlHkaNLV68OC677LLc9caPH5/rd0VK5s6dGxdeeGH069cv8yyy2vTee+/FJZdcUuHXZ8yYEcOHD49jjjkmd9v16tXLtVw5i0aNGtVqewC1zR5YwGpjyJAhucqXl5d/K/bryXtKVHXr1JYbb7wx7rnnnpL1n0Xjxo1j0KBBsf3225d6KEXzyCOP5Cr/8ssvx+TJk4s0mvT16tUrnnnmmZL1/8wzz8Rf//rXTGVXrFiRq+3ly5dXZ0hF1b1797jzzjtLPYwYO3ZsHHnkkVFeXl7qodTYjTfeGOPHj89d7+GHHy7CaOrOgAEDSvJeWrhwYfTo0aPK986f/vSnWLBgQR2NqnLNmzePsrKyUg8DoEICLGC1MWTIkJg5c2bm8k899VQyfxQW01tvvZW7zsSJE4swkuxOO+20eO6550o6hqq0aNEi7r333lr/hDsVAwYMiEKhkLl8nhO91lTHH398tX7eamry5Mm5ZiO9//77udqvzsbpdeHEE0+Mvn375nqf1qYnn3wyfvKTn8ScOXNK0n9tGjt2bKUzgSpz++23r/bh9cpTeOvK0qVLo2fPnplO350wYUJceumlJXuff9laa62V+1AAgLokwAJWK3lmjaQ+y6e2DB06NGbPnp25/Ny5c0u+tHLBggXRoUOHTBtS16a8N+rbb7993HvvvWvkxrZjx46N119/PVPZhQsXrvGHIWQxY8aMaN++fbz55pt11ueECROiffv2uU4ryztjJuUZNmeddVb84he/qNMZUMuXL4++ffvGIYccUufh1dKlS2u9zRkzZsQJJ5yQ+TTNVfnzn/8cn3/+eS2Oqm4tWbIkunTpEs8++2zR+/rkk0/ipJNOyjUD/Lrrros+ffoUZTxjx47NVT7LicYApSLAAlYrWZcBzJgxI+69994ijyYN5eXlccUVV2T+9Paqq66KuXPnFnlUVSsvL49DDz00/va3v8Vnn31W1L7mzZsXl156aWy55Za5l5X+6Ec/WmPDm4ceeihTuZEjRybxnknBlClT4oADDojhw4cXtZ8VK1bEwIEDY//99889++Uvf/lLTJo0KVPZd999N/lTN2+55ZbYa6+94qmnnip6X5MmTYqOHTvGWWedVfS+VuWiiy6K//znP7XW3syZM6NTp06Z3w8V6d+/f+YlrKmaO3duHHbYYdGvX7+ihXH//ve/45BDDonBgwfnrnvOOefEH/7wh1oLMQuFQvzjH/+Ijh075lomXJcnRQJUR8l3kne5XGvGVcxTCL98vfXWW1W2feutt1ar7dXxFMKV12WXXVZYtmxZhe2uWLGi8Je//KXk75NVXQcccEDhhRdeyPU6ZTFnzpzCDTfcUGjRosVX+nv88cdzt3XllVfW6WtSzFMIV15bbrllppPwjj/++Go9hzXlFMKKrh49etTaCW1f9vrrrxcOO+ywGo2tdevWhYkTJ1bazzvvvFPYdddd6/znvSbXz372s8LYsWNr/TWfNm1a4aKLLiqUlZXV6nir835t06ZNYcKECTV+TqNHjy60atWqVp/PxRdfXO1T80pxCmFFV+fOnTP9LZHV/PnzC1dddVWtvH9+/OMfF955550ajWfevHlf+fvklVdeyVx35syZVZ526hRCl8tVwqvkA3C5XGvIVVcB1pVXXlll2/vss0+12l6dA6yI/wVB999/f2HatGmFJUuWFJYsWVKYMWNG4cEHHywceuihJX+PVHV16NChMGzYsMKCBQtyvWZftnjx4sKoUaMK5557bqFx48ar7KdJkyaFcePG5Wp3xYoVhZ49e9bZa1EXAVZEFEaNGlVpux9//HGVNzMVXWt6gBURhbKyssLZZ59dGD16dKUBclUWLFhQuO+++wqdOnWqtbE1bty40Lt378K4ceMK8+fPLyxfvrxQXl5eeO211wpXXHFFoWnTpnX2fq7t64gjjigMHjw493vsy5YsWVJ46qmnCmeccUatB1c1fb+WlZUV/vrXvxbmz5+f+3nNnDmzcMEFFxTttd97770LI0aMKHz22We5xrVo0aIK29xpp50KRx11VOarot/tea9TTz218Mwzz+R+Lit98MEHhWuuuaaw6aab1upr3LBhw8J5551XePvtt3ONZ+HChYUBAwYUtt5666+0d/bZZxfmzJmT+Tr22GMrHZ8Ay+Vyleqq9///BwAko2HDhtGxY8fYa6+9Ytttt42WLVvGBhtsEI0aNYoGDRpERMRnn30WCxYsiDlz5sT06dNj8uTJ8fLLL8eIESNi3rx5JX4GfBttttlm0alTp2jbtm1svfXWsdFGG8UGG2wQZWVl0aBBg/jss89i0aJFsWjRoliwYEG8//77MWHChBg7dmyMGjXK+7Ya6tevHwceeGAccMABsf3220fLli2jRYsW0ahRoygrK4vvfOc7sWTJkli8eHHMmTMnPvzww3j33XfjhRdeiEcffbTor3mvXr1yLdHs0KHDV5anbrLJJnH66afH4YcfHjvttFOFJ8TNnTs3XnnllRgxYkTcdtttNdrvKqsdd9wxfvrTn8Zuu+0W2267bTRp0iQaN24ca621VixdujTmzZsXs2bNikmTJsWrr74aQ4cOjXfffbfo46qOLbbYIo444ojYY489olWrVrHxxhtH06ZNv/jZXbZsWSxatChmz54dH3zwQbzxxhvxxBNPxJNPPln0sR1++OHx4x//OHbfffdo2bJlrLfeerHeeutFRMSiRYvio48+irfffjteeOGFuOOOO+pk37auXbvGpptumqns/Pnz45ZbbinyiIBvCwEWAAAUQU0DrC9r2LBh7LrrrrHZZpvFuuuuG0uXLo358+fHhAkTkg2GAKA2rVXqAQAAAJX79NNP4/nnny/1MACgZJxCCAAAAEDSBFgA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YAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAE/N2R4AAAbsSURBVAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAACQNAEWAAAAAEkTYAEAAPx/7dixAAAAAMAgf+tp7CiMAFgTWAAAAACsCSwAAAAA1gQWAAAAAGsCCwAAAIA1gQUAAADAmsACAAAAYE1gAQAAALAmsAAAAABYE1gAAAAArAksAAAAANYEFgAAAABrAgsAAACANYEFAAAAwJrAAgAAAGBNYAEAAACwJrAAAAAAWBNYAAAAAKwJLAAAAADWBBYAAAAAawILAAAAgDWBBQAAAMCawAIAAABgTWABAAAAsCawAAAAAFgTWAAAAACsCSwAAAAA1gQWAAAAAGsCCwAAAIA1gQUAAADAmsACAAAAYE1gAQAAALAmsAAAAABYE1gAAAAArAksAAAAANYEFgAAAABrAgsAAACANYEFAAAAwJrAAgAAAGBNYAEAAACwJrAAAAAAWBNYAAAAAKwJLAAAAADWBBYAAAAAawILAAAAgDWBBQAAAMCawAIAAABgTWABAAAAsCawAAAAAFgTWAAAAACsCSwAAAAA1gQWAAAAAGsCCwAAAIA1gQUAAADAmsACAAAAYE1gAQAAALAmsAAAAABYE1gAAAAArAksAAAAANYEFgAAAABrAgsAAACANYEFAAAAwJrAAgAAAGBNYAEAAACwJrAAAAAAWBNYAAAAAKwJLAAAAADWBBYAAAAAawILAAAAgDWBBQAAAMCawAIAAABgTWABAAAAsCawAAAAAFgTWAAAAACsCSwAAAAA1gQWAAAAAGsCCwAAAIA1gQUAAADAmsACAAAAYE1gAQAAALAmsAAAAABYE1gAAAAArAksAAAAANYEFgAAAABrAgsAAACANYEFAAAAwJrAAgAAAGBNYAEAAACwJrAAAAAAWBNYAAAAAKwJLAAAAADWBBYAAAAAawILAAAAgDWBBQAAAMCawAIAAABgTWABAAAAsCawAAAAAFgTWAAAAACsCSwAAAAA1gQWAAAAAGsCCwAAAIA1gQUAAADAmsACAAAAYE1gAQAAALAmsAAAAABYE1gAAAAArAksAAAAANYEFgAAAABrAgsAAACANYEFAAAAwFrIyMr9g3CCwQAAAABJRU5ErkJggg==" alt="Mr & Mrs Optical logo" style="display:block;width:180px;max-width:100%;height:auto"></div><div class="brand">MR &amp; MRS OPTICAL</div><div class="muted">1st Floor, Darshan Complex, Opp. GEB, Dehgam,<br>Dist. Gandhinagar – 382305</div><div class="muted">Mobile: 7567916060</div></div><div class="right"><div class="label">Invoice</div><div style="font-size:20px;font-weight:800">${safe(invoiceNo)}</div><div class="muted">Issue date: ${safe(date)}</div><div class="muted">Order ID: ${safe(order.id)}</div></div></header><div class="title">INVOICE</div><div class="muted">Thank you for choosing us.</div><section class="details"><div><div class="label">Bill to</div><h3>${safe(customer.name || 'Customer')}</h3><p>${safe(customer.phone || 'Phone not provided')}</p><p>${safe(customer.email || '')}</p></div><div><div class="label">Order details</div><p><strong>Status:</strong> ${safe(order.status || '—')}</p><p><strong>Expected delivery:</strong> ${safe(order.expected_delivery_date || '—')}</p><p><strong>Due date:</strong> ${safe(order.due_date || '—')}</p></div></section><table class="table"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>${detailRows.map((row) => `<tr><td>${safe(row[0])}${row[1] === 1 ? '' : `<div class="muted">${safe(row[1])}</div>`}</td><td class="num">${safe(row[2])}</td><td class="num">${rupees(row[3])}</td></tr>`).join('')}</tbody></table><section class="totals"><div><span>Subtotal / order total</span><strong>${rupees(total)}</strong></div><div><span>Advance received</span><strong>− ${rupees(advance)}</strong></div><div class="balance"><span>Balance due</span><span>${rupees(balance)}</span></div></section>${prescription.id ? `<section class="note"><strong>Prescription reference</strong><div class="muted">R: SPH ${safe(prescription.right_sph)} · CYL ${safe(prescription.right_cyl)} · Axis ${safe(prescription.right_axis)} &nbsp; | &nbsp; L: SPH ${safe(prescription.left_sph)} · CYL ${safe(prescription.left_cyl)} · Axis ${safe(prescription.left_axis)} · PD ${safe(prescription.pd)} mm</div></section>` : ''}${order.notes ? `<section class="note"><strong>Notes</strong><div>${safe(order.notes)}</div></section>` : ''}<div class="foot">Please retain this invoice for your records. Balance is based on the advance amount recorded in the shop system.<br>No GSTIN provided · This is a non-GST invoice/receipt, not a GST tax invoice.<br><strong>Powered by Arion AI OS</strong></div></main><script>if(${JSON.stringify(action)}==='print'){window.addEventListener('load',()=>setTimeout(()=>window.print(),300))}</script></body></html>`
    const popup = window.open('', '_blank', 'width=950,height=850')
    if (!popup) {
      setError('Invoice popup blocked. Allow pop-ups for Arion AI OS and try again.')
      return
    }
    popup.document.open()
    popup.document.write(html)
    popup.document.close()
  }

  function openPaymentReceipt(payment, action = 'print') {
    const order = (records.orders || []).find((item) => String(item.id) === String(payment.order_id)) || {}
    const customer = (records.customers || []).find((item) => String(item.id) === String(order.customer_id)) || {}
    const safe = (value) => String(value ?? '—').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
    const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const receiptNo = `RC-${String(payment.id).slice(0, 8).toUpperCase()}`
    const paidDate = payment.paid_at ? new Date(payment.paid_at).toLocaleString('en-IN') : (payment.created_at ? new Date(payment.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'))
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${safe(receiptNo)}</title><style>*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#182033;margin:0;background:#f3f5f9}.toolbar{display:flex;justify-content:center;gap:10px;padding:18px}.toolbar button{border:0;border-radius:8px;padding:11px 16px;font-weight:700;cursor:pointer;background:#635bdb;color:#fff}.toolbar .secondary{background:#e7e9f2;color:#182033}.sheet{width:min(760px,calc(100% - 32px));margin:0 auto 28px;background:#fff;padding:42px;border:1px solid #e2e6ef}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #635bdb;padding-bottom:20px}.brand{font-size:25px;font-weight:800;color:#4038a8}.muted{color:#667085}.label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#667085;font-weight:700}.title{font-size:28px;font-weight:800;margin:25px 0 6px}.row{display:flex;justify-content:space-between;gap:15px;padding:12px 0;border-bottom:1px solid #e6e9f0}.total{font-size:22px;font-weight:800;color:#4038a8;margin-top:20px;text-align:right}.foot{border-top:1px solid #e5e8ef;margin-top:32px;padding-top:16px;text-align:center;color:#667085;font-size:11px}@page{size:A4;margin:12mm}@media print{body{background:#fff}.toolbar{display:none}.sheet{width:100%;margin:0;border:0;padding:8px}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print receipt</button><button class="secondary" onclick="window.print()">Save as PDF</button></div><main class="sheet"><header class="head"><div><div class="brand">MR &amp; MRS OPTICAL</div><div class="muted">1st Floor, Darshan Complex, Opp. GEB, Dehgam,<br>Dist. Gandhinagar – 382305</div><div class="muted">Mobile: 7567916060</div></div><div style="text-align:right"><div class="label">Receipt no.</div><strong>${safe(receiptNo)}</strong><div class="muted">${safe(paidDate)}</div></div></header><div class="title">PAYMENT RECEIPT</div><p>Received payment from <strong>${safe(customer.name || 'Customer')}</strong>.</p><div class="row"><span class="muted">Payment amount</span><strong>${rupees(payment.amount)}</strong></div><div class="row"><span class="muted">Payment method</span><strong>${safe(payment.method || '—')}</strong></div><div class="row"><span class="muted">Payment status</span><strong>${safe(payment.status || '—')}</strong></div><div class="row"><span class="muted">Order reference</span><strong>${safe(order.id ? `AR-${String(order.id).slice(0, 8).toUpperCase()}` : 'Not linked')}</strong></div><div class="row"><span class="muted">Order description</span><strong>${safe(order.description || '—')}</strong></div><div class="total">Received: ${rupees(payment.amount)}</div><div class="foot">Please retain this receipt for your records.<br>No GSTIN provided · This is a non-GST payment receipt, not a GST tax invoice.<br><strong>Powered by Arion AI OS</strong></div></main><script>if(${JSON.stringify(action)}==='print'){window.addEventListener('load',()=>setTimeout(()=>window.print(),300))}</script></body></html>`
    const popup = window.open('', '_blank', 'width=850,height=800')
    if (!popup) { setError('Receipt popup blocked. Allow pop-ups for Arion AI OS and try again.'); return }
    popup.document.open()
    popup.document.write(html)
    popup.document.close()
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

  function renderReports(mode = 'reports') {
    const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    const card = (title, value, note) => <div className="metric-card report-metric" key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></div>
    return <>
      <div className="page-heading"><div><p className="eyebrow">BUSINESS PERFORMANCE</p><h1>{mode === 'sales' ? 'Sales Overview' : 'Reports, Profit & Inventory'}</h1><p className="muted">Workspace-filtered data from your live Supabase records.</p></div><button className="primary-btn compact" onClick={exportReportCsv}>Export CSV</button></div>
      <div className="toolbar report-toolbar"><label>Order period <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All available records</option></select></label><span className="muted">{reportData.activeOrders.length} non-cancelled orders in period</span></div>
      <div className="metric-grid report-grid">
        {card('Sales / order value', money(reportData.sales), 'Cancelled orders excluded')}
        {card('Payments collected', money(reportData.collected), 'Paid payment records in period')}
        {card('Outstanding balance', money(reportData.outstanding), 'Balance across included orders')}
        {card('Inventory cost value', money(reportData.inventoryValue), 'Current quantity × recorded cost')}
      </div>
      <div className="overview-grid report-sections">
        <section className="panel"><h2>Profit estimate</h2><p className="muted">Gross estimate uses linked frame/lens cost prices only.</p><div className="report-number">{money(reportData.estimatedGrossProfit)}</div><div className="report-line"><span>Order value</span><strong>{money(reportData.sales)}</strong></div><div className="report-line"><span>Estimated frame/lens cost</span><strong>{money(reportData.estimatedCogs)}</strong></div><div className="report-line"><span>Estimated gross profit</span><strong>{money(reportData.estimatedGrossProfit)}</strong></div><div className="report-note">Not net profit: rent, salaries, discounts, taxes, service/lab charges and unlinked product costs are not included. Current inventory costs may differ from historical purchase costs, so treat this as an estimate.</div></section>
        <section className="panel"><h2>Inventory health</h2><p className="muted">Current stock at or below its reorder threshold</p><div className="report-number">{reportData.lowStock.length} <small>low-stock item(s)</small></div><div className="report-line"><span>Total inventory SKUs</span><strong>{(records.inventory || []).length}</strong></div><div className="report-line"><span>Units on hand</span><strong>{(records.inventory || []).reduce((s, i) => s + Number(i.quantity || 0), 0).toLocaleString('en-IN')}</strong></div><div className="report-line"><span>Stock cost value</span><strong>{money(reportData.inventoryValue)}</strong></div><button className="secondary-btn" onClick={() => { setPage('inventory'); setSearch(''); }}>Open inventory →</button></section>
      </div>
      <section className="panel table-panel"><h2>Low-stock watchlist</h2><p className="muted">Restock items before they run out.</p><div className="table-scroll"><table><thead><tr><th>Item</th><th>Type</th><th>Brand</th><th>In stock</th><th>Reorder at</th><th>Cost value</th></tr></thead><tbody>{reportData.lowStock.map((i) => <tr key={i.id}><td>{i.item_name}</td><td>{i.item_type || '—'}</td><td>{i.brand || '—'}</td><td><span className="alert error">{Number(i.quantity || 0)}</span></td><td>{Number(i.reorder_level || 0)}</td><td>{money(Number(i.quantity || 0) * Number(i.cost_price || 0))}</td></tr>)}{!reportData.lowStock.length && <tr><td colSpan="6">No low-stock items at the moment.</td></tr>}</tbody></table></div></section>
      <section className="panel table-panel"><h2>Sales by order</h2><p className="muted">Most recent matching orders; use CSV for the full export.</p><div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Order value</th><th>Advance paid</th><th>Balance</th></tr></thead><tbody>{reportData.includedOrders.slice(0, 20).map((o) => { const c = (records.customers || []).find((x) => String(x.id) === String(o.customer_id)); return <tr key={o.id}><td>#{String(o.id).slice(0, 8)}</td><td>{c?.name || 'Customer'}</td><td>{o.status || '—'}</td><td>{money(o.amount)}</td><td>{money(o.advance_paid)}</td><td>{money(o.remaining_balance ?? (Number(o.amount || 0) - Number(o.advance_paid || 0)))}</td></tr> })}{!reportData.includedOrders.length && <tr><td colSpan="6">No orders found for this period.</td></tr>}</tbody></table></div></section>
      <div className="alert success">Report is based on Supabase data for the signed-in workspace. Keep inventory cost prices and order item links accurate for more useful profit estimates.</div>
    </>
  }

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
                playClick()
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
          <button className="signout-btn" onClick={() => { playClick(); signOut() }}>Sign out</button>
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
            <button className="secondary-btn" onClick={() => { playClick(); refreshData() }} disabled={loading}>
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

          {page === 'sales' ? renderReports('sales') : page === 'reports' ? renderReports('reports') : page === 'overview' ? (
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
                      <button className="metric-card" key={label} onClick={() => { playClick(); setPage(label === 'Open leads' ? 'leads' : label.toLowerCase()) }}>
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
                  + Add {{ prescriptions: 'prescription', inventory: 'item', leads: 'lead', tasks: 'task', customers: 'customer', orders: 'order', payments: 'payment' }[page] || 'record'}
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
                                {page === 'prescriptions' && key === 'customer_id'
                                  ? (records.customers || []).find((customer) => String(customer.id) === String(record.customer_id))?.name || formatValue(record.customer_id)
                                  : page === 'orders' && key === 'customer_id'
                                    ? (records.customers || []).find((customer) => String(customer.id) === String(record.customer_id))?.name || formatValue(record.customer_id)
                                    : page === 'orders' && key === 'remaining_balance'
                                      ? `₹${Number(record.remaining_balance ?? Math.max(0, Number(record.amount || 0) - Number(record.advance_paid || 0))).toLocaleString('en-IN')}`
                                      : page === 'inventory' && ['cost_price', 'selling_price'].includes(key) && record[key] != null
                                    ? `₹${Number(record[key]).toLocaleString('en-IN')}`
                                    : page === 'inventory' && key === 'quantity' && Number(record.quantity || 0) <= Number(record.reorder_level || 0)
                                      ? <span className="alert error">Low stock: {formatValue(record.quantity)}</span>
                                      : formatValue(record[key])}
                              </td>
                            ))}
                            <td>
                              <div className="row-actions">
                                {page === 'orders' && <button className="secondary-btn tiny" onClick={() => { playClick(); openInvoice(record, 'preview') }}>Invoice</button>}
                                {page === 'payments' && String(record.status).toLowerCase() === 'paid' && <button className="secondary-btn tiny" onClick={() => { playClick(); openPaymentReceipt(record, 'preview') }}>Receipt</button>}
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