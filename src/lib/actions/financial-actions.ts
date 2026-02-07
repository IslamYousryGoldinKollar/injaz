"use server"

import prisma from "@/lib/prisma"
import type { Direction, PaymentStatus, PaymentMethod, Currency } from "@prisma/client"

export async function getPayments(orgId: string, filters?: {
  direction?: Direction
  status?: PaymentStatus
  partyId?: string
  projectId?: string
  categoryId?: string
  from?: Date
  to?: Date
}) {
  return prisma.payment.findMany({
    where: {
      organizationId: orgId,
      ...(filters?.direction ? { direction: filters.direction } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.partyId ? { partyId: filters.partyId } : {}),
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters?.from || filters?.to
        ? {
            plannedDate: {
              ...(filters?.from ? { gte: filters.from } : {}),
              ...(filters?.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: {
      party: { select: { id: true, name: true, type: true } },
      category: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { plannedDate: "desc" },
  })
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      party: true,
      category: true,
      project: { select: { id: true, name: true } },
      allocations: { include: { document: { select: { id: true, number: true, type: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  })
}

export async function createPayment(data: {
  organizationId: string
  number: string
  direction: Direction
  partyId: string
  categoryId?: string
  projectId?: string
  plannedDate: Date
  actualDate?: Date
  expectedAmount: number
  actualAmount?: number
  currency?: Currency
  method?: PaymentMethod
  reference?: string
  description?: string
  status?: PaymentStatus
  notes?: string
  createdById: string
}) {
  return prisma.payment.create({ data: data as never })
}

export async function updatePayment(id: string, data: {
  direction?: Direction
  status?: PaymentStatus
  partyId?: string
  categoryId?: string | null
  projectId?: string | null
  plannedDate?: Date
  actualDate?: Date | null
  expectedAmount?: number
  actualAmount?: number | null
  method?: PaymentMethod
  reference?: string
  description?: string
  notes?: string
}) {
  return prisma.payment.update({ where: { id }, data: data as never })
}

export async function deletePayment(id: string) {
  return prisma.payment.delete({ where: { id } })
}

export async function getNextPaymentNumber(orgId: string, direction: Direction) {
  const count = await prisma.payment.count({
    where: { organizationId: orgId, direction },
  })
  const prefix = direction === "INBOUND" ? "RCV" : "PAY"
  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}

export async function getFinancialSummary(orgId: string) {
  const [inbound, outbound] = await Promise.all([
    prisma.payment.aggregate({
      where: { organizationId: orgId, direction: "INBOUND", status: "COMPLETED" },
      _sum: { actualAmount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId: orgId, direction: "OUTBOUND", status: "COMPLETED" },
      _sum: { actualAmount: true },
    }),
  ])

  const revenue = Number(inbound._sum.actualAmount || 0)
  const expenses = Number(outbound._sum.actualAmount || 0)

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
  }
}

export async function getCategories(orgId: string, type?: Direction) {
  return prisma.category.findMany({
    where: { organizationId: orgId, ...(type ? { type } : {}) },
    orderBy: { name: "asc" },
  })
}

export async function createCategory(data: {
  organizationId: string
  name: string
  type: Direction
  color?: string
}) {
  return prisma.category.create({ data })
}

export async function deleteCategory(id: string) {
  return prisma.category.delete({ where: { id } })
}

export async function getSalaries(userId?: string, month?: string) {
  return prisma.salary.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(month ? { month } : {}),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { scheduledDate: "desc" },
  })
}

export async function createSalary(data: {
  userId: string
  month: string
  grossAmount: number
  netAmount: number
  scheduledDate: Date
  deductions?: unknown
}) {
  return prisma.salary.create({ data: data as never })
}

export async function updateSalary(id: string, data: {
  status?: string
  paidAmount?: number
  deferredUntil?: Date
  deferralReason?: string
}) {
  return prisma.salary.update({ where: { id }, data: data as never })
}

export async function getRecurringExpenses() {
  return prisma.recurringExpense.findMany({
    where: { isActive: true },
    orderBy: { nextDueDate: "asc" },
  })
}

export async function getVatLiabilities() {
  return prisma.vatLiability.findMany({ orderBy: { month: "desc" } })
}

export async function getOwnerLoans(ownerId?: string) {
  return prisma.ownerLoan.findMany({
    where: ownerId ? { ownerId } : {},
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { loanDate: "desc" },
  })
}

// Payment-to-Document Allocation
export async function getAllocationsForPayment(paymentId: string) {
  return prisma.paymentAllocation.findMany({
    where: { paymentId },
    include: { document: { select: { id: true, number: true, type: true, netAmount: true, remainingAmount: true } } },
  })
}

export async function createAllocation(data: {
  paymentId: string
  documentId: string
  amount: number
}) {
  const allocation = await prisma.paymentAllocation.create({ data })
  // Update document paidAmount and remainingAmount
  const allocs = await prisma.paymentAllocation.findMany({ where: { documentId: data.documentId } })
  const totalPaid = allocs.reduce((s, a) => s + Number(a.amount), 0)
  const doc = await prisma.document.findUnique({ where: { id: data.documentId } })
  if (doc) {
    await prisma.document.update({
      where: { id: data.documentId },
      data: {
        paidAmount: totalPaid,
        remainingAmount: Number(doc.netAmount) - totalPaid,
      },
    })
  }
  return allocation
}

export async function deleteAllocation(id: string) {
  const allocation = await prisma.paymentAllocation.findUnique({ where: { id } })
  if (!allocation) return
  await prisma.paymentAllocation.delete({ where: { id } })
  // Recalculate document amounts
  const allocs = await prisma.paymentAllocation.findMany({ where: { documentId: allocation.documentId } })
  const totalPaid = allocs.reduce((s, a) => s + Number(a.amount), 0)
  const doc = await prisma.document.findUnique({ where: { id: allocation.documentId } })
  if (doc) {
    await prisma.document.update({
      where: { id: allocation.documentId },
      data: {
        paidAmount: totalPaid,
        remainingAmount: Number(doc.netAmount) - totalPaid,
      },
    })
  }
}

export async function getUnpaidDocumentsForParty(partyId: string) {
  return prisma.document.findMany({
    where: {
      partyId,
      remainingAmount: { gt: 0 },
      status: { notIn: ["CANCELLED", "DRAFT"] },
    },
    select: { id: true, number: true, type: true, netAmount: true, remainingAmount: true },
    orderBy: { issueDate: "desc" },
  })
}
