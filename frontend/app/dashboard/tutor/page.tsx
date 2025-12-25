"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Send, Mic, Paperclip, Bot, User, Upload, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import MediaCanvas from "@/components/MediaCanvas"
import { cn } from "@/lib/utils"
// Import Unified API
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type UploadStatus = "idle" | "processing" | "complete" | "error"

type Message = {
    role: "user" | "bot"
    content: string
}

const processingSteps = [
    { label: "Parsing Documents...", delay: 0 },
    { label: "Vectorizing Content...", delay: 1000 },
    { label: "Constructing Knowledge Graph...", delay: 2000 },
]

export default function TutorPage() {
    const { toast } = useToast()
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
    const [currentStep, setCurrentStep] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [stagedFiles, setStagedFiles] = useState<File[]>([])

    // Session State
    const [currentSession, setCurrentSession] = useState<string>("default")
    const [sessionNameInput, setSessionNameInput] = useState<string>("")
    const [availableSessions, setAvailableSessions] = useState<{ name: string, document_count: number }[]>([])

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "Upload your materials to start. I'm ready to learn." }
    ])

    // History arrays for generated content
    type HistoryItem<T> = { data: T; timestamp: string; query: string }
    const [mindmapHistory, setMindmapHistory] = useState<HistoryItem<string>[]>([])
    const [flashcardHistory, setFlashcardHistory] = useState<HistoryItem<any[]>[]>([])
    const [audioHistory, setAudioHistory] = useState<HistoryItem<string>[]>([])

    // Current selection index for each type
    const [selectedMindmapIndex, setSelectedMindmapIndex] = useState(0)
    const [selectedFlashcardIndex, setSelectedFlashcardIndex] = useState(0)
    const [selectedAudioIndex, setSelectedAudioIndex] = useState(0)

    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Load available sessions on mount
    useEffect(() => {
        const loadSessions = async () => {
            try {
                const data = await api.tutor.getSessions()
                setAvailableSessions(data.sessions || [])
            } catch (e) {
                console.log("No sessions found or error loading sessions")
            }
        }
        loadSessions()
    }, [])

    // Stage files for later submission (don't upload immediately)
    const handleAddFiles = (files?: FileList | File[]) => {
        if (!files || files.length === 0) return
        const newFiles = Array.from(files)
        setStagedFiles(prev => [...prev, ...newFiles])
        toast({
            title: "Files Added",
            description: `${newFiles.length} file(s) added. Click Submit to upload.`
        })
    }

    // Remove a file from staged list
    const handleRemoveFile = (index: number) => {
        setStagedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpload = async (files?: FileList | File[]) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files)

        // Use provided session name or generate one from first file
        const sessionName = sessionNameInput.trim() ||
            fileArray[0].name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9\s]/g, "").slice(0, 30) ||
            "study_session"

        setUploadStatus("processing")
        setCurrentStep(0)

        // Show mock steps for visual feedback
        const stepInterval = setInterval(() => {
            setCurrentStep(prev => (prev < 2 ? prev + 1 : prev))
        }, 1500)

        try {
            // Real Backend Ingestion with session name
            const response = await api.tutor.ingest(fileArray, sessionName)

            clearInterval(stepInterval)
            setCurrentStep(2)

            // Set as current session and refresh session list
            setCurrentSession(sessionName)
            const sessionsData = await api.tutor.getSessions()
            setAvailableSessions(sessionsData.sessions || [])
            setStagedFiles([])
            setSessionNameInput("")

            setTimeout(() => {
                setUploadStatus("complete")
                const msg = `Created session "${sessionName}" with ${response.summary}. Ready for questions!`
                setMessages(prev => [...prev, { role: "bot", content: msg }])
            }, 500)

        } catch (error: any) {
            clearInterval(stepInterval)
            setUploadStatus("error")
            toast({
                variant: "destructive",
                title: "Ingestion Failed",
                description: error.message || "Could not process files."
            })
        }
    }

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMsg = input
        setInput("")
        setMessages(prev => [...prev, { role: "user", content: userMsg }])
        setIsLoading(true)

        try {
            // Determine if audio is requested
            const wantsAudio = userMsg.toLowerCase().includes("generate audio") ||
                userMsg.toLowerCase().includes("play audio") ||
                userMsg.toLowerCase().includes("podcast") ||
                userMsg.toLowerCase().includes("in hindi") ||
                userMsg.toLowerCase().includes("in tamil")

            // Pass current session for context isolation
            const response = await api.tutor.startSession(userMsg, wantsAudio, "hi-IN", currentSession)
            const timestamp = new Date().toLocaleTimeString()

            // Add to history arrays instead of replacing
            if (response.mindmap_source) {
                setMindmapHistory(prev => {
                    const newHistory = [...prev, { data: response.mindmap_source, timestamp, query: userMsg }]
                    setSelectedMindmapIndex(newHistory.length - 1)
                    return newHistory
                })
            }
            if (response.flashcards && response.flashcards.length > 0) {
                setFlashcardHistory(prev => {
                    const newHistory = [...prev, { data: response.flashcards, timestamp, query: userMsg }]
                    setSelectedFlashcardIndex(newHistory.length - 1)
                    return newHistory
                })
            }
            if (response.audio_base64) {
                setAudioHistory(prev => {
                    const newHistory = [...prev, { data: response.audio_base64, timestamp, query: userMsg }]
                    setSelectedAudioIndex(newHistory.length - 1)
                    return newHistory
                })
            }

            setMessages(prev => [...prev, { role: "bot", content: response.response }])

        } catch (error: any) {
            setMessages(prev => [...prev, { role: "bot", content: "Sorry, I can't answer that right now." }])
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="h-[calc(100vh-8rem)] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm relative">
            <AnimatePresence mode="wait">
                {uploadStatus === "idle" || uploadStatus === "processing" ? (
                    <motion.div
                        key="ingestion"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f0c29]/90 backdrop-blur-xl"
                    >
                        <div className="w-full max-w-lg p-8">
                            {uploadStatus === "idle" ? (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center"
                                >
                                    <h2 className="mb-6 text-3xl font-bold text-white glow-text">Initialize Session</h2>

                                    <label htmlFor="tutor-upload" className="block w-full">
                                        <div
                                            onDragOver={(e) => {
                                                e.preventDefault()
                                                setIsDragging(true)
                                            }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault()
                                                setIsDragging(false)
                                                const droppedFiles = e.dataTransfer.files
                                                if (droppedFiles.length > 0) handleAddFiles(droppedFiles)
                                            }}
                                            className={cn(
                                                "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
                                                isDragging
                                                    ? "border-cyan-500 bg-cyan-500/10 scale-105"
                                                    : "border-white/20 bg-white/5 hover:border-cyan-500/50 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="py-10">
                                                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                                                    <Upload className="h-6 w-6 text-cyan-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-white">Add Files</h3>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    Drop PDF/DOCX/TXT files or click to browse
                                                </p>
                                            </div>
                                            <input
                                                id="tutor-upload"
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.docx,.txt"
                                                multiple
                                                onChange={(e) => {
                                                    const files = e.target.files
                                                    if (files && files.length > 0) handleAddFiles(files)
                                                    e.target.value = "" // Reset to allow same file
                                                }}
                                            />
                                        </div>
                                    </label>

                                    {/* Staged Files List */}
                                    {stagedFiles.length > 0 && (
                                        <div className="mt-6 text-left">
                                            <h4 className="text-sm font-medium text-gray-400 mb-3">
                                                {stagedFiles.length} file(s) ready to upload:
                                            </h4>
                                            <div className="max-h-40 overflow-y-auto space-y-2">
                                                {stagedFiles.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <FileText className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                                                            <span className="text-sm text-white truncate">{file.name}</span>
                                                            <span className="text-xs text-gray-500">
                                                                ({(file.size / 1024).toFixed(1)} KB)
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveFile(index)}
                                                            className="text-red-400 hover:text-red-300 text-sm px-2"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Session Name Input */}
                                            <div className="mt-4 space-y-3">
                                                <label className="block text-sm text-gray-400">
                                                    Session Name (e.g., "Green Technology", "Compiler Design")
                                                </label>
                                                <input
                                                    type="text"
                                                    value={sessionNameInput}
                                                    onChange={(e) => setSessionNameInput(e.target.value)}
                                                    placeholder="Enter a name for this study session..."
                                                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                                                />

                                                {availableSessions.length > 0 && (
                                                    <div>
                                                        <span className="text-xs text-gray-500">Or add to existing session:</span>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {availableSessions.map((session) => (
                                                                <button
                                                                    key={session.name}
                                                                    onClick={() => setSessionNameInput(session.name)}
                                                                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${sessionNameInput === session.name
                                                                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-400"
                                                                        : "border-white/10 text-gray-400 hover:border-cyan-500/50"
                                                                        }`}
                                                                >
                                                                    {session.name} ({session.document_count} docs)
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Submit Button */}
                                            <button
                                                onClick={() => handleUpload(stagedFiles)}
                                                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity"
                                            >
                                                Create Session & Index {stagedFiles.length} File(s)
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-cyan-400" />
                                        <h3 className="mt-4 text-xl font-semibold text-white">Ingesting Context</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {processingSteps.map((step, index) => (
                                            <motion.div
                                                key={step.label}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{
                                                    opacity: index <= currentStep ? 1 : 0.3,
                                                    x: 0
                                                }}
                                                className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4"
                                            >
                                                <div className={cn(
                                                    "flex h-8 w-8 items-center justify-center rounded-full ring-1",
                                                    index < currentStep
                                                        ? "bg-green-500/20 ring-green-500/50 text-green-400"
                                                        : index === currentStep
                                                            ? "bg-cyan-500/20 ring-cyan-500/50 text-cyan-400 animate-pulse"
                                                            : "bg-white/5 ring-white/10 text-gray-500"
                                                )}>
                                                    {index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    index <= currentStep ? "text-white" : "text-gray-500"
                                                )}>
                                                    {step.label}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {/* Main Dashboard Content */}
            <ResizablePanelGroup direction="horizontal">
                {/* Chat Section */}
                <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                    <div className="flex h-full flex-col">
                        <div className="border-b border-white/10 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-white">AI Tutor Chat</h3>
                                    <p className="text-xs text-gray-400">
                                        Session: <span className="text-cyan-400">{currentSession}</span>
                                    </p>
                                </div>
                                {availableSessions.length > 0 && (
                                    <select
                                        value={currentSession}
                                        onChange={(e) => setCurrentSession(e.target.value)}
                                        className="text-xs bg-white/10 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        {availableSessions.map((s) => (
                                            <option key={s.name} value={s.name} className="bg-gray-900">
                                                {s.name} ({s.document_count} docs)
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className={cn(
                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                        msg.role === "bot" ? "bg-cyan-500/20" : "bg-purple-500/20"
                                    )}>
                                        {msg.role === "bot" ? <Bot className="h-4 w-4 text-cyan-400" /> : <User className="h-4 w-4 text-purple-400" />}
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl p-3 text-sm",
                                        msg.role === "bot" ? "rounded-tl-none bg-white/10 text-gray-200" : "rounded-tr-none bg-purple-500/20 text-white"
                                    )}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />

                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
                                        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                                    </div>
                                    <div className="rounded-2xl rounded-tl-none bg-white/10 p-3 text-sm text-gray-400 italic">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-white/10 p-4">
                            <div className="relative flex items-center gap-2 rounded-xl bg-white/5 p-2 ring-1 ring-white/10 focus-within:ring-cyan-500/50">
                                <button className="p-2 text-gray-400 hover:text-white">
                                    <Paperclip className="h-4 w-4" />
                                </button>
                                <input
                                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                                    placeholder="Ask a question..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                />
                                <button className="p-2 text-gray-400 hover:text-white">
                                    <Mic className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !input.trim()}
                                    className="rounded-lg bg-cyan-600 p-2 text-white hover:bg-cyan-500 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-white/10" />

                {/* Media Canvas Section */}
                <ResizablePanel defaultSize={70}>
                    <MediaCanvas
                        mindmapCode={mindmapHistory[selectedMindmapIndex]?.data || null}
                        flashcards={flashcardHistory[selectedFlashcardIndex]?.data || null}
                        audioBase64={audioHistory[selectedAudioIndex]?.data || null}
                        mindmapHistory={mindmapHistory}
                        flashcardHistory={flashcardHistory}
                        audioHistory={audioHistory}
                        selectedMindmapIndex={selectedMindmapIndex}
                        selectedFlashcardIndex={selectedFlashcardIndex}
                        selectedAudioIndex={selectedAudioIndex}
                        onSelectMindmap={setSelectedMindmapIndex}
                        onSelectFlashcard={setSelectedFlashcardIndex}
                        onSelectAudio={setSelectedAudioIndex}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}

