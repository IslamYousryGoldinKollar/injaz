"use server"

import prisma from "@/lib/prisma"

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getDrafts(status?: string) {
  try {
    return await prisma.financialDraft.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("[getDrafts] DB error:", error)
    return []
  }
}

export async function createDraft(data: {
  type: string
  source: string
  createdById: string
  partyName?: string
  amount?: number
  direction?: string
  category?: string
  date?: Date
  description?: string
  transcript?: string
  voiceNoteUrl?: string
  documentUrl?: string
  documentName?: string
  confidence?: number
  rawText?: string
}) {
  return prisma.financialDraft.create({
    data: {
      type: data.type as any,
      source: data.source as any,
      createdById: data.createdById,
      partyName: data.partyName,
      amount: data.amount,
      direction: data.direction as any,
      category: data.category,
      date: data.date,
      description: data.description,
      transcript: data.transcript,
      voiceNoteUrl: data.voiceNoteUrl,
      documentUrl: data.documentUrl,
      documentName: data.documentName,
      confidence: data.confidence,
      rawText: data.rawText,
    },
  })
}

export async function updateDraftStatus(id: string, status: string) {
  return prisma.financialDraft.update({
    where: { id },
    data: {
      status: status as any,
      ...(status === "PUSHED" ? { pushedAt: new Date() } : {}),
    },
  })
}

export async function deleteDraft(id: string) {
  return prisma.financialDraft.delete({ where: { id } })
}
