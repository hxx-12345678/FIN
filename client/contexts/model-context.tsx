"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { API_BASE_URL } from "@/lib/api-config"

interface Model {
  id: string
  name: string
  type: string
  orgId: string
  createdAt: string
  modelJson?: any
}

interface ModelContextType {
  selectedModel: Model | null
  models: Model[]
  setSelectedModel: (model: Model | null) => void
  refreshModels: () => Promise<void>
  loading: boolean
  orgId: string | null
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function ModelProvider({ children, orgId: providedOrgId }: { children: ReactNode; orgId?: string | null }) {
  const [selectedModel, setSelectedModelState] = useState<Model | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(providedOrgId || null)

  // Fetch orgId if not provided
  useEffect(() => {
    if (!orgId) {
      const fetchOrgId = async () => {
        try {
          const token = localStorage.getItem("auth-token") || document.cookie
            .split("; ")
            .find((row) => row.startsWith("auth-token="))
            ?.split("=")[1]

          if (!token) return

          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          })

          if (response.ok) {
            const result = await response.json()
            if (result.ok && result.user?.orgId) {
              setOrgId(result.user.orgId)
            }
          }
        } catch (error) {
          console.error("Failed to fetch orgId:", error)
        }
      }
      fetchOrgId()
    }
  }, [orgId])

  const refreshModels = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.models) {
          setModels(result.models)
          
          // If no model is selected, select the first one (or one with completed runs)
          if (!selectedModel && result.models.length > 0) {
            // Try to find a model with completed runs
            for (const model of result.models) {
              const runsResponse = await fetch(`${API_BASE_URL}/models/${model.id}/runs`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                credentials: "include",
              })
              
              if (runsResponse.ok) {
                const runsResult = await runsResponse.json()
                if (runsResult.ok && runsResult.runs && runsResult.runs.length > 0) {
                  const hasCompletedRun = runsResult.runs.some((r: any) => r.status === "done")
                  if (hasCompletedRun) {
                    setSelectedModelState(model)
                    break
                  }
                }
              }
            }
            
            // If no model with completed runs, select first model
            if (!selectedModel) {
              setSelectedModelState(result.models[0])
            }
          } else if (selectedModel) {
            // Update selected model if it exists in the new list
            const updatedModel = result.models.find((m: Model) => m.id === selectedModel.id)
            if (updatedModel) {
              setSelectedModelState(updatedModel)
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch models:", error)
    } finally {
      setLoading(false)
    }
  }

  const setSelectedModel = (model: Model | null) => {
    setSelectedModelState(model)
    // Store in localStorage for persistence
    if (model) {
      localStorage.setItem("selectedModelId", model.id)
    } else {
      localStorage.removeItem("selectedModelId")
    }
  }

  // Load models when orgId is available
  useEffect(() => {
    if (orgId) {
      refreshModels()
    }
  }, [orgId])

  // Restore selected model from localStorage on mount
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const savedModelId = localStorage.getItem("selectedModelId")
      if (savedModelId) {
        const savedModel = models.find(m => m.id === savedModelId)
        if (savedModel) {
          setSelectedModelState(savedModel)
        }
      }
    }
  }, [models])

  // Update orgId when provided prop changes
  useEffect(() => {
    if (providedOrgId !== undefined) {
      setOrgId(providedOrgId)
    }
  }, [providedOrgId])

  return (
    <ModelContext.Provider
      value={{
        selectedModel,
        models,
        setSelectedModel,
        refreshModels,
        loading,
        orgId,
      }}
    >
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
