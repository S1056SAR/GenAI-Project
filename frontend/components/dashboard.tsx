"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import GlassSidebar from "./glass-sidebar"
import TutorMode from "./tutor-mode"
import ExaminerMode from "./examiner-mode"
import DashboardHome from "./dashboard-home"

type ViewType = "home" | "tutor" | "examiner" | "settings"

interface DashboardProps {
  onLogout: () => void
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<ViewType>("home")

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex relative overflow-hidden"
    >
      {/* Abstract 3D background shape */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.3) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.2) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Glass Sidebar */}
      <GlassSidebar activeView={activeView} onViewChange={setActiveView} onLogout={onLogout} />

      {/* Main Content */}
      <div className="flex-1 ml-24 p-6 relative z-10">
        <AnimatePresence mode="wait">
          {activeView === "home" && <DashboardHome key="home" onNavigate={setActiveView} />}
          {activeView === "tutor" && <TutorMode key="tutor" />}
          {activeView === "examiner" && <ExaminerMode key="examiner" />}
          {activeView === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card rounded-3xl p-8 max-w-2xl"
            >
              <h2 className="text-2xl font-bold mb-4 text-foreground">Settings</h2>
              <p className="text-muted-foreground">Configure your learning preferences here.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
