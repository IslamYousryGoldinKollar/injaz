"use server"

import prisma from "@/lib/prisma"

export async function getConversations(userId: string) {
  return prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
}

export async function getConversation(id: string) {
  return prisma.aiConversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })
}

export async function createConversation(userId: string, title?: string) {
  return prisma.aiConversation.create({
    data: { userId, title: title || "New conversation" },
  })
}

export async function addMessage(conversationId: string, data: {
  role: string
  content: string
  functionCall?: unknown
  functionResult?: unknown
}) {
  const message = await prisma.aiMessage.create({
    data: {
      conversationId,
      role: data.role,
      content: data.content,
      functionCall: data.functionCall as never,
      functionResult: data.functionResult as never,
    },
  })
  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })
  return message
}

export async function deleteConversation(id: string) {
  return prisma.aiConversation.delete({ where: { id } })
}

export async function getSystemSettings(key: string) {
  const setting = await prisma.systemSetting.findUnique({ where: { id: key } })
  return setting?.value
}

export async function saveSystemSettings(key: string, value: unknown) {
  return prisma.systemSetting.upsert({
    where: { id: key },
    update: { value: value as never },
    create: { id: key, value: value as never },
  })
}
