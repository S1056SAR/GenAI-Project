"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, PhoneOff, Mic, MicOff, Volume2, Send, Loader2, MessageSquare, BookOpen, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

// ============================================================
// Voice Agent Section (60% - Left Panel)
// ============================================================

type CallStatus = "idle" | "connecting" | "active" | "ended"

function VoiceAgentPanel({ sessionName }: { sessionName: string }) {
    const [callStatus, setCallStatus] = useState<CallStatus>("idle")
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [response, setResponse] = useState("")

    const wsRef = useRef<WebSocket | null>(null)
    const recognitionRef = useRef<any>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    const getUserId = useCallback(() => {
        try {
            const token = localStorage.getItem("access_token")
            if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]))
                return payload.sub || "default_user"
            }
        } catch (e) { }
        return "default_user"
    }, [])

    useEffect(() => {
        if (typeof window !== "undefined") {
            synthRef.current = window.speechSynthesis

            if ("webkitSpeechRecognition" in window) {
                const SpeechRecognition = (window as any).webkitSpeechRecognition
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = true
                recognitionRef.current.interimResults = true
                recognitionRef.current.lang = "en-US"

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = ""
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript
                        }
                    }
                    if (finalTranscript) {
                        if (isSpeaking) interruptSpeech()
                        setTranscript(finalTranscript)
                        sendTextToAgent(finalTranscript)
                    }
                }

                recognitionRef.current.onerror = (e: any) => {
                    if (e.error !== "no-speech" && e.error !== "aborted") {
                        setIsListening(false)
                    }
                }

                recognitionRef.current.onend = () => {
                    if (callStatus === "active" && !isSpeaking) {
                        try { recognitionRef.current?.start() } catch { }
                    }
                }
            }
        }
    }, [callStatus, isSpeaking])

    const interruptSpeech = useCallback(() => {
        if (synthRef.current && isSpeaking) {
            synthRef.current.cancel()
            setIsSpeaking(false)
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "interrupt" }))
            }
        }
    }, [isSpeaking])

    const connectWebSocket = useCallback(() => {
        const clientId = `voice_${Date.now()}`
        const wsUrl = `ws://localhost:8000/voice/stream/${clientId}`
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
            setCallStatus("active")
            startListening()
        }

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === "text_response") {
                    setResponse(data.text)
                    speakResponse(data.text)
                } else if (data.type === "interrupted") {
                    setResponse("")
                } else if (data.type === "error") {
                    setResponse(`Error: ${data.message}`)
                }
            } catch { }
        }

        wsRef.current.onclose = () => {
            stopListening()
            setCallStatus("idle")
        }

        wsRef.current.onerror = () => setCallStatus("idle")
    }, [])

    const sendTextToAgent = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "text_input",
                text: text,
                user_id: getUserId(),
                session_name: sessionName
            }))
        }
    }, [getUserId, sessionName])

    const speakResponse = useCallback((text: string) => {
        if (synthRef.current) {
            stopListening()
            setIsSpeaking(true)

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = "en-US"
            utterance.rate = 1.0
            utterance.pitch = 1.0

            const voices = synthRef.current.getVoices()
            const englishVoice = voices.find(v =>
                v.lang === "en-US" && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Google"))
            ) || voices.find(v => v.lang.includes("en"))

            if (englishVoice) utterance.voice = englishVoice

            currentUtteranceRef.current = utterance

            utterance.onend = () => {
                setIsSpeaking(false)
                currentUtteranceRef.current = null
                if (callStatus === "active") startListening()
            }

            utterance.onerror = () => {
                setIsSpeaking(false)
                currentUtteranceRef.current = null
            }

            synthRef.current.speak(utterance)
        }
    }, [callStatus])

    const startListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start()
                setIsListening(true)
            } catch { }
        }
    }, [])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop()
                setIsListening(false)
            } catch { }
        }
    }, [])

    const startCall = () => {
        setCallStatus("connecting")
        setTranscript("")
        setResponse("")
        connectWebSocket()
    }

    const endCall = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "end_call" }))
        }
        wsRef.current?.close()
        stopListening()
        synthRef.current?.cancel()
        setIsSpeaking(false)
        setCallStatus("ended")
        setTimeout(() => setCallStatus("idle"), 2000)
    }

    return (
        <div className="flex flex-col items-center justify-center h-full relative">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-slate-900 to-slate-950 rounded-l-2xl" />

            <div className="relative z-10 flex flex-col items-center">
                {/* Avatar with pulse */}
                <motion.div
                    className="relative"
                    animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
                >
                    <AnimatePresence>
                        {(callStatus === "active" && (isListening || isSpeaking)) && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, scale: 1 }}
                                    animate={{ opacity: [0.5, 0], scale: [1, 1.8] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className={cn("absolute inset-0 rounded-full", isSpeaking ? "bg-purple-500" : "bg-cyan-500")}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 1 }}
                                    animate={{ opacity: [0.3, 0], scale: [1, 2.2] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                                    className={cn("absolute inset-0 rounded-full", isSpeaking ? "bg-purple-500" : "bg-cyan-500")}
                                />
                            </>
                        )}
                    </AnimatePresence>

                    <div className={cn(
                        "w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold shadow-2xl transition-all duration-300",
                        callStatus === "active"
                            ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white"
                            : callStatus === "connecting"
                                ? "bg-gradient-to-br from-yellow-500 to-orange-600 text-white animate-pulse"
                                : "bg-gradient-to-br from-slate-700 to-slate-800 text-gray-400"
                    )}>
                        V
                    </div>
                </motion.div>

                <h2 className="mt-4 text-xl font-bold text-white">Vidya Ma&apos;am</h2>
                <p className="text-gray-400 text-xs">Voice AI Teacher</p>

                {/* Status */}
                <div className="mt-3 flex items-center gap-2 h-5">
                    {callStatus === "active" && isListening && !isSpeaking && (
                        <>
                            <Mic className="w-3 h-3 text-cyan-400 animate-pulse" />
                            <span className="text-cyan-400 text-xs">Listening...</span>
                        </>
                    )}
                    {callStatus === "active" && isSpeaking && (
                        <>
                            <Volume2 className="w-3 h-3 text-purple-400 animate-pulse" />
                            <span className="text-purple-400 text-xs">Speaking...</span>
                        </>
                    )}
                    {callStatus === "connecting" && <span className="text-yellow-400 text-xs">Connecting...</span>}
                    {callStatus === "ended" && <span className="text-gray-400 text-xs">Call ended</span>}
                    {callStatus === "idle" && <span className="text-gray-500 text-xs">Tap to call</span>}
                </div>

                {/* Transcript */}
                {transcript && callStatus === "active" && (
                    <div className="mt-4 max-w-xs text-center">
                        <p className="text-xs text-gray-400">You said:</p>
                        <p className="text-white text-sm mt-1">&ldquo;{transcript}&rdquo;</p>
                    </div>
                )}

                {/* Response */}
                {response && callStatus === "active" && (
                    <div className="mt-3 max-w-xs text-center">
                        <p className="text-xs text-purple-400">Response:</p>
                        <p className="text-gray-300 text-xs mt-1 max-h-24 overflow-y-auto">{response}</p>
                    </div>
                )}

                {/* Call button */}
                <div className="mt-6">
                    {callStatus === "idle" || callStatus === "ended" ? (
                        <Button onClick={startCall} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30">
                            <Phone className="w-6 h-6" />
                        </Button>
                    ) : (
                        <Button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30">
                            <PhoneOff className="w-6 h-6" />
                        </Button>
                    )}
                </div>

                <p className="mt-4 text-gray-500 text-[10px] text-center max-w-[200px]">
                    {callStatus === "idle" ? "Start a voice call to ask doubts" : callStatus === "active" ? "Speak naturally in English" : ""}
                </p>
            </div>
        </div>
    )
}

