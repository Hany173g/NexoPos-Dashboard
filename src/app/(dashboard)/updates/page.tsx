"use client"

import { useState, useEffect } from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface Version {
  id: number
  version: string
  downloadUrl: string
  checksum: string
  releaseNotes: string
  isForced: boolean
  createdAt: string
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

export default function UpdatesPage() {
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    version: "",
    releaseNotes: "",
    isForced: false,
    file: null as File | null
  })

  const fetchVersions = async () => {
    try {
      const res = await fetch("/api/versions")
      const data = await res.json()
      setVersions(data)
    } catch (error) {
      console.error("Error fetching versions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("version", formData.version)
      formDataToSend.append("releaseNotes", formData.releaseNotes)
      formDataToSend.append("isForced", formData.isForced ? "on" : "")
      if (formData.file) {
        formDataToSend.append("file", formData.file)
      }

      const res = await fetch("/api/versions", {
        method: "POST",
        body: formDataToSend
      })

      if (res.ok) {
        setDialogOpen(false)
        setFormData({
          version: "",
          releaseNotes: "",
          isForced: false,
          file: null
        })
        await fetchVersions()
      }
    } catch (error) {
      console.error("Error uploading version:", error)
    } finally {
      setIsUploading(false)
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
        <h1 className="text-2xl font-bold">التحديثات</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>رفع إصدار جديد</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>رفع إصدار جديد</DialogTitle>
              <DialogDescription>
                رفع ملف تحديث جديد لنظام NexoPOS
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version">رقم الإصدار</Label>
                <Input
                  id="version"
                  placeholder="مثال: 1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="releaseNotes">ملاحظات النسخة</Label>
                <textarea
                  id="releaseNotes"
                  rows={6}
                  className="w-full rounded-md border p-3"
                  placeholder="أدخل ملاحظات النسخة بالعربية..."
                  value={formData.releaseNotes}
                  onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="isForced"
                  checked={formData.isForced}
                  onCheckedChange={(checked) => setFormData({ ...formData, isForced: checked as boolean })}
                />
                <Label htmlFor="isForced">إجباري</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">ملف التحديث (.exe)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".exe"
                  onChange={handleFileChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "جاري الرفع..." : "رفع"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الإصدار</TableHead>
              <TableHead className="text-right">ملاحظات النسخة</TableHead>
              <TableHead className="text-right">إجباري</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => (
              <TableRow key={version.id}>
                <TableCell className="text-right font-mono">
                  {version.version}
                </TableCell>
                <TableCell className="text-right max-w-md truncate">
                  {version.releaseNotes}
                </TableCell>
                <TableCell className="text-right">
                  <span className={version.isForced ? "text-red-600" : "text-gray-600"}>
                    {version.isForced ? "نعم" : "لا"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {formatDateTime(version.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
