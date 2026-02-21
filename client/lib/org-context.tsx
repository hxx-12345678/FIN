"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { API_BASE_URL } from "./api-config"

interface Organization {
    id: string
    name: string
    currency: string
}

interface OrgContextType {
    organization: Organization | null
    loading: boolean
    currencySymbol: string
    formatCurrency: (value: number | string) => string
    refreshOrganization: () => Promise<void>
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    CAD: "C$",
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchOrganization = useCallback(async () => {
        const orgId = localStorage.getItem("orgId")
        if (!orgId) {
            setLoading(false)
            return
        }

        try {
            const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
            if (!token) {
                setLoading(false)
                return
            }

            const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization?t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: "include",
                cache: "no-cache"
            })

            if (response.ok) {
                const data = await response.json()
                if (data.ok && data.data) {
                    setOrganization({
                        id: data.data.id,
                        name: data.data.name,
                        currency: data.data.currency || "USD",
                    })
                }
            }
        } catch (error) {
            console.error("Failed to fetch organization context:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchOrganization()
    }, [fetchOrganization])

    const currencySymbol = organization ? currencySymbols[organization.currency] || "$" : "$"

    const formatCurrency = useCallback((value: number | string) => {
        const num = typeof value === "string" ? parseFloat(value) : value
        if (isNaN(num)) return `${currencySymbol}0`
        return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }, [currencySymbol])

    return (
        <OrgContext.Provider value={{
            organization,
            loading,
            currencySymbol,
            formatCurrency,
            refreshOrganization: fetchOrganization
        }}>
            {children}
        </OrgContext.Provider>
    )
}

export function useOrg() {
    const context = useContext(OrgContext)
    if (context === undefined) {
        throw new Error("useOrg must be used within an OrgProvider")
    }
    return context
}
