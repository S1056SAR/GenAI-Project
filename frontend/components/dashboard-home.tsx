"use client"

import { motion } from "framer-motion"
import { GraduationCap, FileSearch, TrendingUp, BookOpen, Clock, Award } from "lucide-react"

type ViewType = "home" | "tutor" | "examiner" | "settings"

interface DashboardHomeProps {
  onNavigate: (view: ViewType) => void
}

const stats = [
  { label: "Hours Learned", value: "47", icon: Clock, color: "from-cyan-400 to-blue-500" },
  { label: "Courses Completed", value: "12", icon: BookOpen, color: "from-purple-400 to-pink-500" },
  { label: "Exams Passed", value: "8", icon: Award, color: "from-green-400 to-emerald-500" },
  { label: "Current Streak", value: "15", icon: TrendingUp, color: "from-orange-400 to-red-500" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

export default function DashboardHome({ onNavigate }: DashboardHomeProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-bold mb-2 text-foreground">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Learner</span>
        </h1>
        <p className="text-muted-foreground text-lg">Ready to continue your journey?</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              whileHover={{ y: -5, scale: 1.02 }}
              className="glass-card rounded-2xl p-6 group cursor-pointer"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} p-3 mb-4 group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-full h-full text-white" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
        {/* Tutor Card */}
        <motion.button
          onClick={() => onNavigate("tutor")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="glass-card rounded-3xl p-8 text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl glass mb-6 flex items-center justify-center group-hover:lamp-glow transition-shadow">
              <GraduationCap className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">AI Tutor</h3>
            <p className="text-muted-foreground mb-4">
              Learn with your personal AI companion. Ask questions, explore concepts, and build knowledge maps.
            </p>
            <span className="text-cyan-400 font-medium flex items-center gap-2">
              Start Learning
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}>
                →
              </motion.span>
            </span>
          </div>
        </motion.button>

        {/* Examiner Card */}
        <motion.button
          onClick={() => onNavigate("examiner")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="glass-card rounded-3xl p-8 text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl glass mb-6 flex items-center justify-center group-hover:lamp-glow transition-shadow">
              <FileSearch className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">Smart Examiner</h3>
            <p className="text-muted-foreground mb-4">
              Upload documents and let AI generate comprehensive study materials and practice exams.
            </p>
            <span className="text-purple-400 font-medium flex items-center gap-2">
              Upload Documents
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}>
                →
              </motion.span>
            </span>
          </div>
        </motion.button>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6">
        <h3 className="text-xl font-bold mb-4 text-foreground">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { title: "Completed: Introduction to Machine Learning", time: "2 hours ago", type: "course" },
            { title: "Exam: Neural Networks Fundamentals", time: "Yesterday", type: "exam" },
            { title: "Started: Deep Learning Specialization", time: "3 days ago", type: "course" },
          ].map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-2xl glass hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activity.type === "course" ? "bg-cyan-500/20" : "bg-purple-500/20"
                }`}
              >
                {activity.type === "course" ? (
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                ) : (
                  <FileSearch className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
