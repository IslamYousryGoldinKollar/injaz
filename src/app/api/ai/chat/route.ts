import { NextRequest, NextResponse } from "next/server"
import { getChatModel, DEFAULT_SYSTEM_PROMPT } from "@/lib/ai"
import prisma from "@/lib/prisma"
import { FunctionCallPart } from "@google/generative-ai"

/* eslint-disable @typescript-eslint/no-explicit-any */
async function executeTool(name: string, args: Record<string, any>, orgId: string, userId: string): Promise<any> {
  switch (name) {
    case "createPayment": {
      let party = await prisma.party.findFirst({
        where: { organizationId: orgId, name: { contains: args.partyName, mode: "insensitive" } },
      })
      if (!party) {
        party = await prisma.party.create({
          data: { organizationId: orgId, name: args.partyName, type: args.direction === "INBOUND" ? "CLIENT" : "VENDOR" } as any,
        })
      }
      const count = await prisma.payment.count({ where: { organizationId: orgId } })
      const prefix = args.direction === "INBOUND" ? "RCV" : "PAY"
      const payment = await prisma.payment.create({
        data: {
          organizationId: orgId,
          number: `${prefix}-${String(count + 1).padStart(4, "0")}`,
          direction: args.direction,
          partyId: party.id,
          plannedDate: args.date ? new Date(args.date) : new Date(),
          expectedAmount: args.amount,
          description: args.description || "",
          createdById: userId,
        } as any,
      })
      return { success: true, message: `Payment ${payment.number} created: ${args.amount} EGP ${args.direction === "INBOUND" ? "from" : "to"} ${party.name}` }
    }
    case "createTask": {
      let projectId: string | undefined
      if (args.projectName) {
        const project = await prisma.project.findFirst({ where: { name: { contains: args.projectName, mode: "insensitive" } } })
        projectId = project?.id
      }
      let assigneeId: string | undefined
      if (args.assigneeName) {
        const user = await prisma.user.findFirst({ where: { name: { contains: args.assigneeName, mode: "insensitive" } } })
        assigneeId = user?.id
      }
      const task = await prisma.task.create({
        data: {
          title: args.title, description: args.description, projectId, assigneeId,
          priority: args.priority || "Medium",
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
          createdById: userId,
        } as any,
      })
      return { success: true, message: `Task "${task.title}" created${projectId ? " (linked to project)" : ""}${assigneeId ? " and assigned" : ""}` }
    }
    case "lookupFinancials": {
      if (args.type === "summary") {
        const [inbound, outbound] = await Promise.all([
          prisma.payment.aggregate({ where: { organizationId: orgId, direction: "INBOUND", status: "COMPLETED" }, _sum: { actualAmount: true } }),
          prisma.payment.aggregate({ where: { organizationId: orgId, direction: "OUTBOUND", status: "COMPLETED" }, _sum: { actualAmount: true } }),
        ])
        return { revenue: Number(inbound._sum.actualAmount || 0), expenses: Number(outbound._sum.actualAmount || 0), netProfit: Number(inbound._sum.actualAmount || 0) - Number(outbound._sum.actualAmount || 0) }
      }
      if (args.type === "recent_payments") {
        const payments = await prisma.payment.findMany({
          where: { organizationId: orgId }, include: { party: { select: { name: true } } },
          orderBy: { createdAt: "desc" }, take: 10,
        })
        return { payments: payments.map((p: any) => ({ number: p.number, direction: p.direction, amount: Number(p.expectedAmount), party: p.party.name, status: p.status })) }
      }
      return { message: "Use type: summary or recent_payments" }
    }
    case "lookupParty": {
      const parties = await prisma.party.findMany({
        where: { organizationId: orgId, name: { contains: args.name, mode: "insensitive" }, ...(args.type ? { type: args.type as any } : {}) },
        take: 5,
      })
      return { parties: parties.map((p: any) => ({ name: p.name, type: p.type, email: p.email, phone: p.phone })) }
    }
    case "createParty": {
      const party = await prisma.party.create({
        data: { organizationId: orgId, name: args.name, type: args.type, email: args.email, phone: args.phone } as any,
      })
      return { success: true, message: `${party.type} "${party.name}" created` }
    }
    case "listProjects": {
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId }, include: { _count: { select: { tasks: true } } },
        orderBy: { createdAt: "desc" }, take: 20,
      })
      return { projects: projects.map((p: any) => ({ name: p.name, status: p.status, tasks: p._count.tasks })) }
    }
    case "listTasks": {
      const tasks = await prisma.task.findMany({
        where: { ...(args.status ? { status: args.status } : {}) },
        include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
        orderBy: { createdAt: "desc" }, take: 20,
      })
      return { tasks: tasks.map((t: any) => ({ title: t.title, status: t.status, priority: t.priority, project: t.project?.name, assignee: t.assignee?.name })) }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userId, orgId } = await req.json()
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Missing userId or orgId" }, { status: 400 })
    }

    const aiSettings = await prisma.systemSetting.findUnique({ where: { id: "ai_settings" } })
    const customPrompt = (aiSettings?.value as any)?.systemPrompt || ""
    const systemPrompt = DEFAULT_SYSTEM_PROMPT + (customPrompt ? `\n\nAdditional context:\n${customPrompt}` : "")

    const model = getChatModel(systemPrompt)
    const chat = model.startChat({
      history: messages.slice(0, -1).map((m: any) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content }],
      })),
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response
    const candidates = response.candidates || []
    const parts = candidates[0]?.content?.parts || []

    // Check for function calls
    const functionCalls = parts.filter((p: any) => p.functionCall) as FunctionCallPart[]

    if (functionCalls.length > 0) {
      const toolResults: any[] = []
      for (const fc of functionCalls) {
        const fnResult = await executeTool(fc.functionCall.name, fc.functionCall.args as any, orgId, userId)
        toolResults.push({ functionResponse: { name: fc.functionCall.name, response: fnResult } })
      }

      // Send function results back to get natural language summary
      const followUp = await chat.sendMessage(toolResults.map(tr => ({ functionResponse: tr.functionResponse })))
      const finalText = followUp.response.text()

      return NextResponse.json({
        content: finalText,
        toolResults: toolResults.map(tr => tr.functionResponse),
      })
    }

    return NextResponse.json({ content: response.text() })
  } catch (error: any) {
    console.error("AI chat error:", error)
    return NextResponse.json({ error: "AI request failed", details: error.message }, { status: 500 })
  }
}
