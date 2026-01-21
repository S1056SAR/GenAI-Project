"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Network, Headphones, PlayCircle, Layers, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import FlashcardDeck from "./FlashcardDeck"
import mermaid from "mermaid"

type Tab = "mindmap" | "audio" | "video" | "flashcards"

const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "mindmap", label: "Knowledge Graph", icon: Network },
    { id: "audio", label: "Podcast Studio", icon: Headphones },
    { id: "video", label: "Video Lecture", icon: PlayCircle },
    { id: "flashcards", label: "Flashcards", icon: Layers },
]

mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose',
})

// History item type
type HistoryItem<T> = { data: T; timestamp: string; query: string }

interface MediaCanvasProps {
    mindmapCode?: string | null
    flashcards?: any[] | null
    audioBase64?: string | null
    // Video props
    videoUrl?: string | null
    videoProgress?: number
    videoStatus?: string | null
    // History arrays
    mindmapHistory?: HistoryItem<string>[]
    flashcardHistory?: HistoryItem<any[]>[]
    audioHistory?: HistoryItem<string>[]
    // Selection indexes
    selectedMindmapIndex?: number
    selectedFlashcardIndex?: number
    selectedAudioIndex?: number
    // Selection handlers
    onSelectMindmap?: (index: number) => void
    onSelectFlashcard?: (index: number) => void
    onSelectAudio?: (index: number) => void
}

