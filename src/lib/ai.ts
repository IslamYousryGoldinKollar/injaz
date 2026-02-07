import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "")

export function getChatModel(systemPrompt: string) {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  })
}

export const DEFAULT_SYSTEM_PROMPT = `You are Injaz AI, an intelligent business assistant for a small team management platform.
You help with:
- Financial management (payments, invoices, salaries, expenses)
- Project management (projects, tasks, milestones)
- Vendor and client management (parties)
- Employee management
- Tax and VAT calculations
- Day planning and task organization

When the user asks you to perform an action, use the available function calls.
When the user asks a question, provide a clear, concise answer.
Always respond in English. Be professional but friendly.
Format numbers as currency when discussing money (EGP or USD).
When you create something, confirm what was created.
Keep responses concise - no more than 2-3 paragraphs unless detailed info is requested.`

// Using plain objects to avoid SDK type issues with enums
/* eslint-disable @typescript-eslint/no-explicit-any */
const TOOL_DECLARATIONS: any[] = [
  {
    name: "createPayment",
    description: "Create a new payment. direction must be INBOUND (money received) or OUTBOUND (money paid out).",
    parameters: {
      type: "OBJECT",
      properties: {
        direction: { type: "STRING", description: "INBOUND or OUTBOUND" },
        partyName: { type: "STRING", description: "Name of the vendor or client" },
        amount: { type: "NUMBER", description: "Payment amount" },
        description: { type: "STRING", description: "Payment description" },
        category: { type: "STRING", description: "Payment category" },
        date: { type: "STRING", description: "Payment date YYYY-MM-DD" },
      },
      required: ["direction", "partyName", "amount"],
    },
  },
  {
    name: "createTask",
    description: "Create a new task, optionally linked to a project",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Task title" },
        description: { type: "STRING", description: "Task description" },
        projectName: { type: "STRING", description: "Project name to link to" },
        assigneeName: { type: "STRING", description: "Person to assign to" },
        priority: { type: "STRING", description: "Low, Medium, High, or Urgent" },
        dueDate: { type: "STRING", description: "Due date YYYY-MM-DD" },
      },
      required: ["title"],
    },
  },
  {
    name: "lookupFinancials",
    description: "Look up financial info. type: summary, recent_payments, or party_balance",
    parameters: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", description: "summary, recent_payments, or party_balance" },
        partyName: { type: "STRING", description: "Party name for balance lookup" },
      },
      required: ["type"],
    },
  },
  {
    name: "lookupParty",
    description: "Search for a vendor, client, or employee by name",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Name to search for" },
        type: { type: "STRING", description: "CLIENT, VENDOR, or EMPLOYEE" },
      },
      required: ["name"],
    },
  },
  {
    name: "createParty",
    description: "Create a new vendor, client, or employee",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Party name" },
        type: { type: "STRING", description: "CLIENT, VENDOR, or EMPLOYEE" },
        email: { type: "STRING", description: "Email address" },
        phone: { type: "STRING", description: "Phone number" },
      },
      required: ["name", "type"],
    },
  },
  {
    name: "listProjects",
    description: "List all projects with their status and task counts",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "listTasks",
    description: "List tasks, optionally filtered",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "Filter by status" },
        assigneeName: { type: "STRING", description: "Filter by assignee name" },
      },
    },
  },
  {
    name: "createDocument",
    description: "Create a quotation, invoice, purchase order, or vendor bill with line items",
    parameters: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", description: "QUOTATION, INVOICE, PURCHASE_ORDER, or VENDOR_BILL" },
        partyName: { type: "STRING", description: "Client or vendor name" },
        projectName: { type: "STRING", description: "Project to link to" },
        lineItems: { type: "STRING", description: "JSON array of {description, quantity, unitPrice}" },
        vatRate: { type: "NUMBER", description: "VAT rate as decimal, e.g. 0.14" },
        notes: { type: "STRING", description: "Notes" },
      },
      required: ["type", "partyName", "lineItems"],
    },
  },
  {
    name: "getDashboard",
    description: "Get dashboard stats: total revenue, expenses, net profit, party count, project count",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "createDraftPayment",
    description: "Create a draft payment from a voice note or manual input. Draft payments are saved to the Payment table but flagged as drafts for review. Use this when the user describes a payment via voice or wants to stage a payment for review. The user can later edit, complete missing info, and confirm it in Draft Payments.",
    parameters: {
      type: "OBJECT",
      properties: {
        direction: { type: "STRING", description: "INBOUND (money received) or OUTBOUND (money paid out)" },
        partyName: { type: "STRING", description: "Name of the vendor or client (can be approximate from voice)" },
        amount: { type: "NUMBER", description: "Payment amount" },
        description: { type: "STRING", description: "Payment description" },
        category: { type: "STRING", description: "Payment category" },
        date: { type: "STRING", description: "Payment date YYYY-MM-DD" },
        voiceTranscript: { type: "STRING", description: "Original voice transcription text" },
      },
      required: ["direction", "amount"],
    },
  },
]
