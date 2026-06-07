"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Home, Key, LogOut, MessageCircle, Phone, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { name: "لوحة التحكم", href: "/dashboard", icon: Home },
  { name: "التراخيص", href: "/licenses", icon: Key },
  { name: "التحديثات", href: "/updates", icon: Upload },
]

const WHATSAPP_NUMBER = "201000000000"
const FACEBOOK_URL = "https://facebook.com/nexopos"

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold">NexoPOS Dashboard</h1>
      </div>
      <nav className="space-y-2 flex-1">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                pathname === link.href ? "bg-gray-700" : "hover:bg-gray-800"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{link.name}</span>
            </Link>
          )
        })}
      </nav>
      
      {/* Contact Info */}
      <div className="mb-4 p-4 bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-400 mb-3 text-center">تواصل معنا</p>
        <div className="flex gap-3 justify-center">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-full hover:bg-green-700 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            <Phone className="h-5 w-5" />
          </a>
        </div>
      </div>
      
      <div className="pt-4 border-t border-gray-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-gray-800"
          onClick={() => signOut()}
        >
          <LogOut className="h-5 w-5 mr-2" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  )
}
