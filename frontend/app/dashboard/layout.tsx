"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import StarField from "@/components/StarField"
import { getAuthToken } from "@/lib/auth"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const token = getAuthToken()
        if (!token) {
            router.push("/")
        } else {
            setIsLoading(false)
        }
    }, [router])

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0f0c29] text-white">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
            </div>
        )
    }

    return (
        <div className="relative min-h-screen w-full bg-[#0f0c29] text-white overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <StarField />
            </div>

            <Sidebar />

            <div className="relative z-10 ml-72 flex min-h-screen flex-col pr-4">
                <Header />
                <main className="flex-1 py-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
