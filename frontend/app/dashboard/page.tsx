"use client"

import { motion } from "framer-motion"
import { BookOpen, Clock, Trophy, TrendingUp, ArrowRight } from "lucide-react"

const stats = [
    { label: "Hours Studied", value: "24.5", icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Topics Mastered", value: "12", icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Average Score", value: "85%", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Current Streak", value: "5 Days", icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
]

const recentActivity = [
    { title: "Thermodynamics Review", type: "Tutor Session", time: "2 hours ago", status: "Completed" },
    { title: "Circuit Analysis", type: "Mock Exam", time: "Yesterday", status: "Pending Review" },
    { title: "Fluid Mechanics", type: "Notes", time: "2 days ago", status: "Saved" },
]

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-card rounded-2xl p-6 transition-transform hover:scale-[1.02]"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                                <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
                            </div>
                            <div className={`rounded-xl p-3 ${stat.bg}`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-card rounded-2xl p-6 lg:col-span-2"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                        <button className="text-sm text-cyan-400 hover:text-cyan-300">View All</button>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.map((activity, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="rounded-lg bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 p-3">
                                        <BookOpen className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">{activity.title}</h4>
                                        <p className="text-sm text-gray-400">{activity.type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{activity.status}</p>
                                    <p className="text-xs text-gray-500">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card rounded-2xl p-6"
                >
                    <h3 className="mb-6 text-lg font-semibold text-white">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="group flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-cyan-600/20 to-cyan-600/10 p-4 text-left transition-all hover:from-cyan-600/30 hover:to-cyan-600/20 border border-cyan-500/20 hover:border-cyan-500/40">
                            <span className="font-medium text-cyan-100">Start New Tutor Session</span>
                            <ArrowRight className="h-5 w-5 text-cyan-400 transition-transform group-hover:translate-x-1" />
                        </button>
                        <button className="group flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-600/10 p-4 text-left transition-all hover:from-purple-600/30 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-500/40">
                            <span className="font-medium text-purple-100">Generate Mock Exam</span>
                            <ArrowRight className="h-5 w-5 text-purple-400 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
