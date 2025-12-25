"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, Sparkles, Download, Eye, CheckCircle } from "lucide-react"

type ProcessState = "idle" | "uploading" | "processing" | "complete"

export default function ExaminerMode() {
  const [processState, setProcessState] = useState<ProcessState>("idle")
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    simulateProcessing()
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const simulateProcessing = () => {
    setProcessState("uploading")
    setProgress(0)

    const uploadInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 30) {
          clearInterval(uploadInterval)
          setProcessState("processing")
          return prev
        }
        return prev + 5
      })
    }, 100)

    setTimeout(() => {
      const processInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(processInterval)
            setProcessState("complete")
            return 100
          }
          return prev + 2
        })
      }, 50)
    }, 700)
  }

  const resetState = () => {
    setProcessState("idle")
    setProgress(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-foreground">Smart Examiner</h2>
        <p className="text-muted-foreground">Upload your documents and let AI create comprehensive study materials</p>
      </div>

      <AnimatePresence mode="wait">
        {processState === "idle" && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={simulateProcessing}
            className={`
              relative glass-card rounded-3xl p-12 cursor-pointer transition-all duration-300
              ${isDragging ? "scanner-pulse border-cyan-500/50" : "hover:border-white/20"}
            `}
          >
            {/* Sci-fi scanner effect */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <motion.div
                animate={isDragging ? { y: ["0%", "100%", "0%"] } : {}}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"
              />
              {/* Corner accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-500/50 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-500/50 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-500/50 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-500/50 rounded-br-lg" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className={`
                  w-24 h-24 rounded-full flex items-center justify-center mb-6
                  ${isDragging ? "bg-cyan-500/20" : "bg-white/5"}
                `}
              >
                <Upload className={`w-10 h-10 ${isDragging ? "text-cyan-400" : "text-muted-foreground"}`} />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {isDragging ? "Release to Upload" : "Drop Files Here"}
              </h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Drag and drop your PDFs, documents, or images. We&apos;ll analyze them and generate study materials.
              </p>
              <div className="flex gap-2 mt-6">
                <span className="px-3 py-1 rounded-full glass text-xs text-muted-foreground">PDF</span>
                <span className="px-3 py-1 rounded-full glass text-xs text-muted-foreground">DOCX</span>
                <span className="px-3 py-1 rounded-full glass text-xs text-muted-foreground">TXT</span>
                <span className="px-3 py-1 rounded-full glass text-xs text-muted-foreground">Images</span>
              </div>
            </div>
          </motion.div>
        )}

        {(processState === "uploading" || processState === "processing") && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-3xl p-12 text-center"
          >
            {/* Circular progress ring */}
            <div className="relative w-40 h-40 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/10"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="251"
                  strokeDashoffset={251 - (251 * progress) / 100}
                  className="drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{Math.round(progress)}%</span>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-2 text-foreground">
              {processState === "uploading" ? "Uploading Document..." : "Analyzing Content..."}
            </h3>
            <p className="text-muted-foreground">
              {processState === "uploading"
                ? "Securely uploading your file"
                : "AI is extracting key concepts and generating materials"}
            </p>

            {/* Processing animation */}
            <div className="flex justify-center gap-2 mt-6">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-cyan-500"
                />
              ))}
            </div>
          </motion.div>
        )}

        {processState === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Success header */}
            <div className="glass-card rounded-3xl p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 mx-auto mb-4 flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-2 text-foreground">Analysis Complete!</h3>
              <p className="text-muted-foreground">Your study materials are ready</p>
            </div>

            {/* Results with 3D tilt effect */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
                style={{ perspective: "1000px" }}
                className="glass-card rounded-2xl p-6 cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:lamp-glow transition-shadow">
                    <FileText className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Study Guide</h4>
                    <p className="text-sm text-muted-foreground mb-3">Comprehensive summary of key concepts</p>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-sm text-cyan-400"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ rotateY: -5, rotateX: -5, scale: 1.02 }}
                style={{ perspective: "1000px" }}
                className="glass-card rounded-2xl p-6 cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:lamp-glow transition-shadow">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Practice Exam</h4>
                    <p className="text-sm text-muted-foreground mb-3">25 questions generated from content</p>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-sm text-purple-400"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Reset button */}
            <div className="text-center">
              <motion.button
                onClick={resetState}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-xl glass text-muted-foreground hover:text-foreground transition-colors"
              >
                Upload Another Document
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
