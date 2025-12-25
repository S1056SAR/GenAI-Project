"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Mic, Volume2, Sparkles, Pause, Play } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function TutorMode() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI tutor. What would you like to learn about today? I can help you explore any topic and create visual mindmaps to enhance your understanding.",
    },
  ])
  const [input, setInput] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "That's a great question! Let me break this down for you and create a visual representation on the mindmap canvas.",
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-[calc(100vh-3rem)] flex gap-6"
    >
      {/* Knowledge Canvas */}
      <div className="flex-1 glass-card rounded-3xl overflow-hidden relative">
        {/* Dotted grid background with parallax */}
        <motion.div
          animate={{ x: [0, 10, 0], y: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="absolute inset-0 dotted-grid opacity-50"
        />

        {/* Canvas placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 mx-auto mb-4 flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-cyan-400" />
            </motion.div>
            <h3 className="text-xl font-medium text-foreground mb-2">Knowledge Canvas</h3>
            <p className="text-muted-foreground max-w-xs">
              Start a conversation to generate an interactive mindmap here
            </p>
          </div>
        </div>

        {/* Sample mindmap nodes */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute top-1/4 left-1/4"
        >
          <div className="glass rounded-xl px-4 py-2 text-sm text-foreground/70">Machine Learning</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute top-1/3 right-1/3"
        >
          <div className="glass rounded-xl px-4 py-2 text-sm text-foreground/70">Neural Networks</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="absolute bottom-1/3 left-1/3"
        >
          <div className="glass rounded-xl px-4 py-2 text-sm text-foreground/70">Deep Learning</div>
        </motion.div>
      </div>

      {/* Assistant Panel */}
      <div className="w-96 flex flex-col gap-4">
        {/* Chat panel */}
        <div className="flex-1 glass-card rounded-3xl flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white"
                        : "glass text-foreground"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask anything..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl glass hover:bg-white/10 transition-colors"
              >
                <Mic className="w-5 h-5 text-muted-foreground" />
              </motion.button>
              <motion.button
                onClick={handleSend}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 transition-opacity"
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Audio Player - Waveform visualizer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => setIsPlaying(!isPlaying)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </motion.button>

            {/* Waveform visualization */}
            <div className="flex-1 flex items-center gap-1 h-8">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={
                    isPlaying
                      ? {
                          height: [8, Math.random() * 24 + 8, 8],
                        }
                      : { height: 8 }
                  }
                  transition={{
                    duration: 0.5,
                    repeat: isPlaying ? Number.POSITIVE_INFINITY : 0,
                    delay: i * 0.05,
                  }}
                  className="w-1 bg-gradient-to-t from-cyan-500 to-purple-600 rounded-full"
                />
              ))}
            </div>

            <Volume2 className="w-5 h-5 text-muted-foreground" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
