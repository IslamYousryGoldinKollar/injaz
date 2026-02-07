"use server"

import prisma from "@/lib/prisma"

export async function getConversations(userId: string, limit = 20) {
  return prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { _count: { select: { messages: true } } },
  })
}

export async function getConversationById(id: string) {
  return prisma.aiConversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  })
}

export async function createConversation(data: { userId: string; title?: string }) {
  return prisma.aiConversation.create({ data })
}

export async function addMessage(data: {
  conversationId: string
  role: string
  content: string
  functionCall?: unknown
  functionResult?: unknown
}) {
  const msg = await prisma.aiMessage.create({ data: data as never })
  // Update conversation timestamp
  await prisma.aiConversation.update({
    where: { id: data.conversationId },
    data: { updatedAt: new Date() },
  })
  return msg
}

export async function updateConversationTitle(id: string, title: string) {
  return prisma.aiConversation.update({ where: { id }, data: { title } })
}

export async function deleteConversation(id: string) {
  await prisma.aiMessage.deleteMany({ where: { conversationId: id } })
  return prisma.aiConversation.delete({ where: { id } })
}
