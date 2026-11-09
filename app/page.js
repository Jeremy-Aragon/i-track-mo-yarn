'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CATS = { expense: ['Food','Transport','Housing','Utilities','Shopping','Health','Entertainment','Other'], income: ['Salary','Freelance','Gift','Other'] }
const peso = n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)

export default function Home() {
  const [session, setSession] = useState(null)
  const [tx, setTx] = useState([])
  const [ai, setAi] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [f, setF] = useState({ type: 'expense', amount: '', category: 'Food', date: new Date().toISOString().slice(0, 10), note: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => l.subscription.unsubscribe()
  }, [])

  const load = async () => {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    setTx(data || [])
  }
  useEffect(() => { if (session) load() }, [session])

  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  const add = async e => {
    e.preventDefault()
    const row = { ...f, amount: parseFloat(f.amount) }
    const { error } = editId
      ? await supabase.from('transactions').update(row).eq('id', editId)
      : await supabase.from('transactions').insert(row)
    if (error) return alert(error.message)
    setEditId(null); setF({ ...f, amount: '', note: '' }); load()
  }
  const startEdit = t => {
    setEditId(t.id)
    setF({ type: t.type, amount: String(t.amount), category: t.category, date: t.date, note: t.note || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const cancelEdit = () => { setEditId(null); setF({ ...f, amount: '', note: '' }) }
  const del = async id => { await supabase.from('transactions').delete().eq('id', id); load() }
  const analyze = async question => {
    setBusy(true); setAi('Thinking…')
    const r = await fetch('/api/analyze', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify({ question }) })
    const j = await r.json(); setAi(j.text || j.error); setBusy(false)
  }

  if (!session) return (
    <div style={{ textAlign: 'center', marginTop: 120 }}>
      <h1>iTrack mo yarn</h1><p>Track your money. Let AI explain it.</p>
      <button onClick={login}>Continue with Google</button>
    </div>
  )

  const sum = t => tx.filter(x => x.type === t).reduce((s, x) => s + Number(x.amount), 0)
  const inc = sum('income'), ex = sum('expense')
  const cats = Object.entries(tx.filter(x => x.type === 'expense').reduce((m, x) => ({ ...m, [x.category]: (m[x.category] || 0) + Number(x.amount) }), {})).sort((a, b) => b[1] - a[1])

  return (
    <main>
      <div className="row" style={{ border: 0 }}>
        <h1 style={{ margin: 0 }}>iTrack mo yarn</h1>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
      <div className="stats">
        {[['Income', peso(inc)], ['Expenses', peso(ex)], ['Net', peso(inc - ex)], ['Savings rate', (inc ? Math.round((inc - ex) / inc * 100) : 0) + '%']].map(([l, v]) =>
          <div className="card" key={l}><small>{l}</small><div style={{ fontSize: 22, fontWeight: 650 }}>{v}</div></div>)}
      </div>
      <div className="card"><form onSubmit={add}>
        <select value={f.type} onChange={e => setF({ ...f, type: e.target.value, category: CATS[e.target.value][0] })}><option value="expense">Expense</option><option value="income">Income</option></select>
        <input type="number" step="0.01" min="0" required placeholder="Amount (₱)" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS[f.type].map(c => <option key={c}>{c}</option>)}</select>
        <input type="date" required value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
        <input placeholder="Note" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
        <button>{editId ? 'Save changes' : 'Add'}</button>
        {editId && <button type="button" onClick={cancelEdit} style={{ background: 'transparent', color: 'inherit', border: '1px solid #8885' }}>Cancel</button>}
      </form></div>
      <div className="card"><b>Spending by category</b>{cats.map(([c, v]) => <div className="row" key={c}><span>{c}</span><span>{peso(v)}</span></div>)}</div>
      <div className="card"><b>✨ AI analysis</b><br />
        <button disabled={busy} onClick={() => analyze()} style={{ margin: '8px 0' }}>Analyze my finances</button>
        <div style={{ display: 'flex', gap: 8 }}><input style={{ flex: 1 }} placeholder="Ask a question…" value={q} onChange={e => setQ(e.target.value)} /><button disabled={busy || !q} onClick={() => analyze(q)}>Ask</button></div>
        <p className="ai">{ai}</p></div>
      <div className="card"><b>Transactions</b>{tx.map(t => <div className="row" key={t.id}><span>{t.date} · {t.category} {t.note && `· ${t.note}`}</span><span>{t.type === 'income' ? '+' : '−'}{peso(t.amount)} <a href="#" title="Edit" onClick={e => { e.preventDefault(); startEdit(t) }}>✎</a> <a href="#" title="Delete" onClick={e => { e.preventDefault(); if (confirm('Delete this transaction?')) { if (editId === t.id) cancelEdit(); del(t.id) } }}>✕</a></span></div>)}</div>
    </main>
  )
}
