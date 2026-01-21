"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Send, Loader2, MessageSquare, BookOpen, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "bot"
    content: string
    webSearchUsed?: boolean
}

export default function DoubtSolverPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "bot",
            content: "Namaste! Main hoon Vidya Ma'am, aapki AI teacher. 👋\n\nAap mujhse apne study materials ke baare mein koi bhi doubt pooch sakte ho. Main aapke uploaded notes se context leke, aur zaroorat pade toh web search karke best explanation doongi!\n\nShuru karein? 📚"
        }
    ])
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [currentSession, setCurrentSession] = useState("default")
    const [availableSessions, setAvailableSessions] = useState<{ name: string, document_count: number }[]>([])

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        loadSessions()
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = false
            recognitionRef.current.lang = "hi-IN"

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                setInputText(transcript)
                setIsListening(false)
            }

            recognitionRef.current.onerror = () => setIsListening(false)
            recognitionRef.current.onend = () => setIsListening(false)
        }
    }, [])

    const loadSessions = async () => {
        try {
            const data = await api.tutor.getSessions()
            setAvailableSessions(data.sessions || [])
            if (data.sessions?.length > 0) {
                setCurrentSession(data.sessions[0].name)
            }
        } catch (error) {
            console.error("Failed to load sessions:", error)
        }
    }

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported. Please use Chrome or Edge.")
            return
        }
        if (isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
        } else {
            recognitionRef.current.start()
            setIsListening(true)
        }
    }

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return

        const userMessage = inputText.trim()
        setInputText("")
        setMessages(prev => [...prev, { role: "user", content: userMessage }])
        setIsLoading(true)

        try {
            const response = await api.doubt.ask(userMessage, currentSession)
            setMessages(prev => [...prev, {
                role: "bot",
                content: response.answer,
                webSearchUsed: response.web_search_used
            }])
        } catch (error) {
            console.error("Error:", error)
            setMessages(prev => [...prev, {
                role: "bot",
                content: "Sorry beta, kuch technical problem ho gaya. Please dobara try karo! 🙏"
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-120px)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 shadow-lg">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Doubt Solver</h1>
                        <p className="text-sm text-gray-400">Ask Vidya Ma&apos;am anything!</p>
                    </div>
                </div>

                {/* Session Selector */}
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <select
                        value={currentSession}
                        onChange={(e) => setCurrentSession(e.target.value)}
                        className="bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                        <option value="default">All Materials</option>
                        {availableSessions.map((s) => (
                            <option key={s.name} value={s.name}>
                                {s.name} ({s.document_count} docs)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex gap-3",
                                msg.role === "user" ? "flex-row-reverse" : ""
                            )}
                        >
                            <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold",
                                msg.role === "bot"
                                    ? "bg-gradient-to-br from-cyan-500 to-purple-500 text-white"
                                    : "bg-purple-500/30 text-purple-300"
                            )}>
                                {msg.role === "bot" ? "V" : "Y"}
                            </div>
                            <div className={cn(
                                "max-w-[70%] rounded-2xl px-4 py-3",
                                msg.role === "bot"
                                    ? "bg-white/10 text-gray-200 rounded-tl-sm"
                                    : "bg-purple-500/30 text-white rounded-tr-sm"
                            )}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                {msg.webSearchUsed && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-cyan-400">
                                        <Search className="w-3 h-3" />
                                        <span>Web search used</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                        <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                            <p className="text-gray-400 italic">Vidya Ma&apos;am soch rahi hai...</p>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-white/5 rounded-b-2xl">
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleListening}
                        className={cn(
                            "shrink-0 border-white/20 h-12 w-12",
                            isListening && "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                        )}
                    >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>

                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type your doubt here..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
                    />

                    <Button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isLoading}
                        className="shrink-0 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 h-12 px-6"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </div>

                {isListening && (
                    <p className="text-sm text-cyan-400 mt-2 text-center animate-pulse">
                        🎤 Listening... Speak your doubt in Hindi or English
                    </p>
                )}
            </div>
        </div>
    )
}
