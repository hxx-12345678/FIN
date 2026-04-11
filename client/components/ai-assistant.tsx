"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Brain,
  Send,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  LinkIcon,
  Sparkles,
  FileCheck,
  Loader2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Database,
  Cpu,
  ShieldCheck,
  Target,
  Zap,
  TrendingDown,
  ArrowUpRight,
  Copy,
  Check,
  History,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  X,
  Paperclip,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
// ChartContainer removed — using native Recharts Tooltip to avoid context crash
import { StagedChangesPanel } from "./ai-assistant/staged-changes-panel"
import { useStagedChanges } from "@/hooks/use-staged-changes"
import { AgenticResponse } from "./ai-assistant/agentic-response"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"

interface AgentThought {
  step: number
  thought: string
  action?: string
  observation?: string
}

interface AgentVisualization {
  type: 'chart' | 'table' | 'metric' | 'comparison'
  title: string
  data: any
  config?: Record<string, any>
}

interface DataSource {
  type: string
  id: string
  name: string
  timestamp?: string
  confidence?: number
  snippet?: string
}

interface AgentRecommendation {
  id: string
  title: string
  description: string
  impact?: {
    type: 'positive' | 'negative' | 'neutral'
    metric: string
    value: string
    confidence: number
  }
  priority: string
  category: string
  actions: string[]
  risks?: string[]
}

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  sourceQuery?: string
  suggestions?: string[]
  actionable?: boolean
  recommendation?: string
  planId?: string
  // New agentic workflow fields
  agentThoughts?: AgentThought[]
  dataSources?: DataSource[]
  recommendations?: AgentRecommendation[]
  calculations?: Record<string, number>
  visualizations?: AgentVisualization[]
  confidence?: number
  requiresApproval?: boolean
  escalationReason?: string
  agentType?: string
  weakAssumptions?: Array<{
    id: string
    name: string
    issue: string
    recommendation: string
  }>
  statisticalMetrics?: {
    mape?: number;
    driftStatus?: 'stable' | 'warning' | 'critical';
  }
  confidenceIntervals?: {
    metric: string;
    p10: number;
    p50: number;
    p90: number;
  }
}

interface AICFOPlan {
  id: string
  goal: string
  planJson: {
    goal: string
    stagedChanges?: Array<{
      type: string
      action: string
      explain: string
      impact?: any
      priority?: string
      timeline?: string
      confidence?: number
      reasoning?: string
    }>
    structuredResponse?: {
      intent: string
      calculations?: Record<string, any>
      natural_text?: string
    }
    metadata?: {
      intent?: string
      intentConfidence?: number
      modelUsed?: string
      fallbackUsed?: boolean
      recommendationsSource?: string
    }
  }
  status: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in-progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high"
  integration: "slack" | "asana" | "calendar" | "internal"
  scenarioLink?: string
  assumptions?: string[]
  createdAt: Date
  dueDate?: Date
  completedAt?: Date
  planId?: string
}

const quickActions = [
  {
    title: "Cash Runway",
    description: "Data + Insight: Runway, burn rate & prediction",
    icon: TrendingUp,
    query: "What is my current cash runway?",
  },
  {
    title: "Variance Analysis",
    description: "Drill-down: Why did we miss forecast?",
    icon: AlertTriangle,
    query: "Why did our EBITDA miss the forecast?",
  },
  {
    title: "Scenario Simulation",
    description: "Model a 10% drop in revenue",
    icon: BarChart3,
    query: "Model a 10% drop in revenue for next quarter",
  },
  {
    title: "Anomaly Detection",
    description: "Scan for duplicate payments",
    icon: AlertCircle,
    query: "Any signs of duplicate payments this month?",
  },
  {
    title: "Board Summary",
    description: "Draft executive report",
    icon: Lightbulb,
    query: "Draft a summary for the upcoming board meeting",
  },
  {
    title: "Cost Optimization",
    description: "Find ways to reduce burn rate",
    icon: DollarSign,
    query: "How can I reduce my burn rate?",
  },
]

