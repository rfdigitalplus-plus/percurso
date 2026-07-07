import { createClient } from '@supabase/supabase-js'

// Service role: só aqui, nunca no frontend.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CATEGORIAS = ['combustivel', 'portagens', 'refeicoes', 'estacionamento', 'outro']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { path: filePath, accessToken } = req.body || {}
  if (!filePath || !accessToken) {
    return res.status(400).json({ error: 'Faltam dados (path/accessToken)' })
  }

  // Confirma a identidade do utilizador a partir do token enviado pelo cliente
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  const userId = userData.user.id

  // O caminho tem de começar por "{userId}/" — impede ler faturas de outra pessoa
  if (!filePath.startsWith(`${userId}/`)) {
    return res.status(403).json({ error: 'Acesso negado a este ficheiro' })
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('faturas')
    .download(filePath)

  if (downloadError || !fileData) {
    return res.status(404).json({ error: 'Ficheiro não encontrado' })
  }

  const arrayBuffer = await fileData.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mediaType = fileData.type || ''
  const isPdf = mediaType === 'application/pdf'
  const IMAGENS_SUPORTADAS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (!isPdf && !IMAGENS_SUPORTADAS.includes(mediaType)) {
    return res.status(422).json({
      error:
        `Formato de ficheiro não suportado (${mediaType || 'desconhecido'}). ` +
        'Usa uma foto em JPEG/PNG ou um PDF.'
    })
  }

  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }

  const prompt =
    'Analisa esta fatura ou recibo português. Responde APENAS com um objeto JSON, sem texto ' +
    'antes ou depois, sem markdown, com exatamente estes campos:\n' +
    '{"valor": numero (total pago em euros, só o número), ' +
    '"data": "AAAA-MM-DD" (data do documento), ' +
    `"categoria": uma destas strings exatas — ${CATEGORIAS.join(', ')}, ` +
    '"descricao": nome do estabelecimento ou breve descrição}\n' +
    'Se não conseguires ler algum campo com confiança, usa null nesse campo.'

  let anthropicResponse
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }]
      })
    })
  } catch (err) {
    console.error('Erro de rede ao contactar a Anthropic API:', err)
    return res.status(502).json({ error: 'Falha ao contactar o serviço de IA' })
  }

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text()
    console.error('Erro da Anthropic API:', anthropicResponse.status, errText)
    return res.status(502).json({
      error: `O serviço de IA devolveu um erro (${anthropicResponse.status}). Verifica a ANTHROPIC_API_KEY e o saldo da conta.`
    })
  }

  const anthropicData = await anthropicResponse.json()
  const textBlock = (anthropicData.content || []).find((b) => b.type === 'text')
  const textoResposta = textBlock?.text || ''

  let parsed
  try {
    // Extrai só o que está entre a primeira "{" e a última "}", para tolerar
    // qualquer texto extra que a IA acrescente apesar da instrução.
    const inicio = textoResposta.indexOf('{')
    const fim = textoResposta.lastIndexOf('}')
    if (inicio === -1 || fim === -1) throw new Error('Sem JSON na resposta')
    parsed = JSON.parse(textoResposta.slice(inicio, fim + 1))
  } catch (err) {
    console.error('Erro ao interpretar resposta da IA:', textoResposta)
    return res.status(502).json({
      error: 'A IA não conseguiu ler este documento com confiança suficiente.'
    })
  }

  const categoria = CATEGORIAS.includes(parsed.categoria) ? parsed.categoria : 'outro'

  const { data: despesa, error: insertError } = await supabase
    .from('despesas')
    .insert({
      user_id: userId,
      data: parsed.data || new Date().toISOString().slice(0, 10),
      categoria,
      descricao: parsed.descricao || null,
      valor: parsed.valor || 0,
      fatura_path: filePath,
      deteccao_ia: true,
      confirmado: false
    })
    .select()
    .single()

  if (insertError) {
    console.error(insertError)
    return res.status(500).json({ error: 'Não foi possível guardar a despesa' })
  }

  return res.status(200).json({ despesa })
}
