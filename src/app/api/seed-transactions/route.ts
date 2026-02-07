import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================================
// PARTY DEFINITIONS — normalized names, correct types, VAT/tax settings
// ============================================================================
const PARTIES: Record<string, {
  name: string
  type: "CLIENT" | "VENDOR" | "EMPLOYEE" | "OWNER" | "OTHER"
  hasVat: boolean
  vatRate: number
  hasIncomeTaxDeduction: boolean
  incomeTaxRate: number
}> = {
  "eand": {
    name: "e&", type: "CLIENT",
    hasVat: true, vatRate: 0.14,
    hasIncomeTaxDeduction: true, incomeTaxRate: 0.03,
  },
  "Saudi Germany": {
    name: "Saudi Germany Hospital", type: "CLIENT",
    hasVat: true, vatRate: 0.14,
    hasIncomeTaxDeduction: true, incomeTaxRate: 0.03,
  },
  // Other Clients (no VAT, no income tax)
  "Blue Ocean":          { name: "Blue Ocean", type: "CLIENT", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Novo Nordisk":        { name: "Novo Nordisk", type: "CLIENT", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Ray Scale":           { name: "Ray Scale", type: "CLIENT", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Mokhtar":             { name: "Mokhtar", type: "CLIENT", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Mostafa Maher":       { name: "Mostafa Maher", type: "CLIENT", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  // Employees
  "Islam Yossry":        { name: "Islam Yousry", type: "EMPLOYEE", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Abdulrahman Hosni":   { name: "Abdulrahman Hosni", type: "EMPLOYEE", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Sherif":              { name: "Sherif", type: "EMPLOYEE", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  // Vendors
  "Mahmoud Elmasry":     { name: "Mahmoud Elmasry", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Ahmed Hegazy":        { name: "Ahmed Hegazy", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Taha Sabry":          { name: "Taha Sabry", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Onsy":                { name: "Onsy", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Nahla":               { name: "Nahla", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Photographer Abdullah": { name: "Photographer Abdullah", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Eid":                 { name: "Eid", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Ushers":              { name: "Ushers", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Enter Game":          { name: "Enter Game", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "2B":                  { name: "2B", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Bunny":               { name: "Bunny", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Wondershare":         { name: "Wondershare", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Google":              { name: "Google", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Giveaway":            { name: "Giveaway", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Website Provider":    { name: "Website Provider", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Lawyer":              { name: "Lawyer", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Bank":                { name: "Bank", type: "OTHER", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Nespresso":           { name: "Nespresso", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Typeform":            { name: "Typeform", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Mugs Supplier":       { name: "Mugs Supplier", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Claude/Anthropic":    { name: "Claude / Anthropic", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Laser":               { name: "Laser", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Envato":              { name: "Envato", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "CloudConvert":        { name: "CloudConvert", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "DTF":                 { name: "DTF", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Safar Marteen":       { name: "Safar Marteen", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Fotor":               { name: "Fotor", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Notebook Supplier":   { name: "Notebook Supplier", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Box Supplier":        { name: "Box Supplier", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Khetm":               { name: "Khetm", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "IKEA":                { name: "IKEA", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Hedra":               { name: "Hedra", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "7afr":                { name: "7afr", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Hailuo":              { name: "Hailuo", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Kahoot":              { name: "Kahoot", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Topaz Astra":         { name: "Topaz Astra", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
  "Microsoft":           { name: "Microsoft", type: "VENDOR", hasVat: false, vatRate: 0, hasIncomeTaxDeduction: false, incomeTaxRate: 0 },
}

// ============================================================================
// CATEGORY DEFINITIONS — direction-aware, loan categories properly split
// ============================================================================
const CATEGORIES: { name: string; type: "INBOUND" | "OUTBOUND"; color: string }[] = [
  { name: "Client Revenue",          type: "INBOUND",  color: "#10b981" },
  { name: "Loan Received",           type: "INBOUND",  color: "#6366f1" },
  { name: "Production Costs",        type: "OUTBOUND", color: "#f43f5e" },
  { name: "Capital Expenditure",     type: "OUTBOUND", color: "#8b5cf6" },
  { name: "Salaries & Wages",        type: "OUTBOUND", color: "#f59e0b" },
  { name: "Travel & Transport",      type: "OUTBOUND", color: "#06b6d4" },
  { name: "Equipment & Rentals",     type: "OUTBOUND", color: "#ec4899" },
  { name: "Software & Subscriptions",type: "OUTBOUND", color: "#3b82f6" },
  { name: "Professional Services",   type: "OUTBOUND", color: "#14b8a6" },
  { name: "Event Operations",        type: "OUTBOUND", color: "#a855f7" },
  { name: "Bank Fees",               type: "OUTBOUND", color: "#6b7280" },
  { name: "Legal Fees",              type: "OUTBOUND", color: "#78716c" },
  { name: "Loan Given",              type: "OUTBOUND", color: "#ef4444" },
  { name: "Loan Repayment",          type: "OUTBOUND", color: "#d946ef" },
]

// ============================================================================
// PROJECT DEFINITIONS
// ============================================================================
const PROJECTS: { name: string; color: string }[] = [
  { name: "Values",        color: "#8b5cf6" },
  { name: "L2 Meeting",    color: "#3b82f6" },
  { name: "GK Products",   color: "#10b981" },
  { name: "Team Building",  color: "#f59e0b" },
  { name: "General",       color: "#6b7280" },
]

// ============================================================================
// Map old CSV category + type to new category name
// ============================================================================
function mapCategory(csvCategory: string, csvType: string): string {
  if (csvCategory === "Loan Payable" && csvType === "income") return "Loan Received"
  if (csvCategory === "Loan Payable" && csvType === "expense") return "Loan Repayment"
  if (csvCategory === "Loan Receivable") return "Loan Given"
  return csvCategory
}

// Normalize project name
function mapProject(csvProject: string): string {
  if (!csvProject) return ""
  const lower = csvProject.toLowerCase().trim()
  if (lower === "l2 meeting" || lower === "l2 meeting") return "L2 Meeting"
  if (lower === "values") return "Values"
  if (lower === "gk products") return "GK Products"
  if (lower === "team building") return "Team Building"
  if (lower === "general") return "General"
  return csvProject.trim()
}

// ============================================================================
// FULL TRANSACTION DATA — cleaned, sorted by date ascending
// ============================================================================
interface RawTx {
  date: string
  description: string
  partyKey: string      // key into PARTIES
  type: "income" | "expense"
  status: "planned" | "completed"
  category: string      // original CSV category
  amount: number
  project: string       // original CSV project
}

const TRANSACTIONS: RawTx[] = [
  // 2025-01-01 batch
  { date: "2025-01-01", description: "Wondershare - L&D Video", partyKey: "Wondershare", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 600, project: "" },
  { date: "2025-01-01", description: "Anniversary Event", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 35000, project: "" },
  { date: "2025-01-01", description: "Legal Fees", partyKey: "Lawyer", type: "expense", status: "completed", category: "Legal Fees", amount: 5000, project: "" },
  { date: "2025-01-01", description: "HR Day Event", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 8000, project: "" },
  { date: "2025-01-01", description: "Client payment - e&", partyKey: "eand", type: "income", status: "completed", category: "Client Revenue", amount: 150000, project: "" },
  { date: "2025-01-01", description: "Contractor payment", partyKey: "Onsy", type: "expense", status: "completed", category: "Professional Services", amount: 15000, project: "" },
  { date: "2025-01-01", description: "Bank fee / transfer", partyKey: "Bank", type: "expense", status: "completed", category: "Bank Fees", amount: 1000, project: "" },
  { date: "2025-01-01", description: "Nespresso - Beverages", partyKey: "Nespresso", type: "expense", status: "completed", category: "Event Operations", amount: 3500, project: "" },
  { date: "2025-01-01", description: "Typeform Subscription", partyKey: "Typeform", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 2500, project: "" },
  { date: "2025-01-01", description: "Mugs - CXOs e&", partyKey: "Mugs Supplier", type: "expense", status: "completed", category: "Event Operations", amount: 650, project: "" },
  { date: "2025-01-01", description: "Claude Subscription", partyKey: "Claude/Anthropic", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 1000, project: "" },
  { date: "2025-01-01", description: "Laser - CXOs e& Printing", partyKey: "Laser", type: "expense", status: "completed", category: "Production Costs", amount: 300, project: "" },
  { date: "2025-01-01", description: "Envato - Anniversary", partyKey: "Envato", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 1600, project: "" },
  { date: "2025-01-01", description: "CloudConvert - Anniversary", partyKey: "CloudConvert", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 500, project: "" },
  { date: "2025-01-01", description: "Client payment - ID project", partyKey: "Mokhtar", type: "income", status: "completed", category: "Client Revenue", amount: 20000, project: "" },
  { date: "2025-01-01", description: "DTF - CXOs e& Printing", partyKey: "DTF", type: "expense", status: "completed", category: "Production Costs", amount: 145, project: "" },
  { date: "2025-01-01", description: "Safar Marteen - Travel", partyKey: "Safar Marteen", type: "expense", status: "completed", category: "Travel & Transport", amount: 3000, project: "" },
  { date: "2025-01-01", description: "Fotor - Anniversary", partyKey: "Fotor", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 750, project: "" },
  { date: "2025-01-01", description: "Notebook - CXOs e&", partyKey: "Notebook Supplier", type: "expense", status: "completed", category: "Event Operations", amount: 150, project: "" },
  { date: "2025-01-01", description: "Box - CXOs e&", partyKey: "Box Supplier", type: "expense", status: "completed", category: "Event Operations", amount: 500, project: "" },
  { date: "2025-01-01", description: "Loan from employee", partyKey: "Islam Yossry", type: "income", status: "completed", category: "Loan Payable", amount: 1736, project: "" },
  { date: "2025-01-01", description: "Khetm - Supplies", partyKey: "Khetm", type: "expense", status: "completed", category: "Event Operations", amount: 900, project: "" },
  { date: "2025-01-01", description: "IKEA - CXOs e& Supplies", partyKey: "IKEA", type: "expense", status: "completed", category: "Event Operations", amount: 1150, project: "" },
  { date: "2025-01-01", description: "Hedra - Values Supplies", partyKey: "Hedra", type: "expense", status: "completed", category: "Event Operations", amount: 500, project: "Values" },
  { date: "2025-01-01", description: "7afr - Supplies", partyKey: "7afr", type: "expense", status: "completed", category: "Event Operations", amount: 120, project: "" },
  { date: "2025-01-01", description: "Legal Fees", partyKey: "Lawyer", type: "expense", status: "completed", category: "Legal Fees", amount: 15000, project: "" },
  { date: "2025-01-01", description: "Client payment - Strategy project", partyKey: "Mokhtar", type: "income", status: "completed", category: "Client Revenue", amount: 30000, project: "" },
  { date: "2025-01-01", description: "Client payment - Character project", partyKey: "Ray Scale", type: "income", status: "completed", category: "Client Revenue", amount: 39000, project: "" },
  { date: "2025-01-01", description: "Client payment - Character project", partyKey: "Ray Scale", type: "income", status: "completed", category: "Client Revenue", amount: 39900, project: "" },
  // June–August 2025
  { date: "2025-06-01", description: "Accounting fee", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Professional Services", amount: 5500, project: "" },
  { date: "2025-07-01", description: "Accounting fee", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Professional Services", amount: 5000, project: "" },
  { date: "2025-08-01", description: "Accounting fee", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Professional Services", amount: 5000, project: "" },
  { date: "2025-08-14", description: "Website expense", partyKey: "Website Provider", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 8391, project: "" },
  { date: "2025-08-20", description: "Event production", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 19000, project: "" },
  { date: "2025-08-20", description: "Contractor payment", partyKey: "Onsy", type: "expense", status: "completed", category: "Professional Services", amount: 15000, project: "" },
  { date: "2025-08-26", description: "Photography - Values", partyKey: "Photographer Abdullah", type: "expense", status: "completed", category: "Production Costs", amount: 4500, project: "Values" },
  { date: "2025-08-26", description: "Contractor payment", partyKey: "Onsy", type: "expense", status: "completed", category: "Professional Services", amount: 3000, project: "" },
  { date: "2025-08-26", description: "Salary - Islam Yousry", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2025-08-26", description: "Salary - Abdulrahman Hosni", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  // September 2025
  { date: "2025-09-01", description: "Accounting fee", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Professional Services", amount: 5000, project: "" },
  { date: "2025-09-01", description: "Giveaway - L2 Meeting", partyKey: "Giveaway", type: "expense", status: "completed", category: "Event Operations", amount: 725, project: "L2 meeting" },
  { date: "2025-09-01", description: "Google Mail Subscription", partyKey: "Google", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 8155, project: "" },
  { date: "2025-09-01", description: "Client payment - Character project", partyKey: "Ray Scale", type: "income", status: "completed", category: "Client Revenue", amount: 51720, project: "" },
  { date: "2025-09-08", description: "Freelance", partyKey: "Nahla", type: "expense", status: "completed", category: "Professional Services", amount: 2000, project: "" },
  { date: "2025-09-08", description: "Photography", partyKey: "Photographer Abdullah", type: "expense", status: "completed", category: "Production Costs", amount: 4500, project: "" },
  { date: "2025-09-08", description: "Loan repayment to employee", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Loan Payable", amount: 1736, project: "" },
  { date: "2025-09-08", description: "Freelance", partyKey: "Eid", type: "expense", status: "completed", category: "Professional Services", amount: 1000, project: "" },
  { date: "2025-09-16", description: "Topaz Payment - Values", partyKey: "Topaz Astra", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 1920, project: "Values" },
  { date: "2025-09-17", description: "Hailuo AI - Values", partyKey: "Hailuo", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 1700, project: "Values" },
  { date: "2025-09-22", description: "Ushers - Values", partyKey: "Ushers", type: "expense", status: "completed", category: "Event Operations", amount: 5500, project: "Values" },
  { date: "2025-09-27", description: "Novo Video", partyKey: "Novo Nordisk", type: "income", status: "completed", category: "Client Revenue", amount: 17500, project: "General" },
  { date: "2025-09-29", description: "Ushers - Values", partyKey: "Ushers", type: "expense", status: "completed", category: "Event Operations", amount: 9900, project: "Values" },
  { date: "2025-09-30", description: "Loan from employee", partyKey: "Islam Yossry", type: "income", status: "completed", category: "Loan Payable", amount: 27000, project: "" },
  { date: "2025-09-30", description: "Loan from employee", partyKey: "Abdulrahman Hosni", type: "income", status: "completed", category: "Loan Payable", amount: 27000, project: "" },
  { date: "2025-09-30", description: "Kahoot for Values", partyKey: "Kahoot", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 2500, project: "Values" },
  { date: "2025-09-30", description: "Hailuo for Novo", partyKey: "Hailuo", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 1000, project: "General" },
  { date: "2025-09-30", description: "Sound for Values", partyKey: "Taha Sabry", type: "expense", status: "completed", category: "Equipment & Rentals", amount: 7000, project: "Values" },
  // October 2025
  { date: "2025-10-01", description: "Accounting fee", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Professional Services", amount: 5000, project: "" },
  { date: "2025-10-01", description: "Novo Video", partyKey: "Novo Nordisk", type: "income", status: "completed", category: "Client Revenue", amount: 17500, project: "General" },
  { date: "2025-10-01", description: "Salary - Islam Yousry", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2025-10-01", description: "Salary - Abdulrahman Hosni", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2025-10-05", description: "Wondershare - Values & CXOs", partyKey: "Wondershare", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 1145, project: "Values" },
  { date: "2025-10-10", description: "Microsoft 365 via Apple", partyKey: "Microsoft", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 2500, project: "" },
  { date: "2025-10-10", description: "Loan from employee", partyKey: "Islam Yossry", type: "income", status: "completed", category: "Loan Payable", amount: 2500, project: "" },
  { date: "2025-10-15", description: "Loan from employee", partyKey: "Abdulrahman Hosni", type: "income", status: "completed", category: "Loan Payable", amount: 60000, project: "" },
  { date: "2025-10-16", description: "Establishment", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Capital Expenditure", amount: 60000, project: "" },
  // November 2025
  { date: "2025-11-01", description: "Salary - Abdulrahman Hosni", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2025-11-01", description: "Salary - Islam Yousry", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2025-11-05", description: "Wondershare Elements", partyKey: "Wondershare", type: "expense", status: "completed", category: "Software & Subscriptions", amount: 1250, project: "" },
  { date: "2025-11-06", description: "Loan from employee", partyKey: "Islam Yossry", type: "income", status: "completed", category: "Loan Payable", amount: 931, project: "" },
  { date: "2025-11-06", description: "Loan from employee", partyKey: "Islam Yossry", type: "income", status: "completed", category: "Loan Payable", amount: 4668, project: "" },
  { date: "2025-11-06", description: "SSD + Mouse", partyKey: "2B", type: "expense", status: "completed", category: "Capital Expenditure", amount: 4668, project: "" },
  { date: "2025-11-10", description: "Loan from employee", partyKey: "Islam Yossry", type: "income", status: "completed", category: "Loan Payable", amount: 5000, project: "" },
  { date: "2025-11-10", description: "Screen Transportation - Team Building", partyKey: "Taha Sabry", type: "expense", status: "completed", category: "Travel & Transport", amount: 5000, project: "Team Building" },
  { date: "2025-11-19", description: "Loan to employee", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Loan Receivable", amount: 2500, project: "" },
  { date: "2025-11-20", description: "Loan repayment to employee", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Loan Payable", amount: 9866, project: "" },
  { date: "2025-11-20", description: "Screens Transportation", partyKey: "Taha Sabry", type: "expense", status: "completed", category: "Travel & Transport", amount: 5000, project: "" },
  { date: "2025-11-20", description: "e& Alamein - via Blue Ocean", partyKey: "Blue Ocean", type: "income", status: "completed", category: "Client Revenue", amount: 20000, project: "" },
  { date: "2025-11-20", description: "Accounting fee", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Professional Services", amount: 5000, project: "" },
  { date: "2025-11-20", description: "Bean Bags rent", partyKey: "Bunny", type: "expense", status: "completed", category: "Equipment & Rentals", amount: 2800, project: "" },
  { date: "2025-11-20", description: "Elpmp", partyKey: "Mostafa Maher", type: "income", status: "completed", category: "Client Revenue", amount: 20000, project: "" },
  { date: "2025-11-20", description: "Ushers for Men's Day", partyKey: "Ushers", type: "expense", status: "completed", category: "Event Operations", amount: 2000, project: "" },
  { date: "2025-11-20", description: "PS Rent", partyKey: "Enter Game", type: "expense", status: "completed", category: "Equipment & Rentals", amount: 3110, project: "" },
  { date: "2025-11-30", description: "Saudi Germany Hospital", partyKey: "Saudi Germany", type: "income", status: "completed", category: "Client Revenue", amount: 117500, project: "" },
  // December 2025
  { date: "2025-12-01", description: "Salary - Islam Yousry", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2025-12-01", description: "Salary - Abdulrahman Hosni", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2025-12-01", description: "Photography / Videography - L2 Meeting", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 17000, project: "L2 meeting" },
  { date: "2025-12-01", description: "Photography Posters - Values", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 8000, project: "Values" },
  { date: "2025-12-02", description: "Screen Rent (Team Building + Men's Day)", partyKey: "Taha Sabry", type: "expense", status: "completed", category: "Equipment & Rentals", amount: 26000, project: "" },
  { date: "2025-12-03", description: "Screens for Values event", partyKey: "Taha Sabry", type: "expense", status: "completed", category: "Equipment & Rentals", amount: 15000, project: "Values" },
  { date: "2025-12-03", description: "CXO Videography - Values", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 45000, project: "Values" },
  { date: "2025-12-16", description: "Loan repayment to employee", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Loan Payable", amount: 27000, project: "" },
  { date: "2025-12-17", description: "Loan back", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Loan Receivable", amount: 27000, project: "" },
  { date: "2025-12-21", description: "Loan back", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Loan Receivable", amount: 60000, project: "" },
  { date: "2025-12-31", description: "Sound System", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Capital Expenditure", amount: 20000, project: "" },
  { date: "2025-12-31", description: "Values V/PH for 3 Days", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 48000, project: "Values" },
  { date: "2025-12-31", description: "Old Salaries - Islam Yousry", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Salaries & Wages", amount: 150000, project: "" },
  { date: "2025-12-31", description: "Old Salaries - Abdulrahman Hosni", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Salaries & Wages", amount: 150000, project: "" },
  { date: "2025-12-31", description: "Old Part-time Salary - Sherif", partyKey: "Sherif", type: "expense", status: "completed", category: "Salaries & Wages", amount: 130000, project: "" },
  { date: "2025-12-31", description: "Innovation videography", partyKey: "Mahmoud Elmasry", type: "expense", status: "completed", category: "Production Costs", amount: 8000, project: "GK Products" },
  // January 2026
  { date: "2026-01-01", description: "inDrive Sokhna", partyKey: "Abdulrahman Hosni", type: "expense", status: "planned", category: "Travel & Transport", amount: 2000, project: "" },
  { date: "2026-01-01", description: "Salary - Abdulrahman Hosni", partyKey: "Abdulrahman Hosni", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2026-01-01", description: "Salary - Islam Yousry", partyKey: "Islam Yossry", type: "expense", status: "completed", category: "Salaries & Wages", amount: 50000, project: "" },
  { date: "2026-01-11", description: "Expected inflow - HR Day", partyKey: "eand", type: "income", status: "completed", category: "Client Revenue", amount: 104800, project: "" },
  { date: "2026-01-11", description: "Values income part 1", partyKey: "eand", type: "income", status: "completed", category: "Client Revenue", amount: 695400, project: "Values" },
  { date: "2026-01-11", description: "Al Alamin inflow", partyKey: "eand", type: "income", status: "completed", category: "Client Revenue", amount: 152190, project: "" },
  { date: "2026-01-11", description: "Rise income", partyKey: "eand", type: "income", status: "completed", category: "Client Revenue", amount: 5700, project: "" },
  { date: "2026-01-11", description: "Al Alamin Production", partyKey: "eand", type: "income", status: "completed", category: "Client Revenue", amount: 196976, project: "" },
  { date: "2026-01-31", description: "Establishment", partyKey: "Ahmed Hegazy", type: "expense", status: "completed", category: "Capital Expenditure", amount: 40000, project: "" },
  { date: "2026-01-31", description: "Photography / Videography 2nd day - L2 Meeting", partyKey: "Mahmoud Elmasry", type: "expense", status: "planned", category: "Production Costs", amount: 17000, project: "L2 meeting" },
  // February 2026
  { date: "2026-02-01", description: "Men's Day shooting", partyKey: "Mahmoud Elmasry", type: "expense", status: "planned", category: "Production Costs", amount: 16000, project: "" },
  { date: "2026-02-01", description: "SSS Shooting", partyKey: "Mahmoud Elmasry", type: "expense", status: "planned", category: "Production Costs", amount: 12000, project: "" },
  // March 2026 (planned)
  { date: "2026-03-01", description: "Safety and Security (SSS)", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 180827, project: "" },
  { date: "2026-03-01", description: "Values Launch Addons", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 156180, project: "" },
  { date: "2026-03-01", description: "Strategy Exercise", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 45600, project: "" },
  { date: "2026-03-01", description: "Strategy | Disrupt Video", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 31350, project: "" },
  { date: "2026-03-01", description: "Strategy Disrupt", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 111150, project: "" },
  { date: "2026-03-01", description: "L2 Workshops", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 112860, project: "" },
  { date: "2026-03-01", description: "Men's Day", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 174306, project: "" },
  { date: "2026-03-01", description: "e& Team Building", partyKey: "eand", type: "income", status: "planned", category: "Client Revenue", amount: 144780, project: "" },
]

// ============================================================================
// SEED ROUTE
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const firebaseUid = body.firebaseUid || null

    // Bootstrap: ensure org exists
    let org = await prisma.organization.findFirst()
    if (!org) {
      org = await prisma.organization.create({
        data: { id: "injaz-main", name: "Injaz", currency: "EGP" },
      })
    }

    // Bootstrap: ensure at least one user exists
    let user = firebaseUid
      ? await prisma.user.findUnique({ where: { id: firebaseUid } })
      : await prisma.user.findFirst({ where: { organizationId: org.id } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: firebaseUid || "seed-admin",
          email: "admin@injaz.app",
          name: "Islam Yousry",
          role: "Admin",
          organizationId: org.id,
          approvalStatus: "approved",
        },
      })
    }

    const orgId = org.id
    const userId = user.id

    // Clean existing payments (only non-draft) so we can re-seed
    const existingCount = await prisma.payment.count({ where: { organizationId: orgId, isDraft: false } })
    if (existingCount > 0) {
      await prisma.payment.deleteMany({ where: { organizationId: orgId, isDraft: false } })
    }

    // ====================================================================
    // 1. Create Parties
    // ====================================================================
    const partyMap = new Map<string, string>() // partyKey -> id
    for (const [key, def] of Object.entries(PARTIES)) {
      const existing = await prisma.party.findFirst({
        where: { organizationId: orgId, name: def.name },
      })
      if (existing) {
        // Update VAT/tax settings
        await prisma.party.update({
          where: { id: existing.id },
          data: {
            type: def.type as any,
            hasVat: def.hasVat,
            vatRate: def.vatRate,
            hasIncomeTaxDeduction: def.hasIncomeTaxDeduction,
            incomeTaxRate: def.incomeTaxRate,
          },
        })
        partyMap.set(key, existing.id)
      } else {
        const party = await prisma.party.create({
          data: {
            organizationId: orgId,
            name: def.name,
            type: def.type as any,
            hasVat: def.hasVat,
            vatRate: def.vatRate,
            hasIncomeTaxDeduction: def.hasIncomeTaxDeduction,
            incomeTaxRate: def.incomeTaxRate,
          },
        })
        partyMap.set(key, party.id)
      }
    }

    // ====================================================================
    // 2. Create Categories
    // ====================================================================
    const categoryMap = new Map<string, string>() // name -> id
    for (const cat of CATEGORIES) {
      const existing = await prisma.category.findFirst({
        where: { organizationId: orgId, name: cat.name },
      })
      if (existing) {
        categoryMap.set(cat.name, existing.id)
      } else {
        const created = await prisma.category.create({
          data: {
            organizationId: orgId,
            name: cat.name,
            type: cat.type as any,
            color: cat.color,
          },
        })
        categoryMap.set(cat.name, created.id)
      }
    }

    // ====================================================================
    // 3. Create Projects (link e& as client for most)
    // ====================================================================
    const eandPartyId = partyMap.get("eand")
    const projectMap = new Map<string, string>() // name -> id
    for (const proj of PROJECTS) {
      const existing = await prisma.project.findFirst({
        where: { organizationId: orgId, name: proj.name },
      })
      if (existing) {
        projectMap.set(proj.name, existing.id)
      } else {
        const created = await prisma.project.create({
          data: {
            organizationId: orgId,
            name: proj.name,
            color: proj.color,
            clientPartyId: eandPartyId || undefined,
          },
        })
        projectMap.set(proj.name, created.id)
      }
    }

    // ====================================================================
    // 4. Create Payments — sorted by date, numbered sequentially
    // ====================================================================
    let inCounter = 0
    let outCounter = 0
    let created = 0

    for (const tx of TRANSACTIONS) {
      const direction = tx.type === "income" ? "INBOUND" : "OUTBOUND"
      const partyId = partyMap.get(tx.partyKey)
      const categoryName = mapCategory(tx.category, tx.type)
      const categoryId = categoryMap.get(categoryName)
      const projectName = mapProject(tx.project)
      const projectId = projectName ? projectMap.get(projectName) : undefined

      const status = tx.status === "completed" ? "COMPLETED" : "PLANNED"
      const isCompleted = status === "COMPLETED"

      let number: string
      if (direction === "INBOUND") {
        number = `RCV-${String(++inCounter).padStart(4, "0")}`
      } else {
        number = `PAY-${String(++outCounter).padStart(4, "0")}`
      }

      await prisma.payment.create({
        data: {
          organizationId: orgId,
          number,
          direction: direction as any,
          status: status as any,
          partyId: partyId || null,
          categoryId: categoryId || undefined,
          projectId: projectId || undefined,
          plannedDate: new Date(tx.date),
          actualDate: isCompleted ? new Date(tx.date) : undefined,
          expectedAmount: tx.amount,
          actualAmount: isCompleted ? tx.amount : undefined,
          description: tx.description,
          createdById: userId,
          isDraft: false,
        } as any,
      })
      created++
    }

    return NextResponse.json({
      success: true,
      stats: {
        parties: partyMap.size,
        categories: categoryMap.size,
        projects: projectMap.size,
        payments: created,
        inbound: inCounter,
        outbound: outCounter,
      },
    })
  } catch (error: unknown) {
    console.error("Seed error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
