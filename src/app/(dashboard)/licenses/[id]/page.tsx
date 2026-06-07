"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface License {
  id: number
  key: string
  storeName: string
  storeType: string
  status: string
  plan: string
  expiryDate: string | null
  machineId: string | null
  lastResetDate: string | null
  resetCount: number
  payments: any[]
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

export default function LicenseDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const licenseId = params.id as string
  const [license, setLicense] = useState<License | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchLicense = async () => {
    try {
      const res = await fetch(`/api/licenses/${licenseId}`)
      const data = await res.json()
      setLicense(data)
    } catch (error) {
      console.error("Error fetching license:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLicense()
  }, [licenseId])

  const handleSuspend = async () => {
    if (!confirm("هل أنت متأكد من إيقاف هذا الترخيص؟")) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/licenses/${licenseId}/suspend`, {
        method: "POST",
      })

      if (res.ok) {
        await fetchLicense()
      }
    } catch (error) {
      console.error("Error suspending license:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!confirm("هل أنت متأكد من تفعيل هذا الترخيص؟")) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/licenses/${licenseId}/activate`, {
        method: "POST",
      })

      if (res.ok) {
        await fetchLicense()
      }
    } catch (error) {
      console.error("Error activating license:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetMachine = async () => {
    if (!confirm("هل أنت متأكد من إعادة تعيين الجهاز؟ سيسمح للعميل بتسجيل جهاز جديد."))
      return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/licenses/${licenseId}/reset-machine`, {
        method: "POST",
      })

      if (res.ok) {
        await fetchLicense()
      }
    } catch (error) {
      console.error("Error resetting machine:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExtendLicense = async () => {
    if (!confirm("هل أنت متأكد من توسيع الترخيص لمدة 30 يوم؟")) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/licenses/${licenseId}/extend`, {
        method: "POST",
      })

      if (res.ok) {
        await fetchLicense()
      }
    } catch (error) {
      console.error("Error extending license:", error)
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

  if (!license) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-red-500">لم يتم العثور على الترخيص</p>
      </div>
    )
  }

  const effectiveStatus = getEffectiveStatus(license)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">تفاصيل الترخيص</h1>
        <Link href="/licenses">
          <Button variant="outline">رجوع</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المعلومات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-right">
          <div>
            <p className="text-sm text-gray-500">المفتاح</p>
            <p className="font-mono text-lg">{license.key}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">اسم المتجر</p>
            <p>{license.storeName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">نوع المتجر</p>
            <p>{license.storeType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">الحالة</p>
            <span
              className={`px-2 py-1 rounded-full text-xs ${getStatusClass(
                effectiveStatus
              )}`}
            >
              {getStatusLabel(effectiveStatus)}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">الخطة</p>
            <p>{getPlanLabel(license.plan)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">تاريخ الانتهاء</p>
            <p>
              {license.expiryDate
                ? formatDateTime(license.expiryDate)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Machine ID</p>
            <p className="font-mono text-sm">{license.machineId || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">تاريخ آخر إعادة تعيين</p>
            <p>
              {license.lastResetDate
                ? formatDateTime(license.lastResetDate)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">عدد إعادة تعيين الجهاز</p>
            <p>{license.resetCount}</p>
          </div>

          <div className="flex gap-2 pt-4">
            {effectiveStatus !== "suspended" && (
              <Button onClick={handleSuspend} disabled={isLoading}>
                إيقاف الترخيص
              </Button>
            )}
            {effectiveStatus === "suspended" && (
              <Button onClick={handleActivate} disabled={isLoading}>
                تفعيل الترخيص
              </Button>
            )}
            {license.machineId && (
              <Button onClick={handleResetMachine} disabled={isLoading}>
                Reset Machine ID
              </Button>
            )}
            <Button onClick={handleExtendLicense} disabled={isLoading}>
              توسيع لمدة 30 يوم
            </Button>
          </div>
        </CardContent>
      </Card>

      {license.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>تاريخ المدفوعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {license.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between items-center p-3 border rounded-lg text-right"
              >
                <div>
                  <p className="font-medium">{payment.plan}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.paidAt).toLocaleDateString("ar")}
                  </p>
                </div>
                <p className="font-bold">{payment.amount}</p>
              </div>
            ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
