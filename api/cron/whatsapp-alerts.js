import { createClient } from '@supabase/supabase-js'

// Usa a service role key — só aqui, nunca no frontend. Ignora RLS
// porque o cron não corre autenticado como nenhum utilizador.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php'

async function sendWhatsApp(phone, apikey, text) {
  const url = `${CALLMEBOT_URL}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(
    text
  )}&apikey=${encodeURIComponent(apikey)}`
  try {
    await fetch(url)
  } catch (err) {
    console.error('Erro ao enviar WhatsApp para', phone, err)
  }
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  // Vercel injeta automaticamente "Authorization: Bearer <CRON_SECRET>"
  // quando a variável de ambiente CRON_SECRET está definida no projeto.
  const authHeader = req.headers['authorization']
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const hoje = new Date()
  const hojeISO = isoDate(hoje)
  const isPrimeiroDoMes = hoje.getDate() === 1

  const { data: perfis, error } = await supabase
    .from('profiles')
    .select(
      'id, whatsapp_number, callmebot_apikey, whatsapp_ativo, is_premium, ultimo_lembrete_em, ultimo_resumo_em'
    )
    .eq('is_premium', true)
    .eq('whatsapp_ativo', true)
    .not('callmebot_apikey', 'is', null)

  if (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }

  let lembretesEnviados = 0
  let resumosEnviados = 0

  for (const perfil of perfis || []) {
    // --------------------------------------------------------
    // Resumo mensal — enviado no dia 1, com os totais do mês anterior
    // --------------------------------------------------------
    if (isPrimeiroDoMes && perfil.ultimo_resumo_em !== hojeISO) {
      const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)

      const [{ data: deslocacoes }, { data: despesas }] = await Promise.all([
        supabase
          .from('deslocacoes')
          .select('km, valor_total')
          .eq('user_id', perfil.id)
          .gte('data', isoDate(primeiroDiaMesAnterior))
          .lte('data', isoDate(ultimoDiaMesAnterior)),
        supabase
          .from('despesas')
          .select('valor')
          .eq('user_id', perfil.id)
          .eq('confirmado', true)
          .gte('data', isoDate(primeiroDiaMesAnterior))
          .lte('data', isoDate(ultimoDiaMesAnterior))
      ])

      const totalKm = (deslocacoes || []).reduce((s, d) => s + Number(d.km || 0), 0)
      const totalKmValor = (deslocacoes || []).reduce((s, d) => s + Number(d.valor_total || 0), 0)
      const totalDespesas = (despesas || []).reduce((s, d) => s + Number(d.valor || 0), 0)

      const nomeMes = primeiroDiaMesAnterior.toLocaleDateString('pt-PT', {
        month: 'long',
        year: 'numeric'
      })

      const texto =
        `Percurso — resumo de ${nomeMes}\n` +
        `Km percorridos: ${totalKm.toFixed(1)} km (${totalKmValor.toFixed(2)} EUR)\n` +
        `Despesas registadas: ${totalDespesas.toFixed(2)} EUR\n` +
        `Total dedutível: ${(totalKmValor + totalDespesas).toFixed(2)} EUR`

      await sendWhatsApp(perfil.whatsapp_number, perfil.callmebot_apikey, texto)
      await supabase.from('profiles').update({ ultimo_resumo_em: hojeISO }).eq('id', perfil.id)
      resumosEnviados++
      continue // não envia lembrete no mesmo dia em que envia o resumo
    }

    // --------------------------------------------------------
    // Lembrete de registo — sem atividade há 3 ou mais dias
    // --------------------------------------------------------
    if (perfil.ultimo_lembrete_em === hojeISO) continue

    const [{ data: ultimaDeslocacao }, { data: ultimaDespesa }] = await Promise.all([
      supabase
        .from('deslocacoes')
        .select('data')
        .eq('user_id', perfil.id)
        .order('data', { ascending: false })
        .limit(1),
      supabase
        .from('despesas')
        .select('data')
        .eq('user_id', perfil.id)
        .order('data', { ascending: false })
        .limit(1)
    ])

    const datas = [...(ultimaDeslocacao || []), ...(ultimaDespesa || [])].map((d) => d.data)
    const ultimaAtividade = datas.length ? datas.sort().reverse()[0] : null

    const diasSemAtividade = ultimaAtividade
      ? Math.floor((hoje - new Date(ultimaAtividade)) / (1000 * 60 * 60 * 24))
      : 999

    if (diasSemAtividade >= 3) {
      const texto = `Percurso — já lá vão ${diasSemAtividade} dias sem registares deslocações ou despesas. Um lembrete rápido para não perderes nada dedutível.`
      await sendWhatsApp(perfil.whatsapp_number, perfil.callmebot_apikey, texto)
      await supabase.from('profiles').update({ ultimo_lembrete_em: hojeISO }).eq('id', perfil.id)
      lembretesEnviados++
    }
  }

  return res.status(200).json({ ok: true, lembretesEnviados, resumosEnviados })
}
