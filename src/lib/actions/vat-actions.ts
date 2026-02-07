"use server"

import prisma from "@/lib/prisma"

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getVatLiabilities(filters?: { status?: string }) {
  const where: any = {}
  if (filters?.status) where.status = filters.status
  return prisma.vatLiability.findMany({
    where,
    include: { payments: true },
    orderBy: { dueDate: "desc" },
  })
}

export async function getVatLiabilityById(id: string) {
  return prisma.vatLiability.findUnique({
    where: { id },
    include: { payments: { include: { party: true } } },
  })
}

export async function createVatLiability(data: {
  month: string
  collectedVat: number
  deductibleVat: number
  netVatPayable: number
  dueDate: Date
}) {
  return prisma.vatLiability.create({ data: data as any })
}

export async function updateVatLiability(id: string, data: {
  collectedVat?: number
  deductibleVat?: number
  netVatPayable?: number
  status?: string
  paidDate?: Date | null
}) {
  return prisma.vatLiability.update({ where: { id }, data: data as any })
}

export async function deleteVatLiability(id: string) {
  return prisma.vatLiability.delete({ where: { id } })
}
