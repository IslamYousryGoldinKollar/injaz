"use server"

import prisma from "@/lib/prisma"

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getDocuments(organizationId: string, type?: string) {
  return prisma.document.findMany({
    where: {
      organizationId,
      ...(type ? { type: type as any } : {}),
    },
    include: { party: true, project: true, lineItems: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      party: true,
      project: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      allocations: { include: { payment: true } },
      createdBy: true,
    },
  })
}

export async function getNextDocumentNumber(organizationId: string, type: string) {
  const prefix = type === "QUOTATION" ? "QT" : type === "INVOICE" ? "INV" : type === "PURCHASE_ORDER" ? "PO" : "VB"
  const count = await prisma.document.count({
    where: { organizationId, type: type as any },
  })
  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}

export async function createDocument(data: {
  organizationId: string
  type: string
  direction: string
  partyId: string
  projectId?: string
  issueDate: Date
  dueDate?: Date
  createdById: string
  notes?: string
  lineItems: { description: string; quantity: number; unitPrice: number }[]
  vatRate?: number
  incomeTaxRate?: number
}) {
  const number = await getNextDocumentNumber(data.organizationId, data.type)

  const subtotal = data.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const vatRate = data.vatRate ?? 0
  const vatAmount = subtotal * vatRate
  const incomeTaxRate = data.incomeTaxRate ?? 0
  const incomeTaxAmount = subtotal * incomeTaxRate
  const grossAmount = subtotal + vatAmount
  const netAmount = grossAmount - incomeTaxAmount

  return prisma.document.create({
    data: {
      organizationId: data.organizationId,
      number,
      type: data.type as any,
      direction: data.direction as any,
      status: "DRAFT",
      partyId: data.partyId,
      projectId: data.projectId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subtotal,
      vatRate,
      vatAmount,
      incomeTaxRate,
      incomeTaxAmount,
      grossAmount,
      netAmount,
      remainingAmount: netAmount,
      createdById: data.createdById,
      notes: data.notes,
      lineItems: {
        create: data.lineItems.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          vatAmount: item.quantity * item.unitPrice * vatRate,
          sortOrder: i,
        })),
      },
    },
    include: { lineItems: true, party: true },
  })
}

export async function updateDocumentStatus(id: string, status: string) {
  return prisma.document.update({
    where: { id },
    data: { status: status as any },
  })
}

export async function deleteDocument(id: string) {
  await prisma.documentLineItem.deleteMany({ where: { documentId: id } })
  return prisma.document.delete({ where: { id } })
}

export async function getDocumentStats(organizationId: string) {
  const [quotations, invoices, purchaseOrders, vendorBills] = await Promise.all([
    prisma.document.count({ where: { organizationId, type: "QUOTATION" } }),
    prisma.document.count({ where: { organizationId, type: "INVOICE" } }),
    prisma.document.count({ where: { organizationId, type: "PURCHASE_ORDER" } }),
    prisma.document.count({ where: { organizationId, type: "VENDOR_BILL" } }),
  ])
  return { quotations, invoices, purchaseOrders, vendorBills, total: quotations + invoices + purchaseOrders + vendorBills }
}
