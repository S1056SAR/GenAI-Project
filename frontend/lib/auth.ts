"use client"

import { jwtDecode } from "jwt-decode"

const TOKEN_KEY = "edusynth_token"

export interface AuthState {
    isAuthenticated: boolean
    user: {
        id: string
        name: string
        email: string
        picture?: string
    } | null
}

export const getAuthToken = (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(TOKEN_KEY)
}

export const setAuthToken = (token: string) => {
    if (typeof window === "undefined") return
    localStorage.setItem(TOKEN_KEY, token)
}

export const logout = () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(TOKEN_KEY)
    window.location.href = "/"
}

export const getUserFromToken = (token: string): AuthState["user"] => {
    try {
        const decoded: any = jwtDecode(token)
        return {
            id: decoded.sub,
            name: decoded.name,
            email: decoded.email,
            picture: decoded.picture
        }
    } catch (e) {
        return null
    }
}