const initialMessages: Message[] = [
  {
    id: "1",
    type: "assistant",
    content:
      "Hi! I'm your **AI CFO** - a multi-agent system that provides CFO-level insights with full transparency.\n\n**What I can do:**\n• **Cash & Runway:** \"What's my current cash runway?\" - Get exact numbers plus predictions\n• **Variance Analysis:** \"Why did we miss forecast?\" - Drill-down into specific drivers\n• **Scenario Simulation:** \"Model a 10% revenue drop\" - Instant comparison & recommendations\n• **Anomaly Detection:** \"Any duplicate payments?\" - Scan transactions for issues\n• **Board Reports:** \"Draft a board summary\" - Executive-ready reports\n\n**How I work:** I use specialized agents (Treasury, Forecasting, Analytics, etc.) that collaborate to answer your questions. I show my reasoning and cite data sources so you can trust and verify my answers.",
    timestamp: new Date(Date.now() - 300000),
    suggestions: [
      "What's my current runway?",
      "Model a 10% drop in revenue",
      "Any duplicate payments this month?",
      "Draft a board meeting summary",
    ],
  },
]

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [plans, setPlans] = useState<AICFOPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [currentRecommendation, setCurrentRecommendation] = useState<string>("")
  const [overviewData, setOverviewData] = useState<any | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [activeVizKey, setActiveVizKey] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [reportViewContent, setReportViewContent] = useState<string>("")
  const [activeVizMode, setActiveVizMode] = useState<'primary' | 'alternate'>('primary')
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    integration: "internal" as Task["integration"],
    priority: "medium" as Task["priority"],
    dueDate: "",
  })
  const { changes: stagedChanges } = useStagedChanges("pending_approval")
  const pendingCount = stagedChanges.filter((c) => c.status === "pending_approval").length
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historySheetOpen, setHistorySheetOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // File upload state for chat
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getRecommendedVizKeys = useMemo(() => {
    return (query: string | undefined): string[] => {
      const q = (query || '').toLowerCase()
      if (!q.trim()) return []

      const wantsRunway = q.includes('runway') || q.includes('burn') || q.includes('cash')
      const wantsRevenueTrend = q.includes('revenue') || q.includes('forecast') || q.includes('target')
      const wantsExpenseBreakdown = q.includes('expense') || q.includes('opex') || q.includes('spend') || q.includes('vendor')
      const wantsMonteCarlo = q.includes('monte carlo') || q.includes('distribution') || q.includes('probability') || q.includes('survival')

      const keys: string[] = []
      if (wantsRunway) keys.push('burn_runway')
      if (wantsRevenueTrend) keys.push('revenue_forecast')
      if (wantsExpenseBreakdown) keys.push('expense_breakdown')
      if (wantsMonteCarlo) keys.push('montecarlo_placeholder')

      return keys.slice(0, 3)
    }
  }, [])

  const fetchOverviewData = async (orgIdToUse: string) => {
    if (overviewLoading) return
    setOverviewLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/orgs/${orgIdToUse}/overview`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) throw new Error(`Failed to load overview data: ${res.statusText}`)
      const json = await res.json()
      if (json?.ok && json?.data) {
        setOverviewData(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setOverviewLoading(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    fetchOrgId().then((fetchedOrgId) => {
      if (fetchedOrgId) {
        fetchPlans()
        fetchConversations(fetchedOrgId)
      }
    })
  }, [])

  useEffect(() => {
    if (orgId) {
      fetchPlans()
    } else {
      setPlans([])
      setTasks([])
    }
  }, [orgId])

  const fetchOrgId = async (): Promise<string | null> => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) {
      setOrgId(storedOrgId)
      return storedOrgId
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return null
      }

      if (response.ok) {
        const userData = await response.json()
        if (userData.orgs && userData.orgs.length > 0) {
          const primaryOrgId = userData.orgs[0].id
          localStorage.setItem("orgId", primaryOrgId)
          setOrgId(primaryOrgId)
          return primaryOrgId
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }

    return null
  }

  const fetchPlans = async () => {
    if (!orgId) return

    setLoadingPlans(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Your session has expired. Please log in again.")
      }

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.plans) {
          setPlans(result.plans)
          const planTasks: Task[] = result.plans.flatMap((plan: AICFOPlan) => {
            if (!plan.planJson?.stagedChanges) return []

            return plan.planJson.stagedChanges.map((change: any, idx: number) => ({
              id: `${plan.id}-${idx}`,
              title: change.action || "AI Recommendation",
              description: change.explain || "",
              status: "pending" as const,
              priority: (change.priority || "medium") as Task["priority"],
              integration: "internal" as const,
              createdAt: new Date(plan.createdAt),
              planId: plan.id,
            }))
          })
          setTasks(planTasks)
        }
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error)
    } finally {
      setLoadingPlans(false)
    }
  }

  const fetchConversations = async (orgIdToUse?: string) => {
    const targetOrgId = orgIdToUse || orgId
    if (!targetOrgId) return

    setLoadingHistory(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${targetOrgId}/ai-cfo/conversations`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok) setConversations(data.conversations)
      }
    } catch (e) {
      console.error("Failed to fetch history:", e)
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadConversation = async (conversationId: string) => {
    if (!orgId) return
    setIsTyping(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-cfo/conversations/${conversationId}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.conversation) {
          setCurrentConversationId(conversationId)
          const transformedMessages: Message[] = data.conversation.messages.map((m: any) => ({
            id: m.id,
            type: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
            agentType: m.agentType,
            agentThoughts: m.thoughts || [],
            dataSources: m.dataSources || [],
            recommendations: m.recommendations || [],
            calculations: m.calculations || {},
            visualizations: m.visualizations || [],
            confidence: m.confidence,
          }))
          setMessages(transformedMessages)
        }
      }
    } catch (e) {
      toast.error("Failed to load conversation")
    } finally {
      setIsTyping(false)
    }
  }

  const startNewChat = () => {
    setMessages(initialMessages)
    setCurrentConversationId(null)
    setAttachedFiles([])
  }

  const handleSendMessage = async (content: string, regenerate = false) => {
    if (!content.trim() && attachedFiles.length === 0) return
    const currentOrgId = orgId || (await fetchOrgId())
    if (!currentOrgId) {
      toast.error("Please log in to use AI CFO Assistant")
      return
    }

    // Step 0: Upload attachments if any
    const attachments: any[] = []
    if (attachedFiles.length > 0) {
      setIsTyping(true)
      for (const file of attachedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        try {
          const res = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/ai-cfo/upload`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: formData,
          })
          if (res.ok) {
            const data = await res.json()
            if (data.ok && data.attachment) {
              attachments.push(data.attachment)
            }
          }
        } catch (e) {
          console.error("Failed to upload attachment:", file.name)
        }
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date(),
      // Attachments are kept in the first user message for reference
      dataSources: attachments.map(a => ({
        type: 'user_upload',
        id: a.id,
        name: a.name,
        snippet: a.parsedSummary
      }))
    }

    if (!regenerate) {
      setMessages((prev) => [...prev, userMessage])
    }
    setInputValue("")
    setAttachedFiles([])
    setIsTyping(true)
    setError(null)

    // Current assistant message placeholder for streaming
    const assistantMessageId = (Date.now() + 1).toString()
    let currentAssistantMessage: Message = {
      id: assistantMessageId,
      type: "assistant",
      content: "",
      timestamp: new Date(),
      agentThoughts: [],
    }

    setMessages((prev) => [...prev, currentAssistantMessage])

    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/ai-cfo/query/stream`, {
        signal: abortControllerRef.current.signal,
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: content,
          context: {
            conversationId: currentConversationId,
            attachments: attachments.length > 0 ? attachments : undefined
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to start streaming")
      if (!response.body) throw new Error("Response body is empty")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let planCreated = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6))

          if (data.type === "conversation_id") {
            setCurrentConversationId(data.payload.conversationId)
            fetchConversations(currentOrgId)
          } else if (data.type === "thought") {
            currentAssistantMessage = {
              ...currentAssistantMessage,
              agentThoughts: [...(currentAssistantMessage.agentThoughts || []), data.payload],
            }
          } else if (data.type === "response") {
            const res = data.payload
            if (res.planId) planCreated = true
            currentAssistantMessage = {
              ...currentAssistantMessage,
              content: res.answer,
              agentType: res.agentType,
              confidence: res.confidence,
              dataSources: res.dataSources,
              recommendations: res.recommendations,
              calculations: res.calculations,
              visualizations: res.visualizations,
              suggestions: res.followUpQuestions,
            }
          }

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? currentAssistantMessage : m))
          )
        }
      }

      // ONLY refetch plans if a plan was actually created (optimization)
      if (planCreated) {
        fetchPlans()
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted')
      } else {
        toast.error("Error streaming response")
        console.error(err)
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleCreateTask = (recommendation: string, planId?: string) => {
    if (!recommendation) return
    setCurrentRecommendation(recommendation)
    setTaskForm({
      title: recommendation,
      description: "",
      integration: "internal",
      priority: "medium",
      dueDate: "",
    })
    setShowTaskDialog(true)
  }

  const handleSaveTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskForm.title,
      description: taskForm.description,
      status: "pending",
      priority: taskForm.priority,
      integration: taskForm.integration,
      createdAt: new Date(),
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
    }

    setTasks((prev) => [newTask, ...prev])
    setShowTaskDialog(false)
    toast.success("Task created successfully")
  }

  const handleTaskStatusChange = (taskId: string, newStatus: Task["status"]) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
            ...task,
            status: newStatus,
            completedAt: newStatus === "completed" ? new Date() : undefined,
          }
          : task,
      ),
    )
  }

  const handleQuickAction = (action: (typeof quickActions)[0]) => {
    handleSendMessage(action.query)
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "in-progress": return <Clock className="h-4 w-4 text-blue-600" />
      case "cancelled": return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200"
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low": return "bg-green-100 text-green-800 border-green-200"
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI CFO <span className="text-xs font-semibold ml-1.5 opacity-70 align-top">V1.0 pro</span>
              </h1>
              <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
                <Cpu className="h-3 w-3" />
                Multi-Agent System
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" />
                Explainable AI
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Specialized agents for Treasury, Forecasting, Analytics, Anomaly Detection & Reporting
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <FileCheck className="h-4 w-4 mr-2" />
              Tasks
              {tasks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="staged-changes">
              <CheckCircle className="h-4 w-4 mr-2" />
              Staged Changes
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="missions" className="opacity-60 cursor-not-allowed">
              <Target className="h-4 w-4 mr-2" />
              Missions
              <Badge variant="outline" className="ml-2 py-0 h-4 text-[8px] uppercase">Alpha</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="h-[600px] sm:h-[700px] lg:h-[800px] flex flex-col overflow-hidden border-border/40 shadow-xl bg-background/50 backdrop-blur-md">
                  <CardHeader className="border-b border-border/30 flex-shrink-0 py-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold tracking-tight">AI CFO Orchestrator</CardTitle>
                          <CardDescription className="text-[11px] font-medium text-muted-foreground/70 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Multi-agent digital coworker active
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={startNewChat}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => {
                                fetchConversations()
                                setHistorySheetOpen(true)
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Chat History</TooltipContent>
                        </Tooltip>
                        <Badge variant="outline" className="text-[10px] h-6 bg-background/50 border-border/50 text-foreground/70 font-mono">
                          v1.0-PRO
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                    <ScrollArea className="flex-1 min-h-0 scrollbar-none">
                      <div className="space-y-0 p-0">
                        {messages.length === 0 && (
                          <div className="flex flex-col items-center justify-center min-h-[400px] py-8 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                            <Brain className="h-16 w-16 text-primary animate-pulse" />
                            <h2 className="text-2xl font-bold">How can I help your finance team today?</h2>
                          </div>
                        )}
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`group w-full py-10 transition-colors border-b border-border/10 last:border-0 ${message.type === "user" ? "bg-muted/5" : "bg-transparent hover:bg-muted/5"
                              } animate-in fade-in slide-in-from-bottom-2 duration-500`}
                          >
                            <div className="max-w-3xl mx-auto px-6 flex gap-8">
                              <div className="flex-shrink-0 mt-1">
                                {message.type === "user" ? (
                                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                    ME
                                  </div>
                                ) : (
                                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform ring-1 ring-white/10">
                                    <Sparkles className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {message.type === "assistant" && message.agentType && (
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-200/20 shadow-sm">
                                      {message.agentType}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/30 font-light">—</span>
                                    <span className="text-[11px] font-semibold text-muted-foreground tracking-tight">Financial Intelligence Network</span>
                                  </div>
                                )}

                                {/* AGENTIC THINKING UX: Show live thoughts DURING streaming before content arrives */}
                                {message.type === "assistant" && !message.content && message.agentThoughts && message.agentThoughts.length > 0 && (
                                  <div className="space-y-3 mb-6 animate-in fade-in duration-300">
                                    {message.agentThoughts.map((thought, idx) => (
                                      <div key={idx} className="flex items-start gap-3 animate-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-mono font-black shadow-sm ${idx === message.agentThoughts!.length - 1
                                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse'
                                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          }`}>
                                          {idx === message.agentThoughts!.length - 1 ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-[12px] font-semibold text-foreground/70">{thought.thought}</span>
                                          {thought.action && (
                                            <span className="ml-2 text-[10px] font-bold text-indigo-500/60 uppercase tracking-wider">
                                              [{thought.action}]
                                            </span>
                                          )}
                                          {thought.observation && (
                                            <div className="text-[11px] text-emerald-500 mt-1 font-medium flex items-center gap-1.5">
                                              <CheckCircle2 className="h-2.5 w-2.5" />
                                              {thought.observation}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {/* Skeleton loader for content that's about to arrive */}
                                    <div className="mt-4 space-y-2.5 opacity-40">
                                      <div className="h-2 bg-muted/60 rounded-full w-full animate-pulse" />
                                      <div className="h-2 bg-muted/60 rounded-full w-5/6 animate-pulse" style={{ animationDelay: '150ms' }} />
                                      <div className="h-2 bg-muted/60 rounded-full w-3/4 animate-pulse" style={{ animationDelay: '300ms' }} />
                                    </div>
                                  </div>
                                )}

                                {/* Render actual content when available */}
                                {message.content && (
                                  <div className={message.type === "user" ? "text-[15px] font-medium text-foreground leading-relaxed antialiased" : "antialiased"}>
                                    <AgenticResponse content={message.content} isUser={message.type === "user"} />
                                  </div>
                                )}
                                {message.visualizations && message.visualizations.length > 0 && (
                                  <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {message.visualizations.map((viz: any, idx: number) => (
                                      <div key={idx} className="p-6 rounded-2xl border border-white/[0.06] bg-[#0f0f1a] shadow-2xl overflow-hidden relative group">
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <h4 className="text-[13px] uppercase tracking-[0.15em] font-black text-white/80 mb-6 flex items-center gap-2.5">
                                          <BarChart3 className="h-4 w-4 text-cyan-400" />
                                          {viz.title}
                                        </h4>
                                        <div className="h-[380px] w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                            {viz.type === 'bar' || viz.type === 'chart' ? (
                                              <BarChart data={viz.data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                                <XAxis
                                                  dataKey="name" fontSize={12} tickMargin={12}
                                                  stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontWeight: 600 }}
                                                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                />
                                                <YAxis
                                                  fontSize={11} tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                                                  stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontWeight: 500 }}
                                                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                />
                                                <RechartsTooltip
                                                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', fontSize: '12px', color: '#f1f5f9', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                                                  labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}
                                                  itemStyle={{ color: '#e2e8f0' }}
                                                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                                                  cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                                                />
                                                <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '12px', fontWeight: 600, paddingTop: '16px' }} />
                                                <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} name="Actual" />
                                                {(viz.data[0] && viz.data[0].target) && <Bar dataKey="target" fill="#34d399" radius={[6, 6, 0, 0]} name="Target" opacity={0.7} />}
                                                {(viz.data[0] && viz.data[0].baseline) && <Bar dataKey="baseline" fill="#fbbf24" radius={[6, 6, 0, 0]} name="Baseline" opacity={0.6} />}
                                              </BarChart>
                                            ) : (
                                              <LineChart data={viz.data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                                <XAxis
                                                  dataKey="name" fontSize={12} tickMargin={12}
                                                  stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontWeight: 600 }}
                                                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                />
                                                <YAxis
                                                  fontSize={11} tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                                                  stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontWeight: 500 }}
                                                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                />
                                                <RechartsTooltip
                                                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', fontSize: '12px', color: '#f1f5f9', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                                                  labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}
                                                  itemStyle={{ color: '#e2e8f0' }}
                                                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                                                />
                                                <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '12px', fontWeight: 600, paddingTop: '16px' }} />
                                                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} dot={{ r: 5, fill: '#22d3ee', strokeWidth: 2, stroke: '#0f0f1a' }} activeDot={{ r: 7, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }} name="Actual" />
                                                {(viz.data[0] && viz.data[0].baseline) && <Line type="monotone" dataKey="baseline" stroke="#f472b6" strokeDasharray="6 4" strokeWidth={2.5} dot={{ r: 4, fill: '#f472b6' }} name="Baseline" />}
                                                {(viz.data[0] && viz.data[0].target) && <Line type="monotone" dataKey="target" stroke="#34d399" strokeWidth={2} dot={{ r: 4, fill: '#34d399' }} name="Target" />}
                                              </LineChart>
                                            )}
                                          </ResponsiveContainer>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}


                                {message.type === "assistant" && (
                                  <div className="flex items-center gap-5 mt-8 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(message.content)
                                        setCopiedMessageId(message.id)
                                        setTimeout(() => setCopiedMessageId(null), 2000)
                                      }}
                                      className="inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors group/btn"
                                    >
                                      {copiedMessageId === message.id ? (
                                        <><Check className="h-3 w-3 text-emerald-500" /> Copied</>
                                      ) : (
                                        <><Copy className="h-3 w-3 group-hover/btn:scale-110 transition-transform" /> Copy</>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const prevUserMsg = messages.slice(0, messages.findIndex(m => m.id === message.id)).reverse().find(m => m.type === 'user');
                                        if (prevUserMsg) handleSendMessage(prevUserMsg.content, true);
                                      }}
                                      className="inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors group/btn"
                                    >
                                      <RefreshCw className="h-3 w-3 group-hover/btn:rotate-180 transition-transform duration-500" /> Regenerate
                                    </button>
                                    <button
                                      onClick={() => {
                                        setReportViewContent(message.content);
                                        setSheetOpen(true);
                                      }}
                                      className="inline-flex items-center gap-2 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                    >
                                      <FileText className="h-3 w-3" /> Report View
                                    </button>
                                  </div>
                                )}

                                {message.type === "assistant" && (message.agentThoughts?.length || message.dataSources?.length) && (
                                  <div className="mt-10 pt-6 border-t border-border/10 space-y-4">
                                    <div className="flex items-center gap-4">
                                      {message.confidence && (
                                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-sm ${message.confidence > 0.8 ? 'bg-emerald-50/50 text-emerald-700 border-emerald-200/50' :
                                          message.confidence > 0.6 ? 'bg-amber-50/50 text-amber-700 border-amber-200/50' :
                                            'bg-red-50/50 text-red-700 border-red-200/50'
                                          }`}>
                                          <div className={`w-1.5 h-1.5 rounded-full ${message.confidence > 0.8 ? 'bg-emerald-500' : message.confidence > 0.6 ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
                                          VERIFIED: {Math.round(message.confidence * 100)}%
                                        </div>
                                      )}

                                      {message.agentThoughts && message.agentThoughts.length > 0 && (
                                        <Collapsible>
                                          <CollapsibleTrigger className="group flex items-center gap-2 text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors font-bold uppercase tracking-[0.1em]">
                                            Audit Trail
                                            <ChevronDown className="h-3 w-3 group-data-[state=open]:rotate-180 transition-transform" />
                                          </CollapsibleTrigger>
                                          <CollapsibleContent className="mt-5">
                                            <div className="bg-muted/20 rounded-2xl p-6 text-[12.5px] space-y-4 border border-border/10 shadow-inner backdrop-blur-sm">
                                              {message.agentThoughts.map((thought, idx) => (
                                                <div key={idx} className="flex items-start gap-5">
                                                  <div className="w-7 h-7 rounded-lg bg-background border border-border/50 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5 shadow-sm text-foreground/40">{thought.step}</div>
                                                  <div className="leading-6 flex-1">
                                                    <span className="text-foreground/80 font-medium">{thought.thought}</span>
                                                    {thought.observation && (
                                                      <div className="text-emerald-700 dark:text-emerald-400 mt-2 font-semibold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 inline-flex items-center gap-2 text-[11.5px] animate-in fade-in slide-in-from-left-1">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        {thought.observation}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {message.suggestions && message.suggestions.length > 0 && (
                                  <div className="mt-10 flex flex-wrap gap-2.5">
                                    {message.suggestions.map((suggestion, idx) => (
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        className="text-[11.5px] font-semibold h-8 rounded-xl bg-background border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm"
                                        onClick={() => handleSendMessage(suggestion)}
                                      >
                                        {suggestion}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {isTyping && (() => {
                          // Check if the latest assistant message already has thoughts rendering
                          const lastMsg = messages[messages.length - 1];
                          const hasLiveThoughts = lastMsg?.type === 'assistant' && !lastMsg.content && lastMsg.agentThoughts && lastMsg.agentThoughts.length > 0;
                          if (hasLiveThoughts) return null; // Thoughts are rendering inside the message bubble
                          return (
                            <div className="w-full py-10 bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="max-w-3xl mx-auto px-6 flex gap-8">
                                <div className="flex-shrink-0">
                                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-indigo-500/10">
                                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                                  </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/20 dark:border-indigo-500/20 shadow-sm">
                                      <Loader2 className="h-3 w-3 text-indigo-600 dark:text-indigo-400 animate-spin" />
                                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                        Initializing Agent Network...
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2 max-w-xs opacity-30">
                                    <div className="h-1.5 bg-muted/60 rounded-full w-full animate-pulse" />
                                    <div className="h-1.5 bg-muted/60 rounded-full w-4/5 animate-pulse" style={{ animationDelay: '200ms' }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div ref={messagesEndRef} />
                    </ScrollArea>

                    <div className="border-t bg-background/80 backdrop-blur-xl p-6 flex-shrink-0">
                      <div className="max-w-3xl mx-auto relative group-input">
                        {attachedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2">
                            {attachedFiles.map((file, idx) => (
                              <div key={idx} className="relative group/file bg-muted/50 rounded-lg p-2 pr-8 border border-border/50 text-[11px] font-medium flex items-center gap-2 max-w-[200px] truncate shadow-sm">
                                {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 text-indigo-500" /> : <Paperclip className="h-3 w-3 text-slate-500" />}
                                {file.name}
                                <button
                                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover/file:opacity-100 flex items-center justify-center"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-end gap-3 bg-muted/30 rounded-[24px] border border-border/60 px-5 py-4 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 focus-within:bg-background transition-all shadow-xl shadow-black/5 ring-1 ring-white/10">
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              setAttachedFiles(prev => [...prev, ...files])
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-primary hover:bg-primary/5 flex-shrink-0 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <textarea
                            placeholder="Message AI CFO..."
                            value={inputValue}
                            onChange={(e) => {
                              setInputValue(e.target.value)
                              e.target.style.height = 'auto'
                              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMessage(inputValue)
                                  ; (e.target as HTMLTextAreaElement).style.height = 'auto'
                              }
                            }}
                            className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] placeholder:text-muted-foreground/50 min-h-[28px] max-h-[200px] leading-relaxed py-1 antialiased"
                            rows={1}
                            disabled={isTyping}
                          />
                          {isTyping ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (abortControllerRef.current) abortControllerRef.current.abort();
                                setIsTyping(false);
                              }}
                              className="h-8 px-3 rounded-xl flex-shrink-0 bg-red-500 hover:bg-red-600 shadow-md transition-all active:scale-95 text-xs font-bold text-white"
                            >
                              <div className="flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" /> Stop
                              </div>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                handleSendMessage(inputValue)
                                setAttachedFiles([])
                              }}
                              disabled={!inputValue.trim() && attachedFiles.length === 0}
                              className="h-8 w-8 rounded-xl flex-shrink-0 bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 px-1">
                          <span className="text-[10px] text-muted-foreground/40 font-medium tracking-tight">Shift + Enter for new line • Advanced Multi-Agent Orchestrator v1.0</span>
                          <div className="flex items-center gap-4">
                            {attachedFiles.length > 0 && (
                              <span className="text-[10px] font-bold text-indigo-600/60 uppercase tracking-widest">{attachedFiles.length} File(s) Staged</span>
                            )}
                            <span className="text-[10px] text-muted-foreground/40 font-mono tracking-tighter">{inputValue.length > 0 ? `${inputValue.length}/500` : ''}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="shadow-lg border-border/40">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <CardDescription>Common financial analysis tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start h-auto p-3 bg-transparent hover:bg-muted/50 transition-all border-border/30"
                        onClick={() => handleQuickAction(action)}
                        disabled={isTyping}
                      >
                        <action.icon className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                        <div className="text-left">
                          <div className="font-semibold text-sm">{action.title}</div>
                          <div className="text-[11px] text-muted-foreground">{action.description}</div>
                        </div>
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl border-none">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-300" />
                      Proactive Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Runway Threshold</div>
                      <div className="text-sm font-medium mt-1">Alert if runway drops below 6 months</div>
                      <div className="mt-2 text-[10px] bg-emerald-500/20 text-emerald-300 inline-block px-2 py-0.5 rounded font-bold uppercase">Active Monitoring</div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Anomaly Detection</div>
                      <div className="text-sm font-medium mt-1">Monitor for duplicate vendor payments</div>
                      <div className="mt-2 text-[10px] bg-emerald-500/20 text-emerald-300 inline-block px-2 py-0.5 rounded font-bold uppercase">Active Monitoring</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI-Generated Tasks</CardTitle>
                    <CardDescription>Actionable tasks created from AI CFO recommendations</CardDescription>
                  </div>
                  <Button onClick={() => setShowTaskDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPlans ? (
                  <Skeleton className="h-48 w-full" />
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No tasks yet</h3>
                    <p className="text-sm text-muted-foreground">Ask AI CFO for strategic recommendations to generate tasks.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <Card key={task.id} className={`border-l-4 ${task.status === "completed" ? "border-l-green-500" : "border-l-yellow-500"}`}>
                        <CardContent className="p-4 flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <h4 className="font-medium">{task.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                            <div className="flex gap-2">
                              <Badge variant="outline" className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            </div>
                          </div>
                          <Select value={task.status} onValueChange={(val) => handleTaskStatusChange(task.id, val as Task["status"])}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staged-changes" className="space-y-4">
            <StagedChangesPanel />
          </TabsContent>

          <TabsContent value="missions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Missions Control</h3>
                <p className="text-sm text-muted-foreground">Autonomous financial workflows running in the background.</p>
              </div>
              <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                <Target className="h-4 w-4" /> Deploy Mission
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-emerald-500 overflow-hidden group hover:shadow-xl transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">ACTIVE</Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">Daily Anomaly Guardian</CardTitle>
                  <CardDescription>Monitors accounts payable for duplicates and fraudulent spend.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Detection Status</span>
                      <span className="font-bold">Monitoring</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[92%] animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex -space-x-2">
                        {['Treasury', 'Anomaly', 'Analytics'].map((agent, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger>
                              <div className="h-6 w-6 rounded-full border-2 border-background bg-slate-100 flex items-center justify-center text-[8px] font-bold">{agent[0]}</div>
                            </TooltipTrigger>
                            <TooltipContent>{agent} Agent</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">Multi-agent consensus active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500 overflow-hidden group hover:shadow-xl transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">SCHEDULED</Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">Strategic Runway Forecaster</CardTitle>
                  <CardDescription>Generates weekly P10/P50/P90 cash flow projections.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Next Execution</span>
                      <span className="font-bold text-indigo-600 italic">Periodic</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-[45%] opacity-30" />
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <button className="text-[10px] font-bold text-muted-foreground hover:text-foreground">View Trace</button>
                      <button className="text-[10px] font-bold text-indigo-600">Sync Now</button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(val) => setTaskForm({ ...taskForm, priority: val as Task["priority"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveTask}>Save Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[95vw] sm:w-[520px]">
            <SheetHeader>
              <SheetTitle>Institutional Analysis Report</SheetTitle>
              <SheetDescription>Deep-dive data visualization and audit trail.</SheetDescription>
            </SheetHeader>
            <div className="mt-8 space-y-6">
              <div className="p-12 text-center border-2 border-dashed rounded-xl">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium text-muted-foreground">Detailed view for "{activeVizKey}" coming soon.</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Sheet open={historySheetOpen} onOpenChange={setHistorySheetOpen}>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Chat History</SheetTitle>
              <SheetDescription>Access your previous AI CFO strategic sessions.</SheetDescription>
            </SheetHeader>
            <div className="mt-8 space-y-4">
              <Button onClick={() => { startNewChat(); setHistorySheetOpen(false); }} className="w-full justify-start gap-2" variant="outline">
                <Plus className="h-4 w-4" /> New Strategic Session
              </Button>
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-2">
                  {conversations.length === 0 && !loadingHistory && (
                    <p className="text-center text-sm text-muted-foreground py-8">No past sessions found.</p>
                  )}
                  {loadingHistory && (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  )}
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        loadConversation(conv.id)
                        setHistorySheetOpen(false)
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${currentConversationId === conv.id
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted"
                        }`}
                    >
                      <div className="font-bold text-sm truncate">{conv.title || "New Session"}</div>
                      <div className="text-[10px] opacity-60 mt-1 flex items-center justify-between">
                        <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                        <span>{conv._count?.messages || 0} messages</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        {/* Report View Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[90vw] sm:w-[75vw] lg:w-[60vw] xl:w-[50vw] bg-background overflow-y-auto">
            <SheetHeader className="mb-6 border-b pb-4">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Institutional Report View
              </SheetTitle>
              <SheetDescription>
                Full-width report view for board-ready presentation
              </SheetDescription>
            </SheetHeader>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <AgenticResponse content={reportViewContent} isUser={false} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
