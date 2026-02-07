"use client"

import * as React from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface VoiceRecorderProps {
  onRecorded: (blob: Blob) => void
  className?: string
  disabled?: boolean
}

export function VoiceRecorder({ onRecorded, className, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = React.useState(false)
  const [duration, setDuration] = React.useState(0)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        onRecorded(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch (err) {
      console.error("Microphone access denied:", err)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {recording ? (
        <>
          <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            <span className="text-sm font-mono text-destructive">{formatTime(duration)}</span>
          </div>
          <Button variant="destructive" size="icon" onClick={stopRecording} className="rounded-full">
            <Square className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={startRecording}
          disabled={disabled}
          className="rounded-full"
          type="button"
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

interface TranscriptionButtonProps {
  audioBlob: Blob | null
  onTranscribed: (text: string) => void
  className?: string
}

export function TranscriptionButton({ audioBlob, onTranscribed, className }: TranscriptionButtonProps) {
  const [loading, setLoading] = React.useState(false)

  const transcribe = async () => {
    if (!audioBlob) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob)
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: formData })
      const data = await res.json()
      if (data.text) onTranscribed(data.text)
    } catch (err) {
      console.error("Transcription failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={transcribe} disabled={!audioBlob || loading} variant="secondary" size="sm" className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Transcribe"}
    </Button>
  )
}
