import { createClient } from '@supabase/supabase-js'

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

  const { data: perfil, error: perfilError } = await supabase
    .from('profiles')
    .select('whatsapp_number, callmebot_apikey')
    .eq('id', userData.user.id)
    .single()

  if (perfilError || !perfil?.whatsapp_number || !perfil?.callmebot_apikey) {
    return res.status(400).json({
      error: 'Preenche e guarda o número e a apikey antes de enviares o teste.'
    })
  }

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(perfil.whatsapp_number)}` +
    `&text=${encodeURIComponent('Percurso — mensagem de teste. Se recebeste isto, os alertas estão bem configurados.')}` +
    `&apikey=${encodeURIComponent(perfil.callmebot_apikey)}`

  let callmebotResponse
  try {
    callmebotResponse = await fetch(url)
  } catch (err) {
    console.error(err)
    return res.status(502).json({ error: 'Não foi possível contactar o CallMeBot.' })
  }

  const texto = await callmebotResponse.text()

  if (!callmebotResponse.ok || /error/i.test(texto)) {
    console.error('Resposta do CallMeBot:', texto)
    return res.status(502).json({
      error: `O CallMeBot devolveu um problema: ${texto.slice(0, 200)}`
    })
  }

  return res.status(200).json({ ok: true })
}
