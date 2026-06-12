"use client"
import * as React from "react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child as React.ReactElement, {
              isOpen,
              setIsOpen,
            })
          }
          if (child.type === DropdownMenuContent && isOpen) {
            return React.cloneElement(child as React.ReactElement, {
              setIsOpen,
            })
          }
        }
        return child
      })}
    </div>
  )
}

const DropdownMenuTrigger = ({
  children,
  className,
  asChild,
}: {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}) => {
  if (asChild && React.isValidElement(children)) {
    return children
  }
  return (
    <Button className={className} variant="ghost">
      {children}
    </Button>
  )
}

const DropdownMenuContent = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
  [key: string]: any
}) => (
  <div
    className={cn(
      "absolute left-0 z-50 min-w-[8rem] rounded-md border bg-white p-1 shadow-md",
      className
    )}
  >
    {children}
  </div>
)

const DropdownMenuItem = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) => (
  <div
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100",
      className
    )}
    onClick={onClick}
  >
    {children}
  </div>
)

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
}
