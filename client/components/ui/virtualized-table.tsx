"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface VirtualizedTableProps<T> {
  data: T[]
  columns: Array<{ key: string; header: string; render: (item: T) => React.ReactNode }>
  rowHeight?: number
  containerHeight?: number
  onRowClick?: (item: T) => void
  className?: string
}

const DEFAULT_ROW_HEIGHT = 48
const DEFAULT_CONTAINER_HEIGHT = 400

export function VirtualizedTable<T extends { id: string }>({
  data,
  columns,
  rowHeight = DEFAULT_ROW_HEIGHT,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  onRowClick,
  className,
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerDimensions, setContainerDimensions] = useState({ height: containerHeight, width: 0 })

  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        setContainerDimensions({
          height: containerRef.current?.clientHeight || containerHeight,
          width: containerRef.current?.clientWidth || 0,
        })
      }
      updateDimensions()
      window.addEventListener("resize", updateDimensions)
      return () => window.removeEventListener("resize", updateDimensions)
    }
  }, [containerHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const visibleStart = Math.floor(scrollTop / rowHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerDimensions.height / rowHeight) + 1,
    data.length,
  )

  const visibleData = data.slice(visibleStart, visibleEnd)
  const offsetY = visibleStart * rowHeight
  const totalHeight = data.length * rowHeight

  if (data.length === 0) {
    return (
      <div className={className}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerDimensions.height }}
      onScroll={handleScroll}
      role="table"
      aria-rowcount={data.length}
      aria-colcount={columns.length}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleData.map((item, index) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  style={{ height: rowHeight }}
                  role="row"
                  aria-rowindex={visibleStart + index + 1}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault()
                      onRowClick(item)
                    }
                  }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} role="gridcell">
                      {col.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}


