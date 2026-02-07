"use server"

import prisma from "@/lib/prisma"

export async function syncUserFromFirebase(firebaseUser: {
  uid: string
  email: string
  displayName?: string | null
}) {
  const ADMIN_UIDS = [
    "CwiLoJz05afRtcL0QuZN2fhmx0s1",
    "7esbWimnRpYEF0PpajkhafQmQlg2",
    "p4g86ngGCkfb9ryk3R707CWKPIs2",
  ]

  let org = await prisma.organization.findFirst()
  if (!org) {
    org = await prisma.organization.create({
      data: { id: "goldinkollar-main", name: "Goldin Kollar", currency: "EGP" },
    })
  }

  const isAdmin = ADMIN_UIDS.includes(firebaseUser.uid)

  const user = await prisma.user.upsert({
    where: { id: firebaseUser.uid },
    update: {
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
    },
    create: {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
      role: isAdmin ? "Admin" : "Employee",
      approvalStatus: isAdmin ? "approved" : "pending",
      organizationId: org.id,
    },
    include: { organization: true },
  })

  return user
}

export async function getAllUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, include: { organization: true } })
}

export async function updateUserRole(userId: string, role: string) {
  return prisma.user.update({ where: { id: userId }, data: { role } })
}

export async function updateUserApproval(userId: string, status: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { approvalStatus: status },
  })
}

export async function updateUserProfile(userId: string, data: {
  name?: string
  phone?: string
}) {
  return prisma.user.update({ where: { id: userId }, data })
}
