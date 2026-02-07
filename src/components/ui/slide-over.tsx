"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  wide?: boolean
}

export function SlideOver({ open, onClose, title, description, children, className, wide }: SlideOverProps) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "absolute right-0 top-0 h-full bg-background shadow-xl transition-transform",
          wide ? "w-full max-w-2xl" : "w-full max-w-lg",
          className
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-6">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}
