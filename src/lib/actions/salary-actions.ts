"use server"

import prisma from "@/lib/prisma"

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getSalaries(filters?: { userId?: string; status?: string; month?: string }) {
  const where: any = {}
  if (filters?.userId) where.userId = filters.userId
  if (filters?.status) where.status = filters.status
  if (filters?.month) where.month = filters.month
  return prisma.salary.findMany({
    where,
    include: { user: true, payments: true },
    orderBy: { scheduledDate: "desc" },
  })
}

export async function getSalaryById(id: string) {
  return prisma.salary.findUnique({
    where: { id },
    include: { user: true, payments: { include: { party: true } } },
  })
}

export async function createSalary(data: {
  userId: string
  month: string
  grossAmount: number
  deductions?: any
  netAmount: number
  scheduledDate: Date
  deferredUntil?: Date
  deferralReason?: string
}) {
  return prisma.salary.create({ data })
}

export async function updateSalary(id: string, data: {
  grossAmount?: number
  deductions?: any
  netAmount?: number
  status?: string
  scheduledDate?: Date
  deferredUntil?: Date | null
  deferralReason?: string | null
  paidAmount?: number
}) {
  return prisma.salary.update({ where: { id }, data: data as any })
}

export async function deleteSalary(id: string) {
  return prisma.salary.delete({ where: { id } })
}

export async function getSalaryStats(filters?: { month?: string }) {
  const where: any = {}
  if (filters?.month) where.month = filters.month
  const salaries = await prisma.salary.findMany({ where })
  const total = salaries.reduce((s, sal) => s + Number(sal.grossAmount), 0)
  const paid = salaries.filter(s => s.status === "PAID").reduce((s, sal) => s + Number(sal.netAmount), 0)
  const pending = salaries.filter(s => ["SCHEDULED", "DEFERRED"].includes(s.status)).reduce((s, sal) => s + Number(sal.netAmount), 0)
  return { total, paid, pending, count: salaries.length }
}
