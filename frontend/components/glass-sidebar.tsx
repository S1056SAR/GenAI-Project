"use client"

import { motion } from "framer-motion"
import { Home, GraduationCap, FileSearch, Settings, LogOut } from "lucide-react"

type ViewType = "home" | "tutor" | "examiner" | "settings"

interface GlassSidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  onLogout: () => void
}

const navItems = [
  { id: "home" as ViewType, icon: Home, label: "Home" },
  { id: "tutor" as ViewType, icon: GraduationCap, label: "Tutor" },
  { id: "examiner" as ViewType, icon: FileSearch, label: "Exams" },
  { id: "settings" as ViewType, icon: Settings, label: "Settings" },
]

export default function GlassSidebar({ activeView, onViewChange, onLogout }: GlassSidebarProps) {
  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-50"
    >
      <div className="glass-card rounded-3xl p-3 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon

          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`relative p-4 rounded-2xl transition-colors group ${
                isActive ? "lamp-glow" : "hover:bg-white/5"
              }`}
            >
              {/* Active lamp effect */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-purple-600/30"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              {/* Glow line above active item */}
              {isActive && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                />
              )}

              <Icon
                className={`relative z-10 w-6 h-6 transition-colors ${
                  isActive ? "text-cyan-400" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />

              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg glass opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                <span className="text-sm text-foreground">{item.label}</span>
              </div>
            </motion.button>
          )
        })}

        {/* Divider */}
        <div className="w-full h-px bg-white/10 my-2" />

        {/* Logout */}
        <motion.button
          onClick={onLogout}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-4 rounded-2xl hover:bg-red-500/10 group transition-colors"
        >
          <LogOut className="w-6 h-6 text-muted-foreground group-hover:text-red-400 transition-colors" />
        </motion.button>
      </div>
    </motion.aside>
  )
}
