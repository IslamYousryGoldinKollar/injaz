"use server"

import prisma from "@/lib/prisma"
import type { PartyType } from "@prisma/client"

export async function getParties(orgId: string, type?: PartyType) {
  try {
    return await prisma.party.findMany({
      where: { organizationId: orgId, ...(type ? { type } : {}) },
      orderBy: { name: "asc" },
    })
  } catch (error) {
    console.error("[getParties] DB error:", error)
    return []
  }
}

export async function searchParties(orgId: string, query: string, type?: PartyType) {
  return prisma.party.findMany({
    where: {
      organizationId: orgId,
      ...(type ? { type } : {}),
      name: { contains: query, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: 20,
  })
}

export async function getPartyById(id: string) {
  return prisma.party.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { createdAt: "desc" }, take: 20 },
      payments: { orderBy: { plannedDate: "desc" }, take: 50 },
      projects: { orderBy: { createdAt: "desc" } },
    },
  })
}

export async function getPartyBalance(partyId: string) {
  try {
    const payments = await prisma.payment.findMany({
      where: { partyId, isDraft: false },
      select: {
        direction: true, status: true,
        grossAmount: true, subtotal: true, vatAmount: true,
        incomeTaxAmount: true, netBankAmount: true,
        expectedAmount: true, actualAmount: true,
      },
    })
    const completed = payments.filter(p => p.status === "COMPLETED")
    const planned = payments.filter(p => p.status === "PLANNED" || p.status === "PENDING")

    const sum = (arr: typeof payments, field: keyof typeof payments[0]) =>
      arr.reduce((s, p) => s + Number(p[field] || 0), 0)

    const inCompleted = completed.filter(p => p.direction === "INBOUND")
    const outCompleted = completed.filter(p => p.direction === "OUTBOUND")

    const totalInvoiced = sum(inCompleted, "grossAmount") || sum(inCompleted, "expectedAmount")
    const totalPaid = sum(outCompleted, "grossAmount") || sum(outCompleted, "expectedAmount")
    const vatCollected = sum(inCompleted, "vatAmount")
    const vatPaid = sum(outCompleted, "vatAmount")
    const taxDeducted = sum(inCompleted, "incomeTaxAmount") + sum(outCompleted, "incomeTaxAmount")
    const bankIn = sum(inCompleted, "netBankAmount") || totalInvoiced
    const bankOut = sum(outCompleted, "netBankAmount") || totalPaid
    const plannedIn = sum(planned.filter(p => p.direction === "INBOUND"), "grossAmount") || sum(planned.filter(p => p.direction === "INBOUND"), "expectedAmount")
    const plannedOut = sum(planned.filter(p => p.direction === "OUTBOUND"), "grossAmount") || sum(planned.filter(p => p.direction === "OUTBOUND"), "expectedAmount")

    return {
      totalInvoiced, totalPaid,
      vatCollected, vatPaid, taxDeducted,
      bankIn, bankOut, netBalance: bankIn - bankOut,
      plannedIn, plannedOut,
      completedCount: completed.length,
      plannedCount: planned.length,
    }
  } catch (error) {
    console.error("[getPartyBalance] DB error:", error)
    return {
      totalInvoiced: 0, totalPaid: 0,
      vatCollected: 0, vatPaid: 0, taxDeducted: 0,
      bankIn: 0, bankOut: 0, netBalance: 0,
      plannedIn: 0, plannedOut: 0,
      completedCount: 0, plannedCount: 0,
    }
  }
}

export async function createParty(data: {
  organizationId: string
  type: PartyType
  name: string
  email?: string
  phone?: string
  contactName?: string
  address?: string
  notes?: string
  hasVat?: boolean
  vatRate?: number
  hasIncomeTaxDeduction?: boolean
  incomeTaxRate?: number
  defaultPaymentTermsDays?: number
  bankName?: string
  accountNumber?: string
  iban?: string
}) {
  return prisma.party.create({ data })
}

export async function updateParty(id: string, data: {
  name?: string
  email?: string
  phone?: string
  contactName?: string
  address?: string
  notes?: string
  hasVat?: boolean
  vatRate?: number
  hasIncomeTaxDeduction?: boolean
  incomeTaxRate?: number
  defaultPaymentTermsDays?: number
  bankName?: string
  accountNumber?: string
  iban?: string
}) {
  return prisma.party.update({ where: { id }, data })
}

export async function deleteParty(id: string) {
  return prisma.party.delete({ where: { id } })
}

export async function getPartyStats(orgId: string) {
  try {
    const [clients, vendors, employees] = await Promise.all([
      prisma.party.count({ where: { organizationId: orgId, type: "CLIENT" } }),
      prisma.party.count({ where: { organizationId: orgId, type: "VENDOR" } }),
      prisma.party.count({ where: { organizationId: orgId, type: "EMPLOYEE" } }),
    ])
    return { clients, vendors, employees, total: clients + vendors + employees }
  } catch (error) {
    console.error("[getPartyStats] DB error:", error)
    return { clients: 0, vendors: 0, employees: 0, total: 0 }
  }
}
