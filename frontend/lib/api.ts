"use client"

import { getAuthToken, logout } from "./auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"

async function fetchClient(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken()

    const isFormData = options.body instanceof FormData

    const headers: Record<string, string> = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...((options.headers as Record<string, string>) || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    })

    // Handle Auth Errors
    if (response.status === 401 || response.status === 403) {
        // Optional: Only logout if it's strictly an invalid token, not just forbidden access
        // For now, strict security:
        logout()
        throw new Error("Session expired. Please login again.")
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `API Error: ${response.statusText}`)
    }

    return response.json()
}

export const api = {
    // --- Tutor Mode ---
    tutor: {
        // Get list of user's study sessions
        getSessions: () => fetchClient("/rag/sessions"),

        // Delete a study session
        deleteSession: (sessionName: string) =>
            fetchClient(`/rag/sessions/${encodeURIComponent(sessionName)}`, { method: "DELETE" }),

        // Ingest files into a specific session
        ingest: (files: File[], sessionName: string = "default") => {
            const formData = new FormData()
            files.forEach((file) => formData.append("files", file))
            formData.append("session_name", sessionName)
            return fetchClient("/rag/ingest", {
                method: "POST",
                body: formData,
            })
        },

        // Start a tutor session with specific context
        startSession: (topic: string, generateAudio: boolean = false, languageCode: string = "hi-IN", sessionName: string = "default") =>
            fetchClient("/tutor/start_session", {
                method: "POST",
                body: JSON.stringify({
                    topic,
                    generate_audio: generateAudio,
                    language_code: languageCode,
                    session_name: sessionName
                }),
            }),

        generateAudio: (text: string, language_code: string = "hi-IN") =>
            fetchClient("/tutor/audio", {
                method: "POST",
                body: JSON.stringify({ text, language_code }),
            }),
    },

    // --- Examiner Mode ---
    exam: {
        generate: (syllabus_text: string, subject_filter?: string) =>
            fetchClient("/exam/generate", {
                method: "POST",
                body: JSON.stringify({ syllabus_text, subject_filter }),
            }),
    },

    // --- Pathfinder Mode ---
    journey: {
        start: (syllabus_text: string) =>
            fetchClient("/journey/start", {
                method: "POST",
                body: JSON.stringify({ syllabus_text }),
            }),

        startFromFile: (file: File) => {
            const formData = new FormData()
            formData.append("file", file)
            return fetchClient("/journey/start_from_file", {
                method: "POST",
                body: formData,
            })
        },

        getNode: (courseId: string, nodeId: string) =>
            fetchClient(`/journey/node/${courseId}/${nodeId}`),

        submitQuiz: (courseId: string, nodeId: string, answers: number[]) =>
            fetchClient("/journey/submit_quiz", {
                method: "POST",
                body: JSON.stringify({ course_id: courseId, node_id: nodeId, answers }),
            }),
    },

    // --- Doubt Solver Mode ---
    doubt: {
        // Ask Vidya Ma'am a doubt
        ask: (doubt: string, sessionName: string = "default") =>
            fetchClient("/doubt/ask", {
                method: "POST",
                body: JSON.stringify({ doubt, session_name: sessionName }),
            }),

        // Health check
        health: () => fetchClient("/doubt/health"),
    },

    // --- Video Lecture Generation ---
    video: {
        // Start video generation
        generate: (topic: string, sessionName: string = "default", useRag: boolean = true) =>
            fetchClient("/video/generate", {
                method: "POST",
                body: JSON.stringify({ topic, session_name: sessionName, use_rag: useRag }),
            }),

        // Check video generation status
        status: (jobId: string) =>
            fetchClient(`/video/status/${jobId}`),

        // Health check
        health: () => fetchClient("/video/health"),
    }
}
