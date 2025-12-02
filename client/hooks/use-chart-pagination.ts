"use client"

import { useState, useEffect, useCallback } from "react"

interface UseChartPaginationOptions {
  defaultMonths?: number
  onLoadMore?: (startDate: Date, endDate: Date) => Promise<any[]>
}

export function useChartPagination<T extends { month?: string; date?: string }>({
  defaultMonths = 36,
  onLoadMore,
}: UseChartPaginationOptions = {}) {
  const [chartData, setChartData] = useState<T[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadedRange, setLoadedRange] = useState<{ start: Date; end: Date } | null>(null)

  const initializeData = useCallback(
    (initialData: T[]) => {
      if (initialData.length === 0) return

      const sorted = [...initialData].sort((a, b) => {
        const dateA = a.month || a.date || ""
        const dateB = b.month || b.date || ""
        return dateA.localeCompare(dateB)
      })

      const endDate = new Date(sorted[sorted.length - 1].month || sorted[sorted.length - 1].date || Date.now())
      const startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - defaultMonths)

      const windowed = sorted.filter((item) => {
        const itemDate = new Date(item.month || item.date || Date.now())
        return itemDate >= startDate && itemDate <= endDate
      })

      setChartData(windowed)
      setLoadedRange({ start: startDate, end: endDate })
      setHasMore(sorted.length > windowed.length)
    },
    [defaultMonths],
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !onLoadMore || !loadedRange) return

    setIsLoadingMore(true)

    try {
      const newStartDate = new Date(loadedRange.start)
      newStartDate.setMonth(newStartDate.getMonth() - defaultMonths)

      const newData = await onLoadMore(newStartDate, loadedRange.start)

      if (newData.length === 0) {
        setHasMore(false)
      } else {
        setChartData((prev) => {
          const merged = [...newData, ...prev]
          return merged.sort((a, b) => {
            const dateA = a.month || a.date || ""
            const dateB = b.month || b.date || ""
            return dateA.localeCompare(dateB)
          })
        })
        setLoadedRange({ start: newStartDate, end: loadedRange.end })
      }
    } catch (err) {
      console.error("Failed to load more chart data", err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, onLoadMore, loadedRange, defaultMonths])

  return {
    chartData,
    isLoadingMore,
    hasMore,
    loadMore,
    initializeData,
  }
}


