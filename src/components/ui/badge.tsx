import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        info: "border-transparent bg-blue-100 text-blue-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

const statusVariantMap: Record<string, "success" | "warning" | "destructive" | "info" | "secondary" | "default"> = {
  COMPLETED: "success", PAID: "success", ACTIVE: "success", APPROVED: "success",
  PENDING: "warning", PLANNED: "warning", SCHEDULED: "warning", DRAFT: "warning",
  OVERDUE: "destructive", CANCELLED: "destructive", REJECTED: "destructive",
  PARTIALLY_PAID: "info", PARTIAL: "info", ON_HOLD: "info", DEFERRED: "info",
  SENT: "info",
}

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = statusVariantMap[status] || "secondary"
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return <Badge variant={variant} className={className}>{label}</Badge>
}

export { Badge, badgeVariants, StatusBadge }
