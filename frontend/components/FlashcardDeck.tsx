"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Flashcard {
    id?: string
    question?: string
    answer?: string
    front?: string
    back?: string
}

interface FlashcardDeckProps {
    cards?: Flashcard[] | null
}

export default function FlashcardDeck({ cards }: FlashcardDeckProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)

    // Fallback to empty if no cards
    const safeCards = cards && cards.length > 0 ? cards : [
        { question: "No Flashcards Generated", answer: "Ask the tutor to create flashcards." }
    ]

    const handleNext = () => {
        setIsFlipped(false)
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % safeCards.length)
        }, 200)
    }

    const handlePrev = () => {
        setIsFlipped(false)
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + safeCards.length) % safeCards.length)
        }, 200)
    }

    const currentCard = safeCards[currentIndex]
    // Support both question/answer and front/back formats
    const frontText = currentCard.question || currentCard.front || "Question"
    const backText = currentCard.answer || currentCard.back || "Answer"

    return (
        <div className="flex h-full flex-col items-center justify-center p-8">
            {/* Card container with 3D perspective */}
            <div
                className="relative h-80 w-full max-w-md cursor-pointer"
                style={{ perspective: "1000px" }}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <motion.div
                    className="relative h-full w-full"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* Front - Question */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-8 text-center shadow-xl"
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        <span className="mb-4 text-xs font-bold uppercase tracking-widest text-cyan-400">Question</span>
                        <h3 className="text-xl font-semibold text-white">{frontText}</h3>
                        <div className="absolute bottom-4 right-4 text-xs text-gray-500">Click to flip</div>
                    </div>

                    {/* Back - Answer */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 p-8 text-center shadow-xl"
                        style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)"
                        }}
                    >
                        <span className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-400">Answer</span>
                        <p className="text-lg text-gray-200">{backText}</p>
                        <div className="absolute bottom-4 right-4 text-xs text-gray-500">Click to flip</div>
                    </div>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-6">
                <button
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="rounded-full bg-white/5 p-3 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <span className="text-sm font-medium text-gray-400">
                    {currentIndex + 1} / {safeCards.length}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="rounded-full bg-white/5 p-3 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>
            </div>
        </div>
    )
}
