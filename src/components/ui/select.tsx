"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

const Select = ({
  value,
  onValueChange,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
    >
      {children}
    </select>
  )
}

const SelectTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
)

const SelectValue = ({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) => (
  <span>{children || placeholder}</span>
)

const SelectContent = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
)

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}
