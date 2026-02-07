"use server"

import prisma from "@/lib/prisma"
import type { Direction, PaymentStatus, PaymentMethod, Currency } from "@prisma/client"

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  subtotal?: number
  vatAmount?: number
  vatRate?: number
  incomeTaxAmount?: number
  incomeTaxRate?: number
  grossAmount?: number
  netBankAmount?: number
}) {
  try {
    // Strip undefined values to avoid Prisma issues
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null && v !== "") clean[k] = v
    }
    return await prisma.payment.create({ data: clean as never })
  } catch (error: any) {
    console.error("[createPayment] DB error:", error?.message || error)
    throw new Error(`Payment creation failed: ${error?.message || "Unknown error"}`)
  }
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
  const prefix = direction === "INBOUND" ? "RCV" : "PAY"
  // Find the highest existing number for this prefix to avoid collisions
  const latest = await prisma.payment.findFirst({
    where: { organizationId: orgId, number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  })
  let nextNum = 1
  if (latest?.number) {
    const match = latest.number.match(/(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  return `${prefix}-${String(nextNum).padStart(4, "0")}`
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
    const payments = await prisma.payment.findMany({
      where: { organizationId: orgId, isDraft: false },
      select: {
        direction: true, status: true,
        grossAmount: true, subtotal: true, vatAmount: true,
        incomeTaxAmount: true, netBankAmount: true,
        expectedAmount: true, actualAmount: true,
      },
    })

    const completed = payments.filter(p => p.status === "COMPLETED")
    const planned = payments.filter(p => p.status === "PLANNED" || p.status === "PENDING")

    const inCompleted = completed.filter(p => p.direction === "INBOUND")
    const outCompleted = completed.filter(p => p.direction === "OUTBOUND")
    const inPlanned = planned.filter(p => p.direction === "INBOUND")
    const outPlanned = planned.filter(p => p.direction === "OUTBOUND")

    const sum = (arr: typeof payments, field: keyof typeof payments[0]) =>
      arr.reduce((s, p) => s + Number(p[field] || 0), 0)

    // Gross amounts (100% + 14% VAT = registered invoice total)
    const grossRevenue = sum(inCompleted, "grossAmount") || sum(inCompleted, "expectedAmount")
    const grossExpenses = sum(outCompleted, "grossAmount") || sum(outCompleted, "expectedAmount")

    // VAT tracking
    const vatCollected = sum(inCompleted, "vatAmount")   // VAT we collected from clients (we owe gov)
    const vatPaid = sum(outCompleted, "vatAmount")       // VAT we paid to vendors (deductible)
    const netVatPayable = vatCollected - vatPaid           // Net VAT we owe to government

    // Income tax deduction tracking
    const taxDeductedByClients = sum(inCompleted, "incomeTaxAmount") // 3% clients withheld (our credit with gov)
    const taxWeDeducted = sum(outCompleted, "incomeTaxAmount")       // 3% we withheld from vendors (we owe gov)

    // Bank balance (actual money in/out after deductions)
    const bankIn = sum(inCompleted, "netBankAmount") || sum(inCompleted, "actualAmount") || grossRevenue
    const bankOut = sum(outCompleted, "netBankAmount") || sum(outCompleted, "actualAmount") || grossExpenses
    const bankBalance = bankIn - bankOut

    // Planned (future)
    const plannedIn = sum(inPlanned, "grossAmount") || sum(inPlanned, "expectedAmount")
    const plannedOut = sum(outPlanned, "grossAmount") || sum(outPlanned, "expectedAmount")

    return {
      grossRevenue,
      grossExpenses,
      netProfit: grossRevenue - grossExpenses,
      vatCollected,
      vatPaid,
      netVatPayable,
      taxDeductedByClients,
      taxWeDeducted,
      bankBalance,
      bankIn,
      bankOut,
      plannedIn,
      plannedOut,
      plannedBalance: bankBalance + plannedIn - plannedOut,
      totalPayments: payments.length,
    }
  } catch (error) {
    console.error("[getFinancialSummary] DB error:", error)
    return {
      grossRevenue: 0, grossExpenses: 0, netProfit: 0,
      vatCollected: 0, vatPaid: 0, netVatPayable: 0,
      taxDeductedByClients: 0, taxWeDeducted: 0,
      bankBalance: 0, bankIn: 0, bankOut: 0,
      plannedIn: 0, plannedOut: 0, plannedBalance: 0,
      totalPayments: 0,
    }
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
