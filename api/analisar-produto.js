import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { imageBase64 } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' } )
    }

    // A chave agora fica segura no servidor da Vercel (SEM o prefixo VITE_)
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave da API do Gemini não configurada no servidor.' })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" })

    const imagePart = { 
      inlineData: { 
        data: imageBase64, 
        mimeType: "image/jpeg" 
      } 
    }

    const prompt = `
      Você é um assistente de perfumaria experiente. Analise a imagem desta embalagem.
      Extraia as informações e retorne APENAS um objeto JSON válido.
      O JSON deve conter exatamente estas 3 chaves:
      "nome": o nome completo do produto com volume (ex: Malbec Black Desodorante Colônia 100ml).
      "marca": a marca principal do produto (ex: O Boticário, Natura, Eudora).
      "setor": sugira o setor (ex: Perfumaria, Corpo e Banho, Maquiagem).
    `

    const result = await model.generateContent([prompt, imagePart])
    const responseText = result.response.text()

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("A IA não retornou um formato JSON válido.")
    }

    const jsonIA = JSON.parse(jsonMatch[0])
    return res.status(200).json(jsonIA)

  } catch (error) {
    console.error("Erro na Serverless Function:", error)
    return res.status(500).json({ error: error.message })
  }
}