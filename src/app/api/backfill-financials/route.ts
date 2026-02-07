import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// POST /api/backfill-financials
// Backfills all structured financial fields on existing payments
// and populates VatLiability records from payment data
export async function POST() {
  try {
    // 1. Get all payments with their party data
    const payments = await prisma.payment.findMany({
      include: { party: { select: { hasVat: true, vatRate: true, hasIncomeTaxDeduction: true, incomeTaxRate: true } } },
    })

    let updated = 0
    let skipped = 0

    for (const p of payments) {
      const expectedAmt = Number(p.expectedAmount) || 0
      if (expectedAmt === 0) { skipped++; continue }

      // Determine VAT and tax settings from party or defaults
      const hasVat = p.party?.hasVat ?? false
      const vatRateVal = hasVat ? (Number(p.party?.vatRate) || 0.14) : 0
      const hasTax = p.party?.hasIncomeTaxDeduction ?? false
      const taxRateVal = hasTax ? (Number(p.party?.incomeTaxRate) || 0.03) : 0

      // The expectedAmount IS the gross amount (what was on the invoice)
      const gross = expectedAmt
      const subtotal = vatRateVal > 0 ? Math.round((gross / (1 + vatRateVal)) * 100) / 100 : gross
      const vatAmount = vatRateVal > 0 ? Math.round((gross - subtotal) * 100) / 100 : 0
      const incomeTaxAmount = taxRateVal > 0 ? Math.round(subtotal * taxRateVal * 100) / 100 : 0
      const netBankAmount = Math.round((gross - incomeTaxAmount) * 100) / 100

      await prisma.payment.update({
        where: { id: p.id },
        data: {
          grossAmount: gross,
          subtotal: subtotal,
          vatAmount: vatAmount,
          vatRate: vatRateVal,
          incomeTaxAmount: incomeTaxAmount,
          incomeTaxRate: taxRateVal,
          netBankAmount: netBankAmount,
          // Also set actualAmount to netBankAmount for completed payments if not set
          ...(p.status === "COMPLETED" && (!p.actualAmount || Number(p.actualAmount) === 0)
            ? { actualAmount: netBankAmount }
            : {}),
        },
      })
      updated++
    }

    // 2. Rebuild VatLiability records from completed payments with VAT
    const completedWithVat = await prisma.payment.findMany({
      where: { isDraft: false, status: "COMPLETED", vatAmount: { gt: 0 } },
      select: { direction: true, vatAmount: true, plannedDate: true },
    })

    // Group by month
    const vatByMonth: Record<string, { collected: number; deductible: number }> = {}
    for (const p of completedWithVat) {
      const d = new Date(p.plannedDate)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (!vatByMonth[month]) vatByMonth[month] = { collected: 0, deductible: 0 }
      const amt = Number(p.vatAmount) || 0
      if (p.direction === "INBOUND") {
        vatByMonth[month].collected += amt
      } else {
        vatByMonth[month].deductible += amt
      }
    }

    let vatRecords = 0
    for (const [month, data] of Object.entries(vatByMonth)) {
      const netPayable = Math.round((data.collected - data.deductible) * 100) / 100
      // Parse month to get due date (25th of next month)
      const [y, m] = month.split("-").map(Number)
      const dueDate = new Date(y, m, 25) // month is 0-indexed so m (1-indexed) = next month

      await prisma.vatLiability.upsert({
        where: { month },
        update: {
          collectedVat: Math.round(data.collected * 100) / 100,
          deductibleVat: Math.round(data.deductible * 100) / 100,
          netVatPayable: netPayable,
        },
        create: {
          month,
          collectedVat: Math.round(data.collected * 100) / 100,
          deductibleVat: Math.round(data.deductible * 100) / 100,
          netVatPayable: netPayable,
          dueDate,
          status: "PENDING",
        },
      })
      vatRecords++
    }

    return NextResponse.json({
      success: true,
      payments: { total: payments.length, updated, skipped },
      vatLiabilities: { months: vatRecords, data: vatByMonth },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[backfill-financials] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
