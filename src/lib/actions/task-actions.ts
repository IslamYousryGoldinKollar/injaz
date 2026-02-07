"use server"

import prisma from "@/lib/prisma"

export async function getTasks(filters?: {
  projectId?: string
  assigneeId?: string
  status?: string
}) {
  return prisma.task.findMany({
    where: {
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })
}

export async function createTask(data: {
  title: string
  description?: string
  projectId?: string
  assigneeId?: string
  createdById?: string
  priority?: string
  status?: string
  dueDate?: Date
  startDate?: Date
  endDate?: Date
}) {
  return prisma.task.create({ data: data as never })
}

export async function updateTask(id: string, data: {
  title?: string
  description?: string
  projectId?: string | null
  assigneeId?: string | null
  priority?: string
  status?: string
  dueDate?: Date | null
  startDate?: Date | null
  endDate?: Date | null
  subTasks?: unknown
}) {
  return prisma.task.update({ where: { id }, data: data as never })
}

export async function deleteTask(id: string) {
  return prisma.task.delete({ where: { id } })
}

export async function getQuickTasks(userId: string, date: string) {
  return prisma.quickTask.findMany({
    where: { ownerUid: userId, date },
    orderBy: { createdAt: "asc" },
  })
}

export async function createQuickTask(data: {
  ownerUid: string
  title: string
  date: string
  details?: string
}) {
  return prisma.quickTask.create({ data })
}

export async function updateQuickTask(id: string, data: {
  title?: string
  status?: string
  details?: string
}) {
  return prisma.quickTask.update({ where: { id }, data })
}

export async function deleteQuickTask(id: string) {
  return prisma.quickTask.delete({ where: { id } })
}

export async function getDayOrder(userId: string, dateKey: string) {
  return prisma.dayOrder.findUnique({ where: { id: `${userId}_${dateKey}` } })
}

export async function saveDayOrder(userId: string, dateKey: string, orderData: unknown) {
  return prisma.dayOrder.upsert({
    where: { id: `${userId}_${dateKey}` },
    update: { orderData: orderData as never },
    create: { id: `${userId}_${dateKey}`, uid: userId, dateKey, orderData: orderData as never },
  })
}
