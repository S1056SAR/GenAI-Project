"use client"

import { useStore } from "@/store/useStore"
import { motion } from "framer-motion"
import { Lock, Check, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface PathMapProps {
    onNodeClick: (nodeId: string) => void
}

export default function PathMap({ onNodeClick }: PathMapProps) {
    const { learningPath } = useStore()

    // Calculate path string for SVG
    const generatePath = () => {
        let path = `M ${learningPath[0].position.x} ${learningPath[0].position.y}`
        for (let i = 0; i < learningPath.length - 1; i++) {
            const current = learningPath[i]
            const next = learningPath[i + 1]

            // Create a curved path between nodes
            const midY = (current.position.y + next.position.y) / 2
            path += ` C ${current.position.x} ${midY}, ${next.position.x} ${midY}, ${next.position.x} ${next.position.y}`
        }
        return path
    }

    return (
        <div className="relative h-full w-full overflow-y-auto custom-scrollbar p-8">
            <div className="relative mx-auto min-h-[800px] w-full max-w-md">
                {/* SVG Path */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    {/* Background Path */}
                    <path
                        d={generatePath()}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    {/* Glowing Active Path (Animated) */}
                    <motion.path
                        d={generatePath()}
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                    />
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Nodes */}
                {learningPath.map((node, index) => (
                    <motion.div
                        key={node.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.2 }}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: node.position.x, top: node.position.y }}
                    >
                        <button
                            onClick={() => node.status !== "locked" && onNodeClick(node.id)}
                            disabled={node.status === "locked"}
                            className={cn(
                                "group relative flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300",
                                node.status === "locked"
                                    ? "border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed"
                                    : node.status === "completed"
                                        ? "border-yellow-500 bg-yellow-500/20 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                                        : "border-cyan-500 bg-cyan-500/20 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.5)] animate-pulse"
                            )}
                        >
                            {node.status === "locked" && <Lock className="h-6 w-6" />}
                            {node.status === "completed" && <Check className="h-8 w-8" />}
                            {node.status === "active" && <Star className="h-8 w-8 fill-current" />}

                            {/* Label Tooltip */}
                            <div className="absolute left-full ml-4 w-48 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                                <div className="rounded-lg border border-white/10 bg-[#0f0c29]/90 p-3 backdrop-blur-md">
                                    <h4 className="font-semibold text-white">{node.label}</h4>
                                    <p className="text-xs text-gray-400">{node.description}</p>
                                </div>
                            </div>
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
