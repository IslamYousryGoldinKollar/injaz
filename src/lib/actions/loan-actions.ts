"use server"

import prisma from "@/lib/prisma"

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getLoans(filters?: { status?: string }) {
  try {
    const where: any = {}
    if (filters?.status) where.status = filters.status
    return await prisma.ownerLoan.findMany({
      where,
      include: { owner: true, payments: true },
      orderBy: { loanDate: "desc" },
    })
  } catch (error) {
    console.error("[getLoans] DB error:", error)
    return []
  }
}

export async function getLoanById(id: string) {
  return prisma.ownerLoan.findUnique({
    where: { id },
    include: { owner: true, payments: { include: { party: true } } },
  })
}

export async function createLoan(data: {
  ownerId: string
  ownerName: string
  direction: string
  principalAmount: number
  currentBalance: number
  loanDate: Date
  notes?: string
}) {
  return prisma.ownerLoan.create({ data: data as any })
}

export async function updateLoan(id: string, data: {
  currentBalance?: number
  status?: string
  notes?: string | null
}) {
  return prisma.ownerLoan.update({ where: { id }, data: data as any })
}

export async function deleteLoan(id: string) {
  return prisma.ownerLoan.delete({ where: { id } })
}