export default function MediaCanvas({
    mindmapCode,
    flashcards,
    audioBase64,
    videoUrl,
    videoProgress = 0,
    videoStatus,
    mindmapHistory = [],
    flashcardHistory = [],
    audioHistory = [],
    selectedMindmapIndex = 0,
    selectedFlashcardIndex = 0,
    selectedAudioIndex = 0,
    onSelectMindmap,
    onSelectFlashcard,
    onSelectAudio
}: MediaCanvasProps) {
    const [activeTab, setActiveTab] = useState<Tab>("mindmap")
    const mermaidRef = useRef<HTMLDivElement>(null)
    const [zoomLevel, setZoomLevel] = useState(1)

    useEffect(() => {
        if (mindmapCode && activeTab === "mindmap" && mermaidRef.current) {
            mermaid.contentLoaded()
            mermaidRef.current.innerHTML = mindmapCode
            mermaidRef.current.removeAttribute('data-processed');
            mermaid.run({
                nodes: [mermaidRef.current],
            }).catch(e => console.error("Mermaid error:", e))
        }
    }, [mindmapCode, activeTab])

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3))
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
    const handleZoomReset = () => setZoomLevel(1)

    // History navigation component
    const HistorySelector = ({
        history,
        selectedIndex,
        onSelect,
        label
    }: {
        history: HistoryItem<any>[];
        selectedIndex: number;
        onSelect?: (i: number) => void;
        label: string;
    }) => {
        if (history.length === 0) return null
        return (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => onSelect?.(Math.max(0, selectedIndex - 1))}
                        disabled={selectedIndex <= 0}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronLeft className="h-5 w-5 text-white" />
                    </button>
                    <div className="text-center flex-1 px-2">
                        <p className="text-xs text-gray-400">{label} {selectedIndex + 1} of {history.length}</p>
                        <p className="text-xs text-gray-500 truncate">{history[selectedIndex]?.query?.slice(0, 40)}...</p>
                        <p className="text-xs text-cyan-400">{history[selectedIndex]?.timestamp}</p>
                    </div>
                    <button
                        onClick={() => onSelect?.(Math.min(history.length - 1, selectedIndex + 1))}
                        disabled={selectedIndex >= history.length - 1}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronRight className="h-5 w-5 text-white" />
                    </button>
                </div>
            </div>
        )
    }

    const renderMermaid = () => {
        if (!mindmapCode) {
            return (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/30">
                            <Network className="h-8 w-8 text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white">Interactive Knowledge Graph</h3>
                        <p className="text-sm text-gray-500">Ask the Tutor to generate a mindmap.</p>
                    </div>
                </div>
            )
        }

        return (
            <div className="h-full w-full flex flex-col relative">
                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-black/40 backdrop-blur-sm rounded-lg p-2">
                    <button onClick={handleZoomIn} className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold" title="Zoom In">+</button>
                    <button onClick={handleZoomReset} className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs" title="Reset Zoom">{Math.round(zoomLevel * 100)}%</button>
                    <button onClick={handleZoomOut} className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold" title="Zoom Out">-</button>
                </div>

                {/* Mindmap Container with Zoom */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0f0c29]/50">
                    <div className="mermaid transition-transform duration-200" ref={mermaidRef} style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}>
                        {mindmapCode}
                    </div>
                </div>

                {/* History Navigator */}
                <HistorySelector history={mindmapHistory} selectedIndex={selectedMindmapIndex} onSelect={onSelectMindmap} label="Mindmap" />
            </div>
        )
    }

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0f0c29]/50">
            {/* Tab Bar */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-1 bg-black/40 backdrop-blur-md p-2 border-b border-white/10">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    // Show count badges for history
                    const count = tab.id === "mindmap" ? mindmapHistory.length
                        : tab.id === "flashcards" ? flashcardHistory.length
                            : tab.id === "audio" ? audioHistory.length : 0
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
                                isActive ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            {count > 0 && (
                                <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Content Area */}
            <div className="relative h-full w-full pt-14">
                {/* Mindmap Canvas */}
                <div className={cn("absolute inset-0 h-full w-full transition-opacity duration-500 pt-2", activeTab === "mindmap" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
                    <div className="h-full w-full bg-grid-white/[0.02] relative">
                        {renderMermaid()}
                    </div>
                </div>

                {/* Podcast Studio */}
                <div className={cn("absolute inset-0 h-full w-full transition-opacity duration-500 pt-2", activeTab === "audio" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
                    <div className="flex h-full flex-col p-8">
                        {/* Main content area */}
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-full max-w-md space-y-6">
                                <div className="aspect-square w-full max-w-[200px] mx-auto rounded-3xl bg-gradient-to-tr from-cyan-900/30 to-purple-900/30 border border-white/10 flex items-center justify-center shadow-2xl shadow-purple-500/10">
                                    <Headphones className="h-16 w-16 text-white/20" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <h3 className="text-xl font-semibold text-white">AI Tutor Podcast</h3>
                                    <p className="text-sm text-gray-400">{audioBase64 ? "Now Playing" : "Waiting for audio generation..."}</p>
                                </div>

                                {audioBase64 && (
                                    <audio controls className="w-full" src={`data:audio/wav;base64,${audioBase64}`} />
                                )}

                                {!audioBase64 && (
                                    <div className="text-center text-xs text-gray-500">
                                        Ask the tutor to "generate audio" or "explain in Hindi" for this lesson.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* History Navigator at bottom - separate from content */}
                        <div className="mt-4">
                            <HistorySelector history={audioHistory} selectedIndex={selectedAudioIndex} onSelect={onSelectAudio} label="Audio" />
                        </div>
                    </div>
                </div>

                {/* Video Lecture */}
                <div className={cn("absolute inset-0 h-full w-full transition-opacity duration-500 pt-2", activeTab === "video" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
                    <div className="flex h-full flex-col items-center justify-center bg-black/40 p-8">
                        {videoUrl ? (
                            <div className="w-full max-w-3xl">
                                <video
                                    controls
                                    className="w-full rounded-xl shadow-2xl"
                                    src={`http://localhost:8000${videoUrl}`}
                                />
                                <p className="text-center text-sm text-gray-400 mt-4">Your AI-generated lecture</p>
                            </div>
                        ) : videoStatus && videoStatus !== "completed" ? (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center animate-pulse">
                                    <PlayCircle className="h-10 w-10 text-white" />
                                </div>
                                <h3 className="text-lg font-medium text-white">Generating Video Lecture</h3>
                                <p className="text-sm text-gray-400">{videoStatus === "queued" ? "Queued..." : videoStatus === "generating_script" ? "Writing script..." : videoStatus === "generating_audio" ? "Recording narration..." : videoStatus === "fetching_videos" ? "Finding footage..." : videoStatus === "assembling" ? "Assembling video..." : videoStatus}</p>
                                <div className="w-64 mx-auto bg-white/10 rounded-full h-2">
                                    <div className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${videoProgress}%` }} />
                                </div>
                                <p className="text-xs text-gray-500">{videoProgress}% complete</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <PlayCircle className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white">Video Lecture</h3>
                                <p className="text-gray-500">Ask the tutor to "generate a video" about any topic.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Flashcards */}
                <div className={cn("absolute inset-0 h-full w-full transition-opacity duration-500 pt-2 relative", activeTab === "flashcards" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
                    {flashcards && flashcards.length > 0 ? (
                        <div className="h-full relative">
                            <FlashcardDeck cards={flashcards} />
                            {/* History Navigator for Flashcards */}
                            <HistorySelector history={flashcardHistory} selectedIndex={selectedFlashcardIndex} onSelect={onSelectFlashcard} label="Flashcard Set" />
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <Layers className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white">Flashcards</h3>
                                <p className="text-sm text-gray-500">Ask the Tutor to generate flashcards.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
