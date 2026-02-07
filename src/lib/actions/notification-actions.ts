"use server"

import prisma from "@/lib/prisma"

export async function getNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

export async function markAsRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  })
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
}

export async function createNotification(data: {
  userId: string
  message: string
  link: string
}) {
  return prisma.notification.create({ data })
}

export async function deleteNotification(id: string) {
  return prisma.notification.delete({ where: { id } })
}
