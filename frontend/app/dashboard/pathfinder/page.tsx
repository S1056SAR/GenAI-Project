"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import PathMap from "@/components/PathMap"
import NodeLessonModal from "@/components/NodeLessonModal"
import { LearningNode, useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles, Map, ArrowRight, Upload } from "lucide-react"

export default function PathfinderPage() {
    const { toast } = useToast()
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const { learningPath, setLearningPath } = useStore()

    // Creation State
    const [syllabus, setSyllabus] = useState("")
    const [isCreating, setIsCreating] = useState(false)

    const completedCount = learningPath.filter((n) => n.status === "completed").length
    const progress = learningPath.length > 0 ? (completedCount / learningPath.length) * 100 : 0

    const handleCreateJourney = async (file?: File) => {
        if (!file && !syllabus.trim()) return

        setIsCreating(true)
        try {
            let data;
            if (file) {
                data = await api.journey.startFromFile(file)
            } else {
                data = await api.journey.start(syllabus)
            }

            // Backend returns: { course_id: ..., nodes: [ { id: 'node_0', title: '...', description: '...' }, ... ] }
            // We need to map this to our UI Store format: LearningNode[] with visual positions.

            const newNodes: LearningNode[] = data.nodes.map((n: any, i: number) => ({
                id: n.id, // e.g. "node_1"
                label: n.title,
                description: n.description,
                status: i === 0 ? "active" : "locked",
                // Calculate simple zig-zag positions
                position: {
                    x: i % 2 === 0 ? 100 : 300,
                    y: 100 + (i * 150)
                }
            }))

            setLearningPath(newNodes)
            // Save course_id for API calls
            useStore.setState({ currentPathId: data.course_id })

            toast({
                title: "Journey Created!",
                description: "Your personalized learning path is ready."
            })

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            })
        } finally {
            setIsCreating(false)
        }
    }

    if (learningPath.length === 0) {
        return (
            <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg"
                >
                    <div className="glass-card glow-border rounded-2xl p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />

                        <div className="mb-6 flex justify-center">
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Map className="h-8 w-8 text-white" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-2">Start Your Journey</h2>
                        <p className="text-gray-400 mb-8">
                            Upload your syllabus or describe your goal to generate a personalized learning path.
                        </p>

                        <div className="space-y-6">
                            {/* Upload Zone */}
                            <div className="relative">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept=".pdf,.txt,.docx"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleCreateJourney(file)
                                    }}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
                                >
                                    <div className="mb-3 p-3 rounded-full bg-white/5 ring-1 ring-white/10 group-hover:scale-110 transition-transform">
                                        <Upload className="h-6 w-6 text-cyan-400" />
                                    </div>
                                    <p className="text-sm text-gray-300">
                                        <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT (Max 10MB)</p>
                                </label>
                            </div>

                            <div className="relative flex items-center gap-4">
                                <div className="h-px bg-white/10 flex-1" />
                                <span className="text-xs text-gray-500 font-medium">OR ENTER TOPIC</span>
                                <div className="h-px bg-white/10 flex-1" />
                            </div>

                            <div className="relative">
                                <textarea
                                    value={syllabus}
                                    onChange={(e) => setSyllabus(e.target.value)}
                                    placeholder="I want to learn about Quantum Computing..."
                                    className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm"
                                />
                                <button
                                    onClick={() => handleCreateJourney()}
                                    disabled={isCreating || !syllabus.trim()}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 font-bold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>

                            {isCreating && (
                                <div className="absolute inset-0 z-10 bg-[#0f0c29]/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                                        <span className="text-sm font-medium text-white">Mapping Territory...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="relative h-[calc(100vh-8rem)] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f0c29]/50 backdrop-blur-sm">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0f0c29]/80 px-8 py-4 backdrop-blur-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white glow-text">Pathfinder Mode</h2>
                    <p className="text-sm text-gray-400">Your AI-Guided Learning Journey</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-white">Course Progress</p>
                        <p className="text-xs text-cyan-400">{Math.round(progress)}% Complete</p>
                    </div>
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="h-full w-full pt-20 overflow-auto scrollbar-hide">
                <div className="min-h-[1000px] w-full flex justify-center pb-20">
                    <PathMap onNodeClick={setSelectedNodeId} />
                </div>
            </div>

            {/* Lesson Modal */}
            <AnimatePresence>
                {selectedNodeId && (
                    <NodeLessonModal
                        nodeId={selectedNodeId}
                        onClose={() => setSelectedNodeId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
