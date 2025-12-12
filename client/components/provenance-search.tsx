"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, DollarSign, Users, Target, Filter, Save, X, Calendar, SlidersHorizontal } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface MetricSearchResult {
  id: string
  name: string
  value: string
  category: string
  icon: any
  lastUpdated: string
  sourceType?: "transaction" | "ai_generated" | "manual" | "integration"
  confidenceScore?: number
  dateRange?: { from: Date; to: Date }
}

interface SavedSearch {
  id: string
  name: string
  query: string
  filters: {
    sourceType?: string
    confidenceMin?: number
    dateFrom?: string
    dateTo?: string
  }
  createdAt: string
}

interface ProvenanceSearchProps {
  onSelectMetric: (metricId: string) => void
}

const STORAGE_KEY = "provenance_saved_searches"
const HISTORY_KEY = "provenance_search_history"

export function ProvenanceSearch({ onSelectMetric }: ProvenanceSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  const [searchResults, setSearchResults] = useState<MetricSearchResult[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all")
  const [confidenceMin, setConfidenceMin] = useState<string>("0")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search")
  const [isSearching, setIsSearching] = useState(false)
  const [showHints, setShowHints] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load saved searches and history from localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load saved searches", e)
      }
    }

    const history = localStorage.getItem(HISTORY_KEY)
    // Clear all recent searches on load (user requested to remove all recent searches for cptjacksprw@gmail.com)
    if (history) {
      try {
        localStorage.removeItem(HISTORY_KEY)
      } catch (e) {
        console.error("Failed to clear search history", e)
      }
    }
    setSearchHistory([])
  }, [])

  const clearSearchHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setSearchHistory([])
    toast.success("Search history cleared")
  }

  // Debounce search query to avoid excessive processing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300) // 300ms debounce delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Perform search when debounced query changes (but don't add to history)
  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery, false) // Never add to history from debounced search
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }, [debouncedQuery, sourceTypeFilter, confidenceMin, dateRange])

  // Expanded metrics list with aliases and common search terms
  const allMetrics: MetricSearchResult[] = [
    {
      id: "mrr",
      name: "Monthly Recurring Revenue",
      value: "$67,000",
      category: "Revenue",
      icon: DollarSign,
      lastUpdated: "2 hours ago",
      sourceType: "transaction",
      confidenceScore: 0.95,
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
    },
    {
      id: "arr",
      name: "Annual Recurring Revenue",
      value: "$804,000",
      category: "Revenue",
      icon: TrendingUp,
      lastUpdated: "2 hours ago",
      sourceType: "ai_generated",
      confidenceScore: 0.88,
      dateRange: { from: subDays(new Date(), 365), to: new Date() },
    },
    {
      id: "burn_rate",
      name: "Monthly Burn Rate",
      value: "$45,000",
      category: "Costs",
      icon: Target,
      lastUpdated: "1 day ago",
      sourceType: "manual",
      confidenceScore: 0.92,
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
    },
    {
      id: "cash_burn",
      name: "Cash Burn Rate",
      value: "$45,000",
      category: "Costs",
      icon: Target,
      lastUpdated: "1 day ago",
      sourceType: "manual",
      confidenceScore: 0.92,
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
    },
    {
      id: "runway",
      name: "Cash Runway",
      value: "12.7 months",
      category: "Financial Health",
      icon: TrendingUp,
      lastUpdated: "2 hours ago",
      sourceType: "ai_generated",
      confidenceScore: 0.85,
      dateRange: { from: subDays(new Date(), 90), to: new Date() },
    },
    {
      id: "cac",
      name: "Customer Acquisition Cost",
      value: "$125",
      category: "Metrics",
      icon: Users,
      lastUpdated: "3 days ago",
      sourceType: "integration",
      confidenceScore: 0.90,
      dateRange: { from: subDays(new Date(), 60), to: new Date() },
    },
    {
      id: "ltv",
      name: "Customer Lifetime Value",
      value: "$2,400",
      category: "Metrics",
      icon: DollarSign,
      lastUpdated: "3 days ago",
      sourceType: "ai_generated",
      confidenceScore: 0.87,
      dateRange: { from: subDays(new Date(), 90), to: new Date() },
    },
    {
      id: "churn_rate",
      name: "Churn Rate",
      value: "2.5%",
      category: "Metrics",
      icon: TrendingUp,
      lastUpdated: "3 days ago",
      sourceType: "ai_generated",
      confidenceScore: 0.85,
      dateRange: { from: subDays(new Date(), 90), to: new Date() },
    },
    {
      id: "churn",
      name: "Monthly Churn Rate",
      value: "2.5%",
      category: "Metrics",
      icon: TrendingUp,
      lastUpdated: "3 days ago",
      sourceType: "ai_generated",
      confidenceScore: 0.85,
      dateRange: { from: subDays(new Date(), 90), to: new Date() },
    },
    {
      id: "cash_balance",
      name: "Cash Balance",
      value: "$570,000",
      category: "Financial Health",
      icon: DollarSign,
      lastUpdated: "2 hours ago",
      sourceType: "transaction",
      confidenceScore: 0.95,
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
    },
    {
      id: "cash",
      name: "Cash",
      value: "$570,000",
      category: "Financial Health",
      icon: DollarSign,
      lastUpdated: "2 hours ago",
      sourceType: "transaction",
      confidenceScore: 0.95,
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
    },
    {
      id: "revenue_growth",
      name: "Revenue Growth",
      value: "8.0%",
      category: "Growth",
      icon: TrendingUp,
      lastUpdated: "2 hours ago",
      sourceType: "ai_generated",
      confidenceScore: 0.88,
      dateRange: { from: subDays(new Date(), 90), to: new Date() },
    },
    {
      id: "net_income",
      name: "Net Income",
      value: "$18,000",
      category: "Financial Health",
      icon: DollarSign,
      lastUpdated: "2 hours ago",
      sourceType: "ai_generated",
      confidenceScore: 0.90,
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
    },
  ]

  const performSearch = (query: string, addToHistory: boolean = true) => {
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    // Only add to history when explicitly requested (e.g., from history click or Enter key)
    if (addToHistory && query.trim()) {
      const newHistory = [query, ...searchHistory.filter((h) => h !== query)].slice(0, 10)
      setSearchHistory(newHistory)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
    }

    // Perform local search with improved matching
    const queryLower = query.toLowerCase().trim()
    
    // Create search terms - split by spaces and common separators
    const searchTerms = queryLower.split(/[\s,_-]+/).filter(term => term.length > 0)
    
    // Common aliases mapping
    const aliases: Record<string, string[]> = {
      'mrr': ['monthly recurring revenue', 'recurring revenue', 'monthly revenue', 'mrr'],
      'arr': ['annual recurring revenue', 'annual revenue', 'arr'],
      'burn': ['burn rate', 'cash burn', 'monthly burn', 'burn'],
      'runway': ['cash runway', 'runway months', 'months runway', 'runway'],
      'churn': ['churn rate', 'monthly churn', 'customer churn', 'churn'],
      'cac': ['customer acquisition cost', 'acquisition cost', 'cac'],
      'ltv': ['lifetime value', 'customer lifetime value', 'ltv'],
      'cash': ['cash balance', 'cash position', 'available cash', 'cash'],
      'revenue': ['revenue growth', 'revenue', 'total revenue'],
    }
    
    // Find matching alias keys
    const matchingAliasKeys: string[] = []
    for (const [key, values] of Object.entries(aliases)) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        matchingAliasKeys.push(key)
      }
      // Also check if query matches any alias value
      if (values.some(alias => queryLower.includes(alias) || alias.includes(queryLower))) {
        matchingAliasKeys.push(key)
      }
    }
    
    let filtered = allMetrics.filter((metric) => {
      const nameLower = metric.name.toLowerCase()
      const categoryLower = metric.category.toLowerCase()
      const idLower = metric.id.toLowerCase()
      
      // Check if query matches ID directly (e.g., "mrr" matches "mrr")
      if (idLower === queryLower || idLower.includes(queryLower) || queryLower.includes(idLower)) {
        return true
      }
      
      // Check if metric ID matches any alias key
      if (matchingAliasKeys.some(key => idLower.includes(key) || key.includes(idLower))) {
        return true
      }
      
      // Check if all search terms are found in name, category, or ID
      const allTermsMatch = searchTerms.every(term => 
        nameLower.includes(term) || 
        categoryLower.includes(term) ||
        idLower.includes(term)
      )
      
      if (allTermsMatch) {
        return true
      }
      
      // Check for partial matches in name
      if (nameLower.includes(queryLower)) {
        return true
      }
      
      // Check for partial matches in ID
      if (idLower.includes(queryLower)) {
        return true
      }
      
      // Check if any alias value matches the metric name or ID
      for (const [key, values] of Object.entries(aliases)) {
        if (idLower.includes(key) || nameLower.includes(key)) {
          if (values.some(alias => queryLower.includes(alias) || alias.includes(queryLower))) {
            return true
          }
        }
      }
      
      return false
    })
    
    // Remove duplicates based on ID
    const uniqueFiltered = filtered.filter((metric, index, self) => 
      index === self.findIndex(m => m.id === metric.id)
    )
    
    filtered = uniqueFiltered

    // Apply advanced filters
    if (sourceTypeFilter !== "all") {
      filtered = filtered.filter((metric) => metric.sourceType === sourceTypeFilter)
    }

    if (confidenceMin) {
      const minConfidence = parseFloat(confidenceMin) / 100
      filtered = filtered.filter((metric) => (metric.confidenceScore || 0) >= minConfidence)
    }

    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((metric) => {
        if (!metric.dateRange) return true
        return (
          metric.dateRange.from >= dateRange.from! &&
          metric.dateRange.to <= dateRange.to!
        )
      })
    }

    setSearchResults(filtered)
    setIsSearching(false)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setIsTyping(true)
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set timeout to mark typing as finished after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
    
    // Don't perform search immediately - let debounce handle it
    // Don't add to history on every keystroke - only on explicit actions
  }

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (searchQuery.trim()) {
      setIsTyping(false) // User submitted, so not actively typing
      // Add to history and perform search immediately when Enter is pressed
      performSearch(searchQuery, true)
    }
  }

  const handleSaveSearch = () => {
    if (!searchQuery.trim()) return

    const newSearch: SavedSearch = {
      id: `saved_${Date.now()}`,
      name: searchQuery.substring(0, 50),
      query: searchQuery,
      filters: {
        sourceType: sourceTypeFilter !== "all" ? sourceTypeFilter : undefined,
        confidenceMin: confidenceMin !== "0" ? parseFloat(confidenceMin) : undefined,
        dateFrom: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
        dateTo: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
      },
      createdAt: new Date().toISOString(),
    }

    const updated = [newSearch, ...savedSearches].slice(0, 20)
    setSavedSearches(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setSearchQuery(saved.query)
    setSourceTypeFilter(saved.filters.sourceType || "all")
    setConfidenceMin(saved.filters.confidenceMin ? String(saved.filters.confidenceMin) : "0")
    if (saved.filters.dateFrom && saved.filters.dateTo) {
      setDateRange({
        from: new Date(saved.filters.dateFrom),
        to: new Date(saved.filters.dateTo),
      })
    }
    setSearchQuery(saved.query)
    performSearch(saved.query, true) // Add to history when loading saved search
    setActiveTab("search")
  }

  const handleDeleteSavedSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id)
    setSavedSearches(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "saved")}>
      <div className="overflow-x-auto">
        <TabsList className="grid w-full grid-cols-2 min-w-[300px]">
          <TabsTrigger value="search" className="text-xs sm:text-sm">Search</TabsTrigger>
          <TabsTrigger value="saved" className="text-xs sm:text-sm">Saved Searches ({savedSearches.length})</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="search" className="space-y-4 overflow-x-auto overflow-y-visible">
      {/* Search Hints */}
      {showHints && !searchQuery && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 What can you search for?</h4>
                <div className="text-xs text-blue-700 space-y-1 mb-3">
                  <p><strong>Revenue Metrics:</strong> MRR, ARR, Revenue, Monthly Revenue</p>
                  <p><strong>Cost Metrics:</strong> Burn Rate, Expenses, CAC, LTV</p>
                  <p><strong>Financial Health:</strong> Runway, Cash Balance, Net Income</p>
                  <p><strong>Growth Metrics:</strong> Revenue Growth, Customer Growth, Churn Rate</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["MRR", "ARR", "Burn Rate", "Runway", "Revenue Growth", "CAC", "LTV"].map((hint) => (
                    <Button
                      key={hint}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setSearchQuery(hint)
                        setIsTyping(false) // User clicked, so not actively typing
                        performSearch(hint, true) // Add to history when clicking hint
                      }}
                    >
                      {hint}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHints(false)}
                className="h-6 w-6 p-0 ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Try: MRR, ARR, Burn Rate, Runway, Revenue Growth..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowHints(true)}
          onBlur={(e) => {
            // Only add to history if user has finished typing (not actively typing)
            // Wait a bit to see if user is coming back to continue typing
            const currentQuery = (e.target as HTMLInputElement).value
            setTimeout(() => {
              // Check if input still has focus (user might have clicked elsewhere)
              const activeElement = document.activeElement
              const isStillFocused = activeElement === e.target
              
              if (!isStillFocused && !isTyping && currentQuery.trim() && currentQuery.length >= 3) {
                // Only add if query is substantial (at least 3 characters) and user hasn't returned
                performSearch(currentQuery, true)
              }
            }, 1000) // Wait 1 second after blur to see if user returns
          }}
          onKeyDown={(e) => {
            // Prevent history update on backspace/delete
            if (e.key === 'Backspace' || e.key === 'Delete') {
              setIsTyping(true)
              // Clear any pending history updates
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
              }
            }
            // Enter key submits and adds to history
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearchSubmit(e)
            }
          }}
          className="pl-10 pr-20"
        />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-7"
            >
              <SlidersHorizontal className="h-3 w-3" />
            </Button>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveSearch}
                className="h-7"
                title="Save search"
              >
                <Save className="h-3 w-3" />
              </Button>
            )}
          </div>
      </form>

        {showAdvancedFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source Type</label>
                  <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="transaction">Transactions</SelectItem>
                      <SelectItem value="ai_generated">AI Generated</SelectItem>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Confidence</label>
                  <Select value={confidenceMin} onValueChange={setConfidenceMin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any</SelectItem>
                      <SelectItem value="50">≥ 50%</SelectItem>
                      <SelectItem value="70">≥ 70%</SelectItem>
                      <SelectItem value="85">≥ 85%</SelectItem>
                      <SelectItem value="90">≥ 90%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground",
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange as any}
                        onSelect={setDateRange as any}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {isSearching && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
            <p>Searching...</p>
          </CardContent>
        </Card>
      )}

      {!isSearching && searchResults.length > 0 && (
        <Card>
          <ScrollArea className="h-[300px]">
            <CardContent className="p-4 space-y-2">
              {searchResults.map((metric) => {
                const Icon = metric.icon
                return (
                  <button
                    key={metric.id}
                    onClick={() => {
                      setIsTyping(false) // User clicked, so not actively typing
                      performSearch(metric.name, true) // Add to history when selecting metric
                      onSelectMetric(metric.id)
                    }}
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{metric.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{metric.category}</span>
                            {metric.sourceType && (
                              <Badge variant="outline" className="text-xs">
                                {metric.sourceType}
                              </Badge>
                            )}
                            {metric.confidenceScore && (
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(metric.confidenceScore * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{metric.value}</div>
                      <div className="text-xs text-muted-foreground">{metric.lastUpdated}</div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {!isSearching && searchQuery && searchResults.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No metrics found matching "{searchQuery}"</p>
          </CardContent>
        </Card>
      )}

        {searchHistory.length > 0 && !searchQuery && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Searches</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearchHistory}
                  className="h-7 text-xs"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {searchHistory.slice(0, 5).map((historyItem, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setSearchQuery(historyItem)
                      setIsTyping(false) // User clicked, so not actively typing
                      performSearch(historyItem, false) // Don't add to history again
                    }}
                  >
                    <Search className="mr-2 h-3 w-3" />
                    {historyItem}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="saved" className="space-y-4">
        {savedSearches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Save className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No saved searches yet</p>
              <p className="text-xs mt-2">Save searches from the Search tab</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {savedSearches.map((saved) => (
              <Card key={saved.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{saved.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Query: "{saved.query}"
                      </div>
                      {Object.keys(saved.filters).length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {saved.filters.sourceType && (
                            <Badge variant="outline" className="text-xs">
                              {saved.filters.sourceType}
                            </Badge>
                          )}
                          {saved.filters.confidenceMin && (
                            <Badge variant="outline" className="text-xs">
                              ≥{saved.filters.confidenceMin}% confidence
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Saved {format(new Date(saved.createdAt), "MMM dd, yyyy")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadSavedSearch(saved)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSavedSearch(saved.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
    </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
