"use client"

import { motion } from "framer-motion"
import { Chrome, Sparkles, Zap, Brain } from "lucide-react"
import ParticleField from "./particle-field"

interface HeroAuthProps {
  onLogin: () => void
}

export default function HeroAuth({ onLogin }: HeroAuthProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen relative flex items-center justify-center overflow-hidden"
    >
      {/* Animated particle background */}
      <ParticleField />

      {/* Floating 3D shapes in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 blur-xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute bottom-32 right-20 w-48 h-48 rounded-full bg-gradient-to-br from-purple-600/20 to-cyan-500/20 blur-xl"
        />
        <motion.div
          animate={{
            x: [0, 15, 0],
            y: [0, -10, 0],
          }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/30 to-purple-500/30 blur-lg"
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo and brand */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="p-3 rounded-2xl glass-card"
            >
              <Brain className="w-10 h-10 text-cyan-400" />
            </motion.div>
          </div>
          <h1 className="text-5xl font-bold mb-2 glow-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            EduSynth
          </h1>
          <p className="text-muted-foreground text-lg">The Future of Learning</p>
        </motion.div>

        {/* Floating login card */}
        <motion.div
          initial={{ y: 30, opacity: 0, rotateX: 10 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
          whileHover={{ y: -5, scale: 1.02 }}
          className="glass-card rounded-3xl p-8 glow-border"
          style={{ perspective: "1000px" }}
        >
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome Back</h2>
              <p className="text-muted-foreground">Begin your learning journey today</p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 py-4">
              <motion.div
                whileHover={{ scale: 1.1, y: -5 }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl glass"
              >
                <Sparkles className="w-6 h-6 text-cyan-400" />
                <span className="text-xs text-muted-foreground">AI Tutor</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, y: -5 }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl glass"
              >
                <Zap className="w-6 h-6 text-purple-400" />
                <span className="text-xs text-muted-foreground">Smart Exams</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, y: -5 }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl glass"
              >
                <Brain className="w-6 h-6 text-cyan-400" />
                <span className="text-xs text-muted-foreground">Mindmaps</span>
              </motion.div>
            </div>

            {/* Login button with shine effect */}
            <motion.button
              onClick={onLogin}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-4 rounded-full overflow-hidden group"
            >
              {/* Animated border */}
              <div className="absolute inset-0 rounded-full p-[2px] shine-border">
                <div className="absolute inset-[2px] rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
              </div>

              {/* Button content */}
              <div className="relative flex items-center justify-center gap-3 text-foreground font-medium">
                <Chrome className="w-5 h-5" />
                <span>Start Journey with Google</span>
              </div>
            </motion.button>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service
            </p>
          </div>
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 text-muted-foreground text-sm"
        >
          Trusted by 100,000+ learners worldwide
        </motion.p>
      </div>
    </motion.div>
  )
}
