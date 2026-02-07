import { NextRequest, NextResponse } from "next/server"
import { getChatModel, DEFAULT_SYSTEM_PROMPT } from "@/lib/ai"
import prisma from "@/lib/prisma"
import type { FunctionCallPart } from "@google/generative-ai"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

/* eslint-disable @typescript-eslint/no-explicit-any */

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  })
}

async function executeTool(name: string, args: Record<string, any>, orgId: string, userId: string): Promise<any> {
  switch (name) {
    case "createDraftPayment": {
      let party = null
      if (args.partyName) {
        party = await prisma.party.findFirst({
          where: { organizationId: orgId, name: { contains: args.partyName, mode: "insensitive" } },
        })
        if (!party) {
          party = await prisma.party.create({
            data: { organizationId: orgId, name: args.partyName, type: args.direction === "INBOUND" ? "CLIENT" : "VENDOR" } as any,
          })
        }
      }
      const draftCount = await prisma.payment.count({ where: { organizationId: orgId, isDraft: true } })
      const draftNumber = `DRF-${String(draftCount + 1).padStart(4, "0")}`
      const draft = await prisma.payment.create({
        data: {
          organizationId: orgId,
          number: draftNumber,
          direction: args.direction || "OUTBOUND",
          partyId: party?.id || null,
          plannedDate: args.date ? new Date(args.date) : new Date(),
          expectedAmount: args.amount,
          description: args.description || "",
          voiceTranscript: args.voiceTranscript || null,
          isDraft: true,
          createdById: userId,
        } as any,
      })
      return { success: true, message: `Draft payment ${draft.number} created: ${args.amount} EGP ${args.direction === "INBOUND" ? "from" : "to"} ${party?.name || "unknown party"}. Review it in Draft Payments.` }
    }
    case "createPayment": {
      let party = await prisma.party.findFirst({
        where: { organizationId: orgId, name: { contains: args.partyName, mode: "insensitive" } },
      })
      if (!party) {
        party = await prisma.party.create({
          data: { organizationId: orgId, name: args.partyName, type: args.direction === "INBOUND" ? "CLIENT" : "VENDOR" } as any,
        })
      }
      const count = await prisma.payment.count({ where: { organizationId: orgId } })
      const prefix = args.direction === "INBOUND" ? "RCV" : "PAY"
      const payment = await prisma.payment.create({
        data: {
          organizationId: orgId,
          number: `${prefix}-${String(count + 1).padStart(4, "0")}`,
          direction: args.direction,
          partyId: party.id,
          plannedDate: args.date ? new Date(args.date) : new Date(),
          expectedAmount: args.amount,
          description: args.description || "",
          createdById: userId,
        } as any,
      })
      return { success: true, message: `Payment ${payment.number} created: ${args.amount} EGP ${args.direction === "INBOUND" ? "from" : "to"} ${party.name}` }
    }
    case "createTask": {
      const task = await prisma.task.create({
        data: { title: args.title, description: args.description, priority: args.priority || "Medium", createdById: userId } as any,
      })
      return { success: true, message: `Task "${task.title}" created` }
    }
    default:
      return { message: `Function ${name} is not available via Telegram. Please use the web app.` }
  }
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
    let voiceTranscript = ""

    // Look up user by telegram chat ID
    const user = await prisma.user.findFirst({ where: { telegramChatId: String(chatId) } })
    if (!user) {
      await sendTelegramMessage(chatId, "⚠️ Your Telegram account is not linked to Injaz. Please set your Telegram Chat ID in Settings.")
      return NextResponse.json({ ok: true })
    }

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
        const transcribeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const result = await transcribeModel.generateContent([
          { inlineData: { mimeType: "audio/ogg", data: base64Audio } },
          { text: "Transcribe this audio exactly. Return only the transcription text. If Arabic, translate to English." },
        ])
        voiceTranscript = result.response.text().trim()
        userText = voiceTranscript
        await sendTelegramMessage(chatId, `🎤 _${voiceTranscript}_`)
      }
    }

    if (!userText) {
      return NextResponse.json({ ok: true })
    }

    // Build system prompt for Telegram — bias toward creating draft payments from voice
    const telegramPrompt = DEFAULT_SYSTEM_PROMPT + `\n\nYou are responding via Telegram. Keep responses concise and use Markdown formatting.
IMPORTANT: When the user sends a voice note describing a payment or expense or income, ALWAYS use the createDraftPayment function to create a draft payment. Include the voice transcript in the voiceTranscript field. Draft payments will be reviewed and confirmed by the user in the app.
If the message describes paying someone, buying something, receiving money, invoices, or any financial transaction — create a draft payment.`

    // Add voice context if from voice
    const messageToSend = voiceTranscript
      ? `[Voice message transcription]: "${voiceTranscript}"\n\nPlease process this voice note and create appropriate draft payment(s).`
      : userText

    const model = getChatModel(telegramPrompt)
    const chat = model.startChat()
    const result = await chat.sendMessage(messageToSend)
    const response = result.response
    const candidates = response.candidates || []
    const parts = candidates[0]?.content?.parts || []

    // Check for function calls
    const functionCalls = parts.filter((p: any) => p.functionCall) as FunctionCallPart[]

    if (functionCalls.length > 0) {
      const toolResults: any[] = []
      for (const fc of functionCalls) {
        // Inject voice transcript into draft payment args
        const fnArgs = { ...fc.functionCall.args } as any
        if (fc.functionCall.name === "createDraftPayment" && voiceTranscript && !fnArgs.voiceTranscript) {
          fnArgs.voiceTranscript = voiceTranscript
        }
        const fnResult = await executeTool(fc.functionCall.name, fnArgs, user.organizationId, user.id)
        toolResults.push({ functionResponse: { name: fc.functionCall.name, response: fnResult } })
      }

      // Send function results back to get natural language summary
      const followUp = await chat.sendMessage(toolResults.map(tr => ({ functionResponse: tr.functionResponse })))
      const finalText = followUp.response.text()
      await sendTelegramMessage(chatId, finalText)
    } else {
      await sendTelegramMessage(chatId, response.text())
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    return NextResponse.json({ ok: true })
  }
}
