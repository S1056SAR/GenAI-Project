"use client"

import { useEffect, useState } from "react"
import { Bell, Search, User } from "lucide-react"
import { getAuthToken, getUserFromToken, AuthState } from "@/lib/auth"

export default function Header() {
    const [user, setUser] = useState<AuthState["user"]>(null)

    useEffect(() => {
        const token = getAuthToken()
        if (token) {
            const userData = getUserFromToken(token)
            setUser(userData)
        }
    }, [])

    return (
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-white/5 bg-[#0f0c29]/80 px-8 backdrop-blur-xl">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">Dashboard</h2>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="h-10 w-64 rounded-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                </div>

                <button className="relative rounded-full bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-[#0f0c29]" />
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-white">{user?.name || "Guest"}</p>
                        <p className="text-xs text-gray-400">{user?.email || "Not signed in"}</p>
                    </div>
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        {user?.picture ? (
                            <img
                                src={user.picture}
                                alt={user.name || "User"}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-cyan-500/20 to-purple-500/20">
                                <User className="h-5 w-5 text-white" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
