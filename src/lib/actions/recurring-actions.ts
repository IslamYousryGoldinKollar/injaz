"use server"

import prisma from "@/lib/prisma"

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getRecurringExpenses(filters?: { isActive?: boolean }) {
  const where: any = {}
  if (filters?.isActive !== undefined) where.isActive = filters.isActive
  return prisma.recurringExpense.findMany({
    where,
    orderBy: { nextDueDate: "asc" },
  })
}

export async function getRecurringExpenseById(id: string) {
  return prisma.recurringExpense.findUnique({ where: { id } })
}

export async function createRecurringExpense(data: {
  name: string
  vendorName: string
  category: string
  amount: number
  frequency: string
  startDate: Date
  endDate?: Date
  nextDueDate: Date
}) {
  return prisma.recurringExpense.create({ data: data as any })
}

export async function updateRecurringExpense(id: string, data: {
  name?: string
  vendorName?: string
  category?: string
  amount?: number
  frequency?: string
  startDate?: Date
  endDate?: Date | null
  nextDueDate?: Date
  isActive?: boolean
}) {
  return prisma.recurringExpense.update({ where: { id }, data: data as any })
}

export async function deleteRecurringExpense(id: string) {
  return prisma.recurringExpense.delete({ where: { id } })
}
