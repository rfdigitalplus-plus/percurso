import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { accessToken } = req.body || {}
  if (!accessToken) {
    return res.status(400).json({ error: 'Falta o accessToken' })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  const user = userData.user

  const { data: perfil } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = perfil?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id }
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const origin = req.headers.origin || `https://${req.headers.host}`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/premium?sucesso=1`,
    cancel_url: `${origin}/premium?cancelado=1`
  })

  return res.status(200).json({ url: session.url })
}
