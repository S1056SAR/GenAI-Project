import { create } from 'zustand'

export type VersionType = 'global' | 'topic'

export interface Version {
    id: string
    label: string
    type: VersionType
    timestamp: string
}

export interface LearningNode {
    id: string
    label: string
    status: 'locked' | 'active' | 'completed'
    position: { x: number; y: number }
    description: string
}

interface AppState {
    // Versioned Workspace State
    currentVersionId: string
    versions: Version[]
    setVersion: (id: string) => void
    addVersion: (version: Version) => void

    // Pathfinder Mode State
    learningPath: LearningNode[]
    currentPathId: string | null
    setLearningPath: (nodes: LearningNode[]) => void
    completeNode: (nodeId: string) => void
    unlockNextNode: (currentNodeId: string) => void
    unlockNode: (targetNodeId: string) => void
}

export const useStore = create<AppState>((set) => ({
    // Initial Versions
    currentVersionId: 'v-global',
    versions: [
        { id: 'v-global', label: 'Full Unit Overview', type: 'global', timestamp: 'Just now' },
    ],
    setVersion: (id) => set({ currentVersionId: id }),
    addVersion: (version) => set((state) => ({ versions: [version, ...state.versions], currentVersionId: version.id })),

    // Initial Learning Path
    currentPathId: null,
    learningPath: [], // Start empty to trigger "Start Journey" UI
    setLearningPath: (nodes) => set({ learningPath: nodes }),
    completeNode: (nodeId) =>
        set((state) => ({
            learningPath: state.learningPath.map((node) =>
                node.id === nodeId ? { ...node, status: 'completed' } : node
            ),
        })),
    unlockNextNode: (currentNodeId) =>
        set((state) => {
            const currentIndex = state.learningPath.findIndex((n) => n.id === currentNodeId)
            if (currentIndex === -1 || currentIndex === state.learningPath.length - 1) return {}

            const nextNode = state.learningPath[currentIndex + 1]
            return {
                learningPath: state.learningPath.map((node) =>
                    node.id === nextNode.id ? { ...node, status: 'active' } : node
                ),
            }
        }),
    unlockNode: (targetNodeId) =>
        set((state) => ({
            learningPath: state.learningPath.map((node) =>
                node.id === targetNodeId ? { ...node, status: 'active' } : node
            ),
        })),
}))
