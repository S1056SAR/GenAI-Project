"use client"

import { useStore } from "@/store/useStore"
import { History, ChevronDown, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function ResourceVersionSelector() {
    const { versions, currentVersionId, setVersion } = useStore()
    const [isOpen, setIsOpen] = useState(false)

    const currentVersion = versions.find((v) => v.id === currentVersionId)

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
                <History className="h-4 w-4 text-cyan-400" />
                <span className="max-w-[150px] truncate">{currentVersion?.label}</span>
                <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-white/10 bg-[#0f0c29]/95 p-2 shadow-xl backdrop-blur-xl ring-1 ring-white/10"
                        >
                            <div className="mb-2 px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Resource History
                            </div>
                            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                {versions.map((version) => (
                                    <button
                                        key={version.id}
                                        onClick={() => {
                                            setVersion(version.id)
                                            setIsOpen(false)
                                        }}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                            currentVersionId === version.id
                                                ? "bg-cyan-500/10 text-cyan-400"
                                                : "text-gray-300 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium truncate">{version.label}</span>
                                            <span className="text-[10px] text-gray-500">{version.timestamp}</span>
                                        </div>
                                        {currentVersionId === version.id && <Check className="h-3 w-3" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
