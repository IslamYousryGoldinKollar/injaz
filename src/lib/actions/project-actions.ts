"use server"

import prisma from "@/lib/prisma"
import type { ProjectStatus } from "@prisma/client"

export async function getProjects(orgId: string, status?: ProjectStatus) {
  return prisma.project.findMany({
    where: { organizationId: orgId, ...(status ? { status } : {}) },
    include: {
      clientParty: { select: { id: true, name: true } },
      _count: { select: { tasks: true, payments: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      clientParty: true,
      tasks: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { plannedDate: "desc" }, take: 20, include: { party: { select: { name: true } } } },
      documents: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  })
}

export async function createProject(data: {
  organizationId: string
  name: string
  clientPartyId?: string
  color?: string
  budget?: number
  description?: string
}) {
  return prisma.project.create({ data })
}

export async function updateProject(id: string, data: {
  name?: string
  clientPartyId?: string | null
  color?: string
  status?: ProjectStatus
  budget?: number
  description?: string
}) {
  return prisma.project.update({ where: { id }, data })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}

export async function getProjectStats(orgId: string) {
  const [active, completed, onHold] = await Promise.all([
    prisma.project.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.project.count({ where: { organizationId: orgId, status: "COMPLETED" } }),
    prisma.project.count({ where: { organizationId: orgId, status: "ON_HOLD" } }),
  ])
  return { active, completed, onHold, total: active + completed + onHold }
}
