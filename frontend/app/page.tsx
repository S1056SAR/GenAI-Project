"use client"

import { motion } from "framer-motion"
import { ArrowRight, Brain, Sparkles, Lock, Mail } from "lucide-react"
import Link from "next/link"
import StarField from "@/components/StarField"
import { GoogleLogin } from "@react-oauth/google"
import { setAuthToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { toast } = useToast()

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      {/* 3D Background */}
      <StarField />

      {/* Content Overlay */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/20">
              <Brain className="h-8 w-8 text-white" />
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-500 opacity-30 blur-lg" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl glow-text">
            EduSynth
          </h1>
          <p className="mt-4 text-lg text-gray-300 sm:text-xl">
            The Future of Engineering Education
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card glow-border relative overflow-hidden rounded-2xl p-8">
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative flex flex-col items-center">
              <h2 className="mb-6 text-center text-2xl font-semibold text-white">Welcome Back</h2>

              <p className="mb-8 text-center text-gray-400">
                Sign in to continue your learning journey
              </p>

              <div className="w-full h-12 flex justify-center">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      setAuthToken(credentialResponse.credential);
                      toast({
                        title: "Welcome back!",
                        description: "Redirecting to dashboard...",
                      });
                      window.location.href = "/dashboard";
                    }
                  }}
                  onError={() => {
                    toast({
                      variant: "destructive",
                      title: "Login Failed",
                      description: "Please try again.",
                    });
                  }}
                  theme="filled_black"
                  shape="pill"
                  text="continue_with"
                  width={300}
                />
              </div>

              <div className="mt-8 text-center text-xs text-gray-500">
                By continuing, you agree to EduSynth's Terms & Conditions.
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-12 flex gap-8 text-center text-xs text-gray-500"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <Brain className="h-4 w-4 text-cyan-400" />
            </div>
            <span>AI Tutor</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <span>Smart Exams</span>
          </div>
        </motion.div>
      </div>
    </main >
  )
}
