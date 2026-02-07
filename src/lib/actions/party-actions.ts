"use server"

import prisma from "@/lib/prisma"
import type { PartyType } from "@prisma/client"

export async function getParties(orgId: string, type?: PartyType) {
  return prisma.party.findMany({
    where: { organizationId: orgId, ...(type ? { type } : {}) },
    orderBy: { name: "asc" },
  })
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
      documents: { orderBy: { createdAt: "desc" }, take: 10 },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
      projects: { orderBy: { createdAt: "desc" } },
    },
  })
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
  const [clients, vendors, employees] = await Promise.all([
    prisma.party.count({ where: { organizationId: orgId, type: "CLIENT" } }),
    prisma.party.count({ where: { organizationId: orgId, type: "VENDOR" } }),
    prisma.party.count({ where: { organizationId: orgId, type: "EMPLOYEE" } }),
  ])
  return { clients, vendors, employees, total: clients + vendors + employees }
}
