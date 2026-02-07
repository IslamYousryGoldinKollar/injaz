"use server"

import prisma from "@/lib/prisma"

export async function globalSearch(orgId: string, query: string) {
  if (!query || query.length < 2) return { parties: [], projects: [], tasks: [], payments: [], documents: [] }

  const [parties, projects, tasks, payments, documents] = await Promise.all([
    prisma.party.findMany({
      where: { organizationId: orgId, name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, type: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, status: true, color: true },
      take: 5,
    }),
    prisma.task.findMany({
      where: { title: { contains: query, mode: "insensitive" } },
      select: { id: true, title: true, status: true, project: { select: { name: true } } },
      take: 5,
    }),
    prisma.payment.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { number: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, number: true, description: true, direction: true, expectedAmount: true },
      take: 5,
    }),
    prisma.document.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { number: { contains: query, mode: "insensitive" } },
          { notes: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, number: true, type: true, notes: true },
      take: 5,
    }),
  ])

  return { parties, projects, tasks, payments, documents }
}
