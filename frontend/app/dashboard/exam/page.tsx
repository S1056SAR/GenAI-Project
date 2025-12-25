"use client"

import { motion } from "framer-motion"
import { Upload, FileText, AlertCircle, Loader2, Download, CheckCircle, BookOpen } from "lucide-react"
import { useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function ExamPage() {
    const { toast } = useToast()
    const [syllabus, setSyllabus] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleGenerate = async () => {
        if (!syllabus.trim()) {
            toast({
                variant: "destructive",
                title: "Empty Syllabus",
                description: "Please enter the syllabus topics first."
            })
            return
        }

        setIsGenerating(true)
        setResult(null)

        try {
            // Call Backend
            // Call Backend (Filter removed for broad search)
            const data = await api.exam.generate(syllabus, undefined)
            setResult(data)
            toast({
                title: "Exam Generated!",
                description: `Created exam with ${data.questions?.length || 0} questions.`
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: error.message
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] w-full gap-6 p-4">
            {!result ? (
                <div className="flex h-full flex-col items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-8"
                    >
                        <div className="mb-8 text-center">
                            <h2 className="text-3xl font-bold text-white glow-text">Examiner Mode</h2>
                            <p className="mt-2 text-gray-400">Generate a structured exam paper from your syllabus.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    className="w-full h-40 rounded-xl bg-black/20 border border-white/10 p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                                    placeholder="Paste your syllabus here (e.g., Unit 1: Thermodynamics...)"
                                    value={syllabus}
                                    onChange={(e) => setSyllabus(e.target.value)}
                                />
                                <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                                    {syllabus.length} chars
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !syllabus.trim()}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 font-bold text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Generating Exam Structure...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-5 w-5" />
                                        Generate Exam Paper
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : (
                <div className="flex h-full gap-6 overflow-hidden">
                    {/* Left: Summary & Action */}
                    <div className="w-1/3 flex flex-col gap-6">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Generation Complete</h3>
                                    <p className="text-sm text-gray-400">Ready for review</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Total Marks</span>
                                    <span className="text-white font-mono">100</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Sections</span>
                                    <span className="text-white font-mono">3 (A, B, C)</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Questions</span>
                                    <span className="text-white font-mono">{result.questions?.length || "N/A"}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (result.pdf_path) {
                                        // result.pdf_path is absolute path from backend. 
                                        // We need to extract filename and use the mounted static route.
                                        // Backend path: f:/genai project/EduSynth_Exam_xxxx.pdf
                                        // URL: http://127.0.0.1:8000/downloads/EduSynth_Exam_xxxx.pdf
                                        const filename = result.pdf_path.split(/[\\/]/).pop()
                                        const downloadUrl = `http://127.0.0.1:8000/downloads/${filename}`
                                        window.open(downloadUrl, '_blank')
                                    }
                                }}
                                className="w-full py-3 rounded-xl bg-white/10 border border-white/10 text-white font-semibold hover:bg-white/20 flex items-center justify-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download PDF
                            </button>
                        </motion.div>

                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col">
                            <h4 className="font-semibold text-white mb-4">Syllabus Context</h4>
                            <div className="flex-1 overflow-y-auto text-sm text-gray-400 custom-scrollbar whitespace-pre-wrap">
                                {syllabus}
                            </div>
                        </div>
                    </div>

                    {/* Right: Question Preview */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8 overflow-y-auto custom-scrollbar">
                        <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">Exam Preview</h3>

                        {result.questions?.map((q: any, i: number) => (
                            <div key={i} className="mb-6 p-4 rounded-xl bg-black/20 border border-white/5 hover:border-cyan-500/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">
                                        Q{i + 1}
                                    </span>
                                    <span className="text-gray-500 text-sm">{q.marks} Marks</span>
                                </div>
                                <p className="text-gray-200 text-lg mb-3 font-medium">{q.text}</p>

                                {q.citations && q.citations.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {q.citations.map((cit: string, j: number) => (
                                            <div key={j} className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                                                <BookOpen className="h-3 w-3" />
                                                {cit}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
