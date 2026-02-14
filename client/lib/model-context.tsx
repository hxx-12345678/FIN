"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface ModelContextType {
    selectedModelId: string | null
    setSelectedModelId: (id: string | null) => void
    orgId: string | null
    setOrgId: (id: string | null) => void
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function ModelProvider({ children }: { children: ReactNode }) {
    const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null)
    const [orgId, setOrgIdState] = useState<string | null>(null)

    // Initialize from localStorage on mount
    useEffect(() => {
        const storedModelId = localStorage.getItem("activeModelId")
        const storedOrgId = localStorage.getItem("orgId")

        if (storedModelId) setSelectedModelIdState(storedModelId)
        if (storedOrgId) setOrgIdState(storedOrgId)
    }, [])

    const setSelectedModelId = (id: string | null) => {
        setSelectedModelIdState(id)
        if (id) {
            localStorage.setItem("activeModelId", id)
        } else {
            localStorage.removeItem("activeModelId")
        }

        // Dispatch custom event for vanilla JS components or those not using context
        window.dispatchEvent(new CustomEvent("model-changed", { detail: { modelId: id } }))
    }

    const setOrgId = (id: string | null) => {
        setOrgIdState(id)
        if (id) {
            localStorage.setItem("orgId", id)
        } else {
            localStorage.removeItem("orgId")
        }
    }

    return (
        <ModelContext.Provider value={{ selectedModelId, setSelectedModelId, orgId, setOrgId }}>
            {children}
        </ModelContext.Provider>
    )
}

export function useModel() {
    const context = useContext(ModelContext)
    if (context === undefined) {
        throw new Error("useModel must be used within a ModelProvider")
    }
    return context
}
