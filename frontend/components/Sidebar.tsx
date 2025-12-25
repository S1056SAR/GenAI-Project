"use client"

import { motion } from "framer-motion"
import { LayoutDashboard, BookOpen, FileText, Settings, LogOut, GraduationCap, Map } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Map, label: "Pathfinder", href: "/dashboard/pathfinder" },
    { icon: GraduationCap, label: "Tutor Mode", href: "/dashboard/tutor" },
    { icon: FileText, label: "Examiner Mode", href: "/dashboard/exam" },
    { icon: BookOpen, label: "Resources", href: "/dashboard/resources" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="fixed left-4 top-4 bottom-4 z-50 flex w-64 flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl"
        >
            <div className="flex items-center gap-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/20">
                    <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">EduSynth</span>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-4">
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-lg shadow-cyan-500/10 border border-white/10"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 transition-colors",
                                    isActive ? "text-cyan-400" : "text-gray-500 group-hover:text-cyan-400"
                                )}
                            />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4">
                <button className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-400">
                    <LogOut className="h-5 w-5 transition-colors group-hover:text-red-400" />
                    Sign Out
                </button>
            </div>
        </motion.aside>
    )
}
