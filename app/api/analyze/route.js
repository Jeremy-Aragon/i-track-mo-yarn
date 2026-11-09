import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json().catch(() => ({}))
  const { data } = await sb.from('transactions')
    .select('date,type,category,amount,note').order('date', { ascending: false }).limit(200)
  if (!data?.length) return Response.json({ text: 'Add some transactions first.' })

  const prompt = question
    ? `You are a friendly finance coach. Answer concisely (under 150 words) using the data. Question: ${question}`
    : 'You are a friendly finance coach. In under 220 words give: a one-line verdict, three specific observations with numbers, and three concrete ways to save.'

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nCurrency: PHP. Transactions: ${JSON.stringify(data)}` }] }],
      generationConfig: { maxOutputTokens: 800 }
    })
  })
  const j = await r.json()
  const text = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') 
  return Response.json({ text: text || j.error?.message || 'AI request failed.' })
}
