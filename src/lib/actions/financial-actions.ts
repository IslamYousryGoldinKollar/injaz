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
  try {
    return await prisma.payment.findMany({
      where: {
        organizationId: orgId,
        isDraft: false,
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
  } catch (error) {
    console.error("[getPayments] DB error:", error)
    return []
  }
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

export async function getNextDraftNumber(orgId: string) {
  const count = await prisma.payment.count({
    where: { organizationId: orgId, isDraft: true },
  })
  return `DRF-${String(count + 1).padStart(4, "0")}`
}

// ============================================================================
// DRAFT PAYMENTS (same Payment table, isDraft = true)
// ============================================================================

export async function getDraftPayments(orgId: string) {
  try {
    return await prisma.payment.findMany({
      where: { organizationId: orgId, isDraft: true },
      include: {
        party: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("[getDraftPayments] DB error:", error)
    return []
  }
}

export async function createDraftPayment(data: {
  organizationId: string
  number: string
  direction: Direction
  partyId?: string
  categoryId?: string
  projectId?: string
  plannedDate?: Date
  expectedAmount: number
  currency?: Currency
  method?: PaymentMethod
  description?: string
  voiceTranscript?: string
  notes?: string
  createdById: string
}) {
  return prisma.payment.create({
    data: {
      ...data,
      plannedDate: data.plannedDate || new Date(),
      isDraft: true,
      status: "PLANNED" as PaymentStatus,
    } as never,
  })
}

export async function updateDraftPayment(id: string, data: {
  direction?: Direction
  partyId?: string | null
  categoryId?: string | null
  projectId?: string | null
  plannedDate?: Date
  expectedAmount?: number
  method?: PaymentMethod
  description?: string
  notes?: string
}) {
  return prisma.payment.update({ where: { id }, data: data as never })
}

export async function confirmDraftPayment(id: string, data: {
  direction?: Direction
  status?: PaymentStatus
  partyId: string
  categoryId?: string | null
  projectId?: string | null
  plannedDate?: Date
  actualDate?: Date
  expectedAmount?: number
  actualAmount?: number
  method?: PaymentMethod
  description?: string
  notes?: string
}) {
  return prisma.payment.update({
    where: { id },
    data: {
      ...data,
      isDraft: false,
      status: data.status || ("PLANNED" as PaymentStatus),
    } as never,
  })
}

export async function getFinancialSummary(orgId: string) {
  try {
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
  } catch (error) {
    console.error("[getFinancialSummary] DB error:", error)
    return { revenue: 0, expenses: 0, netProfit: 0 }
  }
}

export async function getCategories(orgId: string, type?: Direction) {
  try {
    return await prisma.category.findMany({
      where: { organizationId: orgId, ...(type ? { type } : {}) },
      orderBy: { name: "asc" },
    })
  } catch (error) {
    console.error("[getCategories] DB error:", error)
    return []
  }
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
