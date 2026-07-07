import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Precisamos do corpo em bruto (raw) para verificar a assinatura do Stripe —
// por isso desligamos o parser automático do Vercel para esta rota.
export const config = {
  api: { bodyParser: false }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function marcarPremium(customerId, subscriptionId, ativo) {
  const update = {
    is_premium: ativo,
    stripe_subscription_id: subscriptionId || null
  }
  if (ativo) update.premium_desde = new Date().toISOString()
  else update.premium_ate = new Date().toISOString()

  await supabase.from('profiles').update(update).eq('stripe_customer_id', customerId)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const rawBody = await readRawBody(req)
  const signature = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Assinatura do webhook Stripe inválida:', err.message)
    return res.status(400).json({ error: `Webhook inválido: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await marcarPremium(session.customer, session.subscription, true)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const ativo = ['active', 'trialing'].includes(subscription.status)
        await marcarPremium(subscription.customer, subscription.id, ativo)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await marcarPremium(subscription.customer, null, false)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Erro ao processar evento Stripe:', err)
    return res.status(500).json({ error: 'Erro ao processar o evento' })
  }

  return res.status(200).json({ received: true })
}
