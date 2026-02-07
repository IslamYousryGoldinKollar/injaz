import { NextRequest, NextResponse } from "next/server"
import { getChatModel, DEFAULT_SYSTEM_PROMPT } from "@/lib/ai"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const message = update.message

    if (!message?.text && !message?.voice) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    let userText = message.text || ""

    // Handle voice messages
    if (message.voice) {
      const fileRes = await fetch(`${TELEGRAM_API}/getFile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: message.voice.file_id }),
      })
      const fileData = await fileRes.json()
      const filePath = fileData.result?.file_path

      if (filePath) {
        const audioRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`)
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
        const base64Audio = audioBuffer.toString("base64")

        const { GoogleGenerativeAI } = await import("@google/generative-ai")
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "")
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const result = await model.generateContent([
          { inlineData: { mimeType: "audio/ogg", data: base64Audio } },
          { text: "Transcribe this audio exactly. Return only the transcription text. If Arabic, translate to English." },
        ])
        userText = result.response.text().trim()
        await sendTelegramMessage(chatId, `🎤 _${userText}_`)
      }
    }

    if (!userText) {
      return NextResponse.json({ ok: true })
    }

    // Process with AI
    const model = getChatModel(DEFAULT_SYSTEM_PROMPT + "\n\nYou are responding via Telegram. Keep responses concise and use Markdown formatting.")
    const chat = model.startChat()
    const result = await chat.sendMessage(userText)
    const reply = result.response.text()

    await sendTelegramMessage(chatId, reply)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    return NextResponse.json({ ok: true })
  }
}
