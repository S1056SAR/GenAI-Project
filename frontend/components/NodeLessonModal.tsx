"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, PlayCircle, CheckCircle2, ArrowRight, RotateCcw, Loader2, BookOpen } from "lucide-react"
import { useState, useEffect } from "react"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'

interface NodeLessonModalProps {
    nodeId: string | null
    onClose: () => void
}

export default function NodeLessonModal({ nodeId, onClose }: NodeLessonModalProps) {
    const { toast } = useToast()
    const { learningPath, currentPathId, completeNode, unlockNextNode, unlockNode } = useStore()
    const [phase, setPhase] = useState<"loading" | "teach" | "test" | "result">("loading")
    const [content, setContent] = useState<any>(null)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<number[]>([]) // Index of selected options
    const [result, setResult] = useState<any>(null)

    const node = learningPath.find((n) => n.id === nodeId)

    useEffect(() => {
        if (!nodeId || !currentPathId) return

        const fetchData = async () => {
            setPhase("loading")
            try {
                const data = await api.journey.getNode(currentPathId, nodeId)
                setContent(data)
                setPhase("teach")
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error loading lesson",
                    description: error.message
                })
                onClose()
            }
        }

        fetchData()
    }, [nodeId, currentPathId, onClose, toast])

    if (!node || !nodeId) return null

    const handleAnswerSelect = (optionIndex: number) => {
        // Simple single choice for now
        const newAnswers = [...answers]
        newAnswers[currentQuestionIndex] = optionIndex
        setAnswers(newAnswers)
    }

    const handleNextQuestion = () => {
        if (currentQuestionIndex < (content.quiz_questions.length - 1)) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            handleSubmitQuiz()
        }
    }

    const handleSubmitQuiz = async () => {
        setPhase("loading")
        try {
            // Frontend answers index -> Backend might expect option index (0-3)
            const resultData = await api.journey.submitQuiz(currentPathId!, nodeId, answers)
            setResult(resultData)
            setPhase("result")

            if (resultData.result === "pass") {
                completeNode(nodeId)

                // Use explicit next node ID from backend if available
                if (resultData.next_node_id) {
                    unlockNode(resultData.next_node_id)
                } else {
                    // Fallback to traversing linear list
                    unlockNextNode(nodeId)
                }

                toast({
                    title: "Quiz Passed!",
                    description: "Next node unlocked."
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "Quiz Failed",
                    description: `Score: ${resultData.score}%. Need 70% to pass.`
                })
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Submission Error",
                description: error.message
            })
            setPhase("test") // Go back to test
        }
    }

    const handleRetry = () => {
        setAnswers([])
        setCurrentQuestionIndex(0)
        setPhase("teach")
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0c29] shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4 shrink-0">
                        <h3 className="text-lg font-semibold text-white">{node.label}</h3>
                        <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        {phase === "loading" && (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
                            </div>
                        )}

                        {phase === "teach" && content && (
                            <div className="space-y-6">
                                <div className="prose prose-invert max-w-none">
                                    <ReactMarkdown>{content.content_summary || "No content available."}</ReactMarkdown>
                                </div>

                                <button
                                    onClick={() => setPhase("test")}
                                    className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-transform hover:scale-[1.02]"
                                >
                                    Start Quiz
                                </button>
                            </div>
                        )}

                        {phase === "test" && content && (
                            <div className="space-y-6 max-w-xl mx-auto py-8">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-gray-400">Question {currentQuestionIndex + 1} of {content.quiz_questions.length}</span>
                                    <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-500 transition-all duration-300"
                                            style={{ width: `${((currentQuestionIndex + 1) / content.quiz_questions.length) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-white/5 p-6 min-h-[300px] flex flex-col">
                                    <h4 className="mb-6 text-lg font-medium text-white">
                                        {content.quiz_questions?.[currentQuestionIndex]?.question || "Question not available"}
                                    </h4>

                                    <div className="space-y-3 flex-1">
                                        {(content.quiz_questions?.[currentQuestionIndex]?.options || []).map((opt: string, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => handleAnswerSelect(i)}
                                                className={`w-full rounded-lg border p-4 text-left transition-all ${answers[currentQuestionIndex] === i
                                                    ? "border-cyan-500 bg-cyan-500/20 text-white"
                                                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-cyan-500/50"
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={handleNextQuestion}
                                            disabled={answers[currentQuestionIndex] === undefined}
                                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {currentQuestionIndex === content.quiz_questions.length - 1 ? "Submit" : "Next"}
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {phase === "result" && result && (
                            <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                                {result.result === "pass" ? (
                                    <>
                                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/50">
                                            <CheckCircle2 className="h-10 w-10 text-green-400" />
                                        </div>
                                        <h4 className="text-2xl font-bold text-white">Lesson Completed!</h4>
                                        <p className="mt-2 text-gray-400">Score: {result.score}%</p>
                                        <p className="mt-1 text-sm text-gray-500">You've mastered this topic. Next level unlocked.</p>
                                        <button
                                            onClick={onClose}
                                            className="mt-8 flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-medium text-white hover:bg-white/20"
                                        >
                                            Continue Journey <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/50">
                                            <RotateCcw className="h-10 w-10 text-red-400" />
                                        </div>
                                        <h4 className="text-2xl font-bold text-white">Try Again</h4>
                                        <p className="mt-2 text-gray-400">Score: {result.score}%</p>
                                        <p className="mt-1 text-sm text-gray-500">Review the material and retake the quiz.</p>
                                        <button
                                            onClick={handleRetry}
                                            className="mt-8 rounded-xl bg-white/10 px-6 py-3 font-medium text-white hover:bg-white/20"
                                        >
                                            Restart Lesson
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
