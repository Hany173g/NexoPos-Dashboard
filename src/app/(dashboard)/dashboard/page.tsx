"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface License {
  id: number
  key: string
  storeName: string
  status: string
  expiryDate: string | null
  machineId: string | null
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

export default function DashboardPage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await fetch("/api/licenses")
      const data = await res.json()
      setLicenses(data)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getDashboardStats = () => {
    const total = licenses.length
    let active = 0
    let expired = 0
    let pending = 0
    let suspended = 0

    licenses.forEach(license => {
      const status = getEffectiveStatus(license)
      switch (status) {
        case "active":
          active++
          break
        case "expired":
          expired++
          break
        case "pending":
          pending++
          break
        case "suspended":
          suspended++
          break
      }
    })

    return { total, active, expired, pending, suspended }
  }

  const recentLicenses = licenses.slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg">جاري التحميل...</p>
      </div>
    )
  }

  const stats = getDashboardStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <Link href="/licenses/new">
          <Button>إنشاء ترخيص جديد</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>إجمالي التراخيص</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نشط</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {stats.active}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>منتهي</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {stats.expired}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قيد الانتظار</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.pending}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>موقوف</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {stats.suspended}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>التراخيص الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLicenses.map((license) => {
              const effectiveStatus = getEffectiveStatus(license)
              
              return (
                <div
                  key={license.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="text-right">
                    <p className="font-medium">{license.storeName}</p>
                    <p className="text-sm text-gray-500">{license.key}</p>
                    {license.machineId && (
                      <p className="text-xs text-gray-400 font-mono">
                        Machine ID: {license.machineId}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getStatusClass(
                      effectiveStatus
                    )}`}
                  >
                    {getStatusLabel(effectiveStatus)}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
