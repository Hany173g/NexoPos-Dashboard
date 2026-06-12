"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

interface License {
  id: number
  key: string
  storeName: string
  storeType: string
  status: string
  plan: string
  expiryDate: string | null
  machineId: string | null
}

const getPlanLabel = (plan: string) => {
  switch (plan) {
    case "test":
      return "تجريبي"
    case "monthly":
      return "شهري"
    case "quarterly":
      return "ربع سنوي"
    case "yearly":
      return "سنوي"
    default:
      return plan
  }
}

const getEffectiveStatus = (license: License) => {
  if (license.status === "suspended") return "suspended"
  
  if (license.expiryDate) {
    const now = new Date()
    const expiry = new Date(license.expiryDate)
    if (now > expiry) {
      return "expired"
    }
  }
  
  return license.status
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "active":
      return "نشط"
    case "expired":
      return "منتهي"
    case "pending":
      return "قيد الانتظار"
    case "suspended":
      return "موقوف"
    default:
      return status
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800"
    case "expired":
      return "bg-red-100 text-red-800"
    case "suspended":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-yellow-100 text-yellow-800"
  }
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString("ar", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function LicensesPage() {
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLicenses = async () => {
    try {
      const res = await fetch("/api/licenses")
      const data = await res.json()
      setLicenses(data)
    } catch (error) {
      console.error("Error fetching licenses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLicenses()
  }, [])

  const handleSuspend = async (licenseId: number) => {
    if (!confirm("هل أنت متأكد من إيقاف هذا الترخيص؟")) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/licenses/${licenseId}/suspend`, {
        method: "POST",
      })

      if (res.ok) {
        await fetchLicenses()
      }
    } catch (error) {
      console.error("Error suspending license:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async (licenseId: number) => {
    if (!confirm("هل أنت متأكد من تفعيل هذا الترخيص؟")) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/licenses/${licenseId}/activate`, {
        method: "POST",
      })

      if (res.ok) {
        await fetchLicenses()
      }
    } catch (error) {
      console.error("Error activating license:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetMachine = async (licenseId: number) => {
    if (
      !confirm(
        "هل أنت متأكد من إعادة تعيين الجهاز؟ سيسمح للعميل بتسجيل جهاز جديد."
      )
    )
      return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/licenses/${licenseId}/reset-machine`, {
        method: "POST",
      })

      if (res.ok) {
        await fetchLicenses()
      }
    } catch (error) {
      console.error("Error resetting machine:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg">جاري التحميل...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">التراخيص</h1>
        <Link href="/licenses/new">
          <Button>إنشاء ترخيص جديد</Button>
        </Link>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المفتاح</TableHead>
              <TableHead className="text-right">المتجر</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">الخطة</TableHead>
              <TableHead className="text-right">تاريخ الانتهاء</TableHead>
              <TableHead className="text-right">Machine ID</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.map((license) => {
              const effectiveStatus = getEffectiveStatus(license)
              
              return (
                <TableRow key={license.id}>
                  <TableCell className="text-right font-mono">
                    {license.key}
                  </TableCell>
                  <TableCell className="text-right">{license.storeName}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusClass(
                        effectiveStatus
                      )}`}
                    >
                      {getStatusLabel(effectiveStatus)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {getPlanLabel(license.plan)}
                  </TableCell>
                  <TableCell className="text-right">
                    {license.expiryDate
                      ? formatDateTime(license.expiryDate)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {license.machineId || "-"}
                  </TableCell>
                  <TableCell className="text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => router.push(`/licenses/${license.id}`)}>
                          عرض التفاصيل
                        </DropdownMenuItem>
                        {effectiveStatus !== "suspended" && (
                          <DropdownMenuItem onClick={() => handleSuspend(license.id)}>
                            إيقاف الترخيص
                          </DropdownMenuItem>
                        )}
                        {effectiveStatus === "suspended" && (
                          <DropdownMenuItem onClick={() => handleActivate(license.id)}>
                            تفعيل الترخيص
                          </DropdownMenuItem>
                        )}
                        {license.machineId && (
                          <DropdownMenuItem onClick={() => handleResetMachine(license.id)}>
                            Reset Machine ID
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