// ============================================================
// Chat Section (40% - Right Panel)
// ============================================================

interface Message {
    role: "user" | "bot"
    content: string
    webSearchUsed?: boolean
}

function ChatPanel({ currentSession, setCurrentSession }: { currentSession: string; setCurrentSession: (s: string) => void }) {
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "Hi! I'm Vidya Ma'am. Type your doubts here or use voice call on the left! 📚" }
    ])
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [availableSessions, setAvailableSessions] = useState<{ name: string; document_count: number }[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadSessions()
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const loadSessions = async () => {
        try {
            const data = await api.tutor.getSessions()
            setAvailableSessions(data.sessions || [])
            if (data.sessions?.length > 0) {
                setCurrentSession(data.sessions[0].name)
            }
        } catch { }
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
        } catch {
            setMessages(prev => [...prev, { role: "bot", content: "Sorry, something went wrong. Please try again! 🙏" }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white/5 rounded-r-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white">Chat</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-gray-400" />
                    <select
                        value={currentSession}
                        onChange={(e) => setCurrentSession(e.target.value)}
                        className="bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    >
                        <option value="default">All Materials</option>
                        {availableSessions.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "")}
                        >
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                                msg.role === "bot" ? "bg-gradient-to-br from-cyan-500 to-purple-500 text-white" : "bg-purple-500/30 text-purple-300"
                            )}>
                                {msg.role === "bot" ? "V" : "Y"}
                            </div>
                            <div className={cn(
                                "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                                msg.role === "bot" ? "bg-white/10 text-gray-200" : "bg-purple-500/30 text-white"
                            )}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                {msg.webSearchUsed && (
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-cyan-400">
                                        <Search className="w-2.5 h-2.5" />
                                        <span>Web search</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <div className="bg-white/10 rounded-xl px-3 py-2">
                            <p className="text-gray-400 text-sm italic">Thinking...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type your doubt..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isLoading}
                        size="sm"
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ============================================================
// Main Page - 60/40 Split Layout
// ============================================================

export default function DoubtSolverPage() {
    const [currentSession, setCurrentSession] = useState("default")

    return (
        <div className="flex h-[calc(100vh-120px)] gap-0 rounded-2xl overflow-hidden border border-white/10">
            {/* Voice Agent - 60% */}
            <div className="w-[60%] border-r border-white/10">
                <VoiceAgentPanel sessionName={currentSession} />
            </div>

            {/* Chat - 40% */}
            <div className="w-[40%]">
                <ChatPanel currentSession={currentSession} setCurrentSession={setCurrentSession} />
            </div>
        </div>
    )
}
