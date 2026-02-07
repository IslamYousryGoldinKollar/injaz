"use server"

import prisma from "@/lib/prisma"

export async function getDashboardStats(organizationId: string) {
  const [
    totalInbound,
    totalOutbound,
    completedInbound,
    completedOutbound,
    plannedInbound,
    plannedOutbound,
    partyCount,
    projectCount,
    taskCount,
    tasksDone,
    recentPayments,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { organizationId, direction: "INBOUND" },
      _sum: { expectedAmount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { organizationId, direction: "OUTBOUND" },
      _sum: { expectedAmount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { organizationId, direction: "INBOUND", status: "COMPLETED" },
      _sum: { expectedAmount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId, direction: "OUTBOUND", status: "COMPLETED" },
      _sum: { expectedAmount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId, direction: "INBOUND", status: "PLANNED" },
      _sum: { expectedAmount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId, direction: "OUTBOUND", status: "PLANNED" },
      _sum: { expectedAmount: true },
    }),
    prisma.party.count({ where: { organizationId } }),
    prisma.project.count({ where: { organizationId } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "Done" } }),
    prisma.payment.findMany({
      where: { organizationId },
      orderBy: { plannedDate: "desc" },
      take: 10,
      include: { party: true, category: true, project: true },
    }),
  ])

  return {
    totalRevenue: Number(totalInbound._sum.expectedAmount || 0),
    totalExpenses: Number(totalOutbound._sum.expectedAmount || 0),
    completedRevenue: Number(completedInbound._sum.expectedAmount || 0),
    completedExpenses: Number(completedOutbound._sum.expectedAmount || 0),
    plannedRevenue: Number(plannedInbound._sum.expectedAmount || 0),
    plannedExpenses: Number(plannedOutbound._sum.expectedAmount || 0),
    netProfit: Number(totalInbound._sum.expectedAmount || 0) - Number(totalOutbound._sum.expectedAmount || 0),
    paymentCount: totalInbound._count + totalOutbound._count,
    partyCount,
    projectCount,
    taskCount,
    tasksDone,
    recentPayments,
  }
}

export async function getCategoryBreakdown(organizationId: string) {
  const payments = await prisma.payment.findMany({
    where: { organizationId, categoryId: { not: null } },
    include: { category: true },
  })

  const map = new Map<string, { name: string; type: string; total: number; count: number }>()
  for (const p of payments) {
    if (!p.category) continue
    const key = p.category.id
    const existing = map.get(key) || { name: p.category.name, type: p.category.type, total: 0, count: 0 }
    existing.total += Number(p.expectedAmount)
    existing.count++
    map.set(key, existing)
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

export async function getMonthlyBreakdown(organizationId: string) {
  const payments = await prisma.payment.findMany({
    where: { organizationId },
    select: { plannedDate: true, direction: true, expectedAmount: true },
    orderBy: { plannedDate: "asc" },
  })

  const map = new Map<string, { month: string; income: number; expense: number }>()
  for (const p of payments) {
    const month = p.plannedDate.toISOString().slice(0, 7)
    const existing = map.get(month) || { month, income: 0, expense: 0 }
    if (p.direction === "INBOUND") {
      existing.income += Number(p.expectedAmount)
    } else {
      existing.expense += Number(p.expectedAmount)
    }
    map.set(month, existing)
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export async function getProjectBreakdown(organizationId: string) {
  const projects = await prisma.project.findMany({
    where: { organizationId },
    include: {
      _count: { select: { tasks: true, payments: true } },
      payments: { select: { direction: true, expectedAmount: true } },
    },
  })

  return projects.map((p) => {
    const income = p.payments.filter((pay) => pay.direction === "INBOUND").reduce((s, pay) => s + Number(pay.expectedAmount), 0)
    const expense = p.payments.filter((pay) => pay.direction === "OUTBOUND").reduce((s, pay) => s + Number(pay.expectedAmount), 0)
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      status: p.status,
      taskCount: p._count.tasks,
      paymentCount: p._count.payments,
      income,
      expense,
      profit: income - expense,
    }
  }).sort((a, b) => b.income - a.income)
}

export async function getTopParties(organizationId: string, limit = 10) {
  const parties = await prisma.party.findMany({
    where: { organizationId },
    include: {
      payments: { select: { direction: true, expectedAmount: true } },
      _count: { select: { payments: true, documents: true } },
    },
  })

  return parties.map((p) => {
    const totalVolume = p.payments.reduce((s, pay) => s + Number(pay.expectedAmount), 0)
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      paymentCount: p._count.payments,
      documentCount: p._count.documents,
      totalVolume,
    }
  }).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, limit)
}
