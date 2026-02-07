import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { csv, userId } = await req.json()
    if (!csv || !userId) {
      return NextResponse.json({ error: "csv and userId required" }, { status: 400 })
    }

    // Get or create org
    let org = await prisma.organization.findFirst()
    if (!org) {
      org = await prisma.organization.create({
        data: { id: "injaz-main", name: "Injaz", currency: "EGP" },
      })
    }

    const lines = csv.trim().split("\n")
    const header = lines[0].split(",").map((h: string) => h.trim())
    const rows = lines.slice(1).map((line: string) => {
      const values = line.split(",").map((v: string) => v.trim())
      const row: Record<string, string> = {}
      header.forEach((h: string, i: number) => { row[h] = values[i] || "" })
      return row
    })

    // Collect unique parties, categories, and projects
    const partyNames = new Set<string>()
    const categoryNames = new Map<string, string>() // name -> direction
    const projectNames = new Set<string>()

    for (const row of rows) {
      if (row.Party) partyNames.add(row.Party)
      if (row.Category) {
        const dir = row.Type === "income" ? "INBOUND" : "OUTBOUND"
        categoryNames.set(row.Category, dir)
      }
      if (row.Project) projectNames.add(row.Project)
    }

    // Upsert parties
    const partyMap = new Map<string, string>()
    for (const name of partyNames) {
      const existing = await prisma.party.findFirst({
        where: { organizationId: org.id, name },
      })
      if (existing) {
        partyMap.set(name, existing.id)
      } else {
        const party = await prisma.party.create({
          data: {
            organizationId: org.id,
            name,
            type: "VENDOR",
          },
        })
        partyMap.set(name, party.id)
      }
    }

    // Figure out which parties are actually clients (they receive income)
    for (const row of rows) {
      if (row.Type === "income" && row.Party) {
        const partyId = partyMap.get(row.Party)
        if (partyId) {
          await prisma.party.update({
            where: { id: partyId },
            data: { type: "CLIENT" },
          })
        }
      }
    }

    // Upsert categories
    const categoryMap = new Map<string, string>()
    for (const [name, dir] of categoryNames) {
      const existing = await prisma.category.findFirst({
        where: { organizationId: org.id, name },
      })
      if (existing) {
        categoryMap.set(name, existing.id)
      } else {
        const cat = await prisma.category.create({
          data: {
            organizationId: org.id,
            name,
            type: dir as "INBOUND" | "OUTBOUND",
          },
        })
        categoryMap.set(name, cat.id)
      }
    }

    // Upsert projects
    const projectMap = new Map<string, string>()
    for (const name of projectNames) {
      if (!name) continue
      const existing = await prisma.project.findFirst({
        where: { organizationId: org.id, name },
      })
      if (existing) {
        projectMap.set(name, existing.id)
      } else {
        const proj = await prisma.project.create({
          data: { organizationId: org.id, name },
        })
        projectMap.set(name, proj.id)
      }
    }

    // Create payments
    let created = 0
    let skipped = 0
    let inCounter = await prisma.payment.count({ where: { organizationId: org.id, direction: "INBOUND" } })
    let outCounter = await prisma.payment.count({ where: { organizationId: org.id, direction: "OUTBOUND" } })

    for (const row of rows) {
      const direction = row.Type === "income" ? "INBOUND" : "OUTBOUND"
      const partyId = partyMap.get(row.Party)
      if (!partyId) { skipped++; continue }

      const amount = parseFloat(row.Amount)
      if (isNaN(amount) || amount === 0) { skipped++; continue }

      let status: "PLANNED" | "COMPLETED" = "PLANNED"
      if (row.Status === "completed") status = "COMPLETED"

      const number = direction === "INBOUND"
        ? `IN-${String(++inCounter).padStart(4, "0")}`
        : `OUT-${String(++outCounter).padStart(4, "0")}`

      const categoryId = row.Category ? categoryMap.get(row.Category) : undefined
      const projectId = row.Project ? projectMap.get(row.Project) : undefined

      try {
        await prisma.payment.create({
          data: {
            organizationId: org.id,
            number,
            direction,
            status,
            partyId,
            categoryId: categoryId || undefined,
            projectId: projectId || undefined,
            plannedDate: new Date(row.Date),
            actualDate: status === "COMPLETED" ? new Date(row.Date) : undefined,
            expectedAmount: amount,
            actualAmount: status === "COMPLETED" ? amount : undefined,
            description: row.Description,
            createdById: userId,
          },
        })
        created++
      } catch (e) {
        console.error("Failed to create payment:", row.Description, e)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        parties: partyMap.size,
        categories: categoryMap.size,
        projects: projectMap.size,
        payments: { created, skipped },
      },
    })
  } catch (error: unknown) {
    console.error("Import error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
