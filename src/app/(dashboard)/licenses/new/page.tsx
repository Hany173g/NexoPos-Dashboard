"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewLicensePage() {
  const [storeName, setStoreName] = useState("");
  const [storeType, setStoreType] = useState("");
  const [plan, setPlan] = useState("");
  const [duration, setDuration] = useState("30");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const expiryDate = new Date();
    
    if (duration === "5") {
      // 5 دقائق للتجربة
      expiryDate.setMinutes(expiryDate.getMinutes() + 5);
    } else {
      expiryDate.setDate(expiryDate.getDate() + parseInt(duration));
    }

    const res = await fetch("/api/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName,
        storeType,
        plan,
        expiryDate: expiryDate.toISOString(),
      }),
    });

    if (res.ok) {
      router.push("/licenses");
    }
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>إنشاء ترخيص جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="storeName">اسم المتجر</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="storeType">نوع المتجر</Label>
              <Input
                id="storeType"
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="plan">الخطة</Label>
              <Select value={plan} onValueChange={setPlan} required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الخطة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">تجريبي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                  <SelectItem value="quarterly">ربع سنوي</SelectItem>
                  <SelectItem value="yearly">سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">المدة</Label>
              <Select value={duration} onValueChange={setDuration} required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المدة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 دقائق (تجريبي)</SelectItem>
                  <SelectItem value="30">30 يوم</SelectItem>
                  <SelectItem value="90">90 يوم</SelectItem>
                  <SelectItem value="365">365 يوم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit">إنشاء</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
