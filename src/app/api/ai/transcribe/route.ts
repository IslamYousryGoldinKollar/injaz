import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as Blob | null

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Use Google Cloud Speech-to-Text via Gemini's audio capabilities
    const { GoogleGenerativeAI } = await import("@google/generative-ai")
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "")
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const base64Audio = buffer.toString("base64")

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/webm",
          data: base64Audio,
        },
      },
      { text: "Transcribe this audio exactly. Return only the transcription text, nothing else. If the audio is in Arabic, translate it to English." },
    ])

    const text = result.response.text().trim()

    return NextResponse.json({ text })
  } catch (error: unknown) {
    console.error("Transcription error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Transcription failed", details: message }, { status: 500 })
  }
}
