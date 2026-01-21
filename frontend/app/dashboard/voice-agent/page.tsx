"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CallStatus = "idle" | "connecting" | "active" | "ended"

export default function VoiceAgentPage() {
    const [callStatus, setCallStatus] = useState<CallStatus>("idle")
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [response, setResponse] = useState("")

    const wsRef = useRef<WebSocket | null>(null)
    const recognitionRef = useRef<any>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    // Get user ID from JWT token
    const getUserId = useCallback(() => {
        try {
            const token = localStorage.getItem("access_token")
            if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]))
                return payload.sub || "default_user"
            }
        } catch (e) {
            console.log("Could not parse token for user_id")
        }
        return "default_user"
    }, [])

    // Initialize speech recognition
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
                        // If agent is speaking, interrupt it
                        if (isSpeaking) {
                            interruptSpeech()
                        }
                        setTranscript(finalTranscript)
                        sendTextToAgent(finalTranscript)
                    }
                }

                recognitionRef.current.onerror = (e: any) => {
                    console.error("Speech recognition error:", e)
                    if (e.error !== "no-speech" && e.error !== "aborted") {
                        setIsListening(false)
                    }
                }

                recognitionRef.current.onend = () => {
                    // Auto-restart if call is still active
                    if (callStatus === "active" && !isSpeaking) {
                        try {
                            recognitionRef.current?.start()
                        } catch (e) {
                            // Ignore - might already be running
                        }
                    }
                }
            }
        }
    }, [callStatus, isSpeaking])

    // Interrupt speech when user starts talking
    const interruptSpeech = useCallback(() => {
        if (synthRef.current && isSpeaking) {
            synthRef.current.cancel()
            setIsSpeaking(false)

            // Notify backend of interruption
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "interrupt" }))
            }
        }
    }, [isSpeaking])

    // Connect to WebSocket
    const connectWebSocket = useCallback(() => {
        const clientId = `voice_${Date.now()}`
        const wsUrl = `ws://localhost:8000/voice/stream/${clientId}`

        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
            console.log("WebSocket connected")
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
                    // Agent acknowledged interruption
                    setResponse("")
                } else if (data.type === "error") {
                    console.error("Voice agent error:", data.message)
                    setResponse(`Error: ${data.message}`)
                } else if (data.type === "call_ended") {
                    setCallStatus("ended")
                }
            } catch (e) {
                console.error("Failed to parse message:", e)
            }
        }

        wsRef.current.onclose = () => {
            console.log("WebSocket disconnected")
            stopListening()
            setCallStatus("idle")
        }

        wsRef.current.onerror = (error) => {
            console.error("WebSocket error:", error)
            setCallStatus("idle")
        }
    }, [])

    const sendTextToAgent = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "text_input",
                text: text,
                user_id: getUserId(),
                session_name: "default"
            }))
        }
    }, [getUserId])

    const speakResponse = useCallback((text: string) => {
        if (synthRef.current) {
            // Stop listening while speaking
            stopListening()
            setIsSpeaking(true)

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = "en-US"
            utterance.rate = 1.0
            utterance.pitch = 1.0

            // Find a good English voice
            const voices = synthRef.current.getVoices()
            const englishVoice = voices.find(v =>
                v.lang === "en-US" && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Google"))
            ) || voices.find(v => v.lang.includes("en"))

            if (englishVoice) {
                utterance.voice = englishVoice
            }

            currentUtteranceRef.current = utterance

            utterance.onend = () => {
                setIsSpeaking(false)
                currentUtteranceRef.current = null
                // Resume listening after speaking
                if (callStatus === "active") {
                    startListening()
                }
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
            } catch (e) {
                // Might already be running
            }
        }
    }, [])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop()
                setIsListening(false)
            } catch (e) {
                // Ignore
            }
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
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] relative">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-slate-900 to-slate-950 rounded-2xl" />

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Avatar */}
                <motion.div
                    className="relative"
                    animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
                >
                    {/* Pulse rings */}
                    <AnimatePresence>
                        {(callStatus === "active" && (isListening || isSpeaking)) && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, scale: 1 }}
                                    animate={{ opacity: [0.5, 0], scale: [1, 1.8] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className={cn(
                                        "absolute inset-0 rounded-full",
                                        isSpeaking ? "bg-purple-500" : "bg-cyan-500"
                                    )}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 1 }}
                                    animate={{ opacity: [0.3, 0], scale: [1, 2.2] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                                    className={cn(
                                        "absolute inset-0 rounded-full",
                                        isSpeaking ? "bg-purple-500" : "bg-cyan-500"
                                    )}
                                />
                            </>
                        )}
                    </AnimatePresence>

                    {/* Avatar circle */}
                    <div className={cn(
                        "w-40 h-40 rounded-full flex items-center justify-center text-6xl font-bold shadow-2xl transition-all duration-300",
                        callStatus === "active"
                            ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white"
                            : callStatus === "connecting"
                                ? "bg-gradient-to-br from-yellow-500 to-orange-600 text-white animate-pulse"
                                : "bg-gradient-to-br from-slate-700 to-slate-800 text-gray-400"
                    )}>
                        V
                    </div>
                </motion.div>

                {/* Name */}
                <h1 className="mt-6 text-2xl font-bold text-white">Vidya Ma&apos;am</h1>
                <p className="text-gray-400 text-sm">AI Voice Teacher</p>

                {/* Status */}
                <div className="mt-4 flex items-center gap-2">
                    {callStatus === "active" && isListening && !isSpeaking && (
                        <>
                            <Mic className="w-4 h-4 text-cyan-400 animate-pulse" />
                            <span className="text-cyan-400 text-sm">Listening...</span>
                        </>
                    )}
                    {callStatus === "active" && isSpeaking && (
                        <>
                            <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                            <span className="text-purple-400 text-sm">Speaking... (interrupt anytime)</span>
                        </>
                    )}
                    {callStatus === "connecting" && (
                        <span className="text-yellow-400 text-sm">Connecting...</span>
                    )}
                    {callStatus === "ended" && (
                        <span className="text-gray-400 text-sm">Call ended</span>
                    )}
                    {callStatus === "idle" && (
                        <span className="text-gray-500 text-sm">Tap to start a call</span>
                    )}
                </div>

                {/* Transcript display */}
                {transcript && callStatus === "active" && (
                    <div className="mt-6 max-w-md text-center">
                        <p className="text-sm text-gray-400">You said:</p>
                        <p className="text-white mt-1">&ldquo;{transcript}&rdquo;</p>
                    </div>
                )}

                {/* Response display */}
                {response && callStatus === "active" && (
                    <div className="mt-4 max-w-md text-center">
                        <p className="text-sm text-purple-400">Vidya Ma&apos;am:</p>
                        <p className="text-gray-300 mt-1 text-sm">{response}</p>
                    </div>
                )}

                {/* Call button */}
                <div className="mt-10">
                    {callStatus === "idle" || callStatus === "ended" ? (
                        <Button
                            onClick={startCall}
                            size="lg"
                            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                        >
                            <Phone className="w-8 h-8" />
                        </Button>
                    ) : (
                        <Button
                            onClick={endCall}
                            size="lg"
                            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
                        >
                            <PhoneOff className="w-8 h-8" />
                        </Button>
                    )}
                </div>

                {/* Instructions */}
                <p className="mt-6 text-gray-500 text-xs text-center max-w-sm">
                    {callStatus === "idle"
                        ? "Start a voice call with Vidya Ma'am. Ask your doubts in English."
                        : callStatus === "active"
                            ? "Speak naturally. You can interrupt anytime by speaking."
                            : ""
                    }
                </p>
            </div>
        </div>
    )
}
