"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { StagedChangesPanel } from "./ai-assistant/staged-changes-panel"
import { useStagedChanges } from "@/hooks/use-staged-changes"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface AgentThought {
  step: number
  thought: string
  action?: string
  observation?: string
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
  suggestions?: string[]
  actionable?: boolean
  recommendation?: string
  planId?: string
  // New agentic workflow fields
  agentThoughts?: AgentThought[]
  dataSources?: DataSource[]
  recommendations?: AgentRecommendation[]
  calculations?: Record<string, number>
  confidence?: number
  requiresApproval?: boolean
  escalationReason?: string
  agentType?: string
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
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    integration: "internal" as Task["integration"],
    priority: "medium" as Task["priority"],
    dueDate: "",
  })
  const { changes: stagedChanges } = useStagedChanges("pending")
  const pendingCount = stagedChanges.filter((c) => c.status === "pending").length

  useEffect(() => {
    // Only fetch data if user is authenticated
    const token = localStorage.getItem("auth-token") || document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]

    if (token) {
      fetchOrgId().then((fetchedOrgId) => {
        // Only fetch plans after orgId is confirmed
        if (fetchedOrgId) {
          fetchPlans()
        }
      })
    }
  }, [])

  // Refetch when orgId changes
  useEffect(() => {
    if (orgId) {
      fetchPlans()
    } else {
      // Clear data if no orgId
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
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return null

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

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
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.plans) {
          setPlans(result.plans)
          // Convert plans to tasks
          const planTasks: Task[] = result.plans.flatMap((plan: AICFOPlan) => {
            const metadata = plan.planJson?.metadata || {}
            const fallbackUsed =
              metadata.fallbackUsed ||
              metadata.recommendationsSource === "fallback" ||
              (metadata.modelUsed && String(metadata.modelUsed).toLowerCase().includes("fallback"))

            // Keep staged changes even for fallback plans (fallback can still be actionable)
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

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    if (!orgId) {
      const fetchedOrgId = await fetchOrgId()
      if (!fetchedOrgId) {
        toast.error("Please log in to use AI CFO Assistant")
        return
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)
    setError(null)

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const currentOrgId = orgId || (await fetchOrgId())
      if (!currentOrgId) {
        throw new Error("Organization ID not found")
      }

      // Call AI CFO Agentic API (new multi-agent orchestration)
      const response = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/ai-cfo/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          query: content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to generate AI plan: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.ok && result.response) {
        const agentResponse = result.response
        const planId = result.planId
        
        // Extract agentic workflow data
        const thoughts = agentResponse.thoughts || []
        const dataSources = agentResponse.dataSources || []
        const recommendations = agentResponse.recommendations || []
        const calculations = agentResponse.calculations || {}
        const confidence = agentResponse.confidence || 0
        const requiresApproval = agentResponse.requiresApproval || false
        const escalationReason = agentResponse.escalationReason
        const followUpQuestions = agentResponse.followUpQuestions || []
        const agentType = agentResponse.agentType

        // Build response text
        let responseText = agentResponse.answer || ""
        
        // Add confidence indicator
        if (confidence > 0.8) {
          responseText += `\n\n✅ *Confidence: ${Math.round(confidence * 100)}%*`
        } else if (confidence > 0.6) {
          responseText += `\n\n⚠️ *Confidence: ${Math.round(confidence * 100)}% - Consider verifying with additional data*`
        }

        // If requires approval, add notice
        if (requiresApproval && escalationReason) {
          responseText = `⏳ **Approval Required**\n\n${escalationReason}\n\n---\n\n` + responseText
        }

        // Create rich message with agentic data
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: responseText,
          timestamp: new Date(),
          suggestions: followUpQuestions.length > 0 
            ? followUpQuestions
            : [
                "Tell me more about this",
                "What are the key risks?",
                "What should I focus on?",
              ],
          actionable: recommendations.length > 0,
          recommendation: recommendations[0]?.title,
          planId,
          // New agentic workflow fields
          agentThoughts: thoughts,
          dataSources,
          recommendations,
          calculations,
          confidence,
          requiresApproval,
          escalationReason,
          agentType,
        }

        setMessages((prev) => [...prev, aiResponse])
        
        // Refresh plans and insights
        await fetchPlans()
        
        toast.success(
          recommendations.length > 0
            ? `AI CFO analysis complete (${agentType} agent)`
            : "Analysis complete"
        )
      } else if (result.ok && result.plan) {
        // Fallback: Handle legacy response format
        const plan = result.plan
        const planJson = plan.planJson || {}
        const structuredResponse = planJson.structuredResponse || {}
        const responseText = structuredResponse.natural_text || "Analysis completed."
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: responseText,
          timestamp: new Date(),
          suggestions: ["Ask another question"],
          planId: plan.id,
        }

        setMessages((prev) => [...prev, aiResponse])
        await fetchPlans()
        toast.success("AI CFO analysis completed")
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate AI response"
      setError(errorMessage)
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again or rephrase your question.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorResponse])
      toast.error(errorMessage)
    } finally {
      setIsTyping(false)
    }
  }

  const handleCreateTask = (recommendation: string, planId?: string) => {
    // Only create tasks from actual recommendations, not from user questions
    if (!recommendation || recommendation.length < 10) {
      toast.error("Please select a valid recommendation to create a task")
      return
    }

    // Find the actual recommendation from plans
    let taskDescription = ""
    let taskPriority: Task["priority"] = "medium"
    
    if (planId) {
      const plan = plans.find((p) => p.id === planId)
      if (plan?.planJson?.stagedChanges) {
        const change = plan.planJson.stagedChanges.find((c: any) => c.action === recommendation)
        if (change) {
          taskDescription = change.explain || change.reasoning || ""
          taskPriority = (change.priority || "medium") as Task["priority"]
        }
      }
    }

    setCurrentRecommendation(recommendation)
    setTaskForm({
      title: recommendation,
      description: taskDescription,
      integration: "internal",
      priority: taskPriority,
      dueDate: "",
    })
    setShowTaskDialog(true)
  }

  const handleSaveTask = () => {
    // Validate task title
    if (!taskForm.title || taskForm.title.trim().length < 5) {
      toast.error("Task title must be at least 5 characters")
      return
    }

    // Don't create tasks from generic user questions
    const lowerTitle = taskForm.title.toLowerCase()
    const isQuestion = lowerTitle.includes("what") || lowerTitle.includes("how") || 
                      lowerTitle.includes("when") || lowerTitle.includes("why") ||
                      lowerTitle.includes("predict") || lowerTitle.includes("feel")
    
    if (isQuestion && !taskForm.description) {
      toast.error("Please provide a proper task description. Questions cannot be converted to tasks directly.")
      return
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: taskForm.title,
      description: taskForm.description || "AI CFO recommendation",
      status: "pending",
      priority: taskForm.priority,
      integration: taskForm.integration,
      scenarioLink: "/scenarios/runway-extension",
      assumptions: ["AI-generated recommendation from CFO analysis"],
      createdAt: new Date(),
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
    }

    setTasks((prev) => [newTask, ...prev])
    setShowTaskDialog(false)

    const confirmMessage: Message = {
      id: (Date.now() + 2).toString(),
      type: "assistant",
      content: `✅ Task created successfully! I've added "${taskForm.title}" to your task list${
        taskForm.integration !== "internal" ? ` and exported it to ${taskForm.integration}` : ""
      }. You can track its progress in the Tasks tab.`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, confirmMessage])
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

    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      const auditMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `📋 Task "${task.title}" status updated to ${newStatus}. ${
          newStatus === "completed"
            ? "Great work! This recommendation has been executed and will be reflected in your next AI report."
            : ""
        }`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, auditMessage])
    }
  }

  const handleQuickAction = (action: (typeof quickActions)[0]) => {
    handleSendMessage(action.query)
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
    }
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI CFO
            </h1>
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200"
            >
              <Cpu className="h-3 w-3" />
              Multi-Agent System
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-xs"
            >
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

      {/* Help Section */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900">How AI CFO Assistant Works:</p>
              <div className="space-y-1 text-blue-800">
                <p><strong>💬 Chat Tab:</strong> Ask financial questions and get AI-powered insights. Example: "What's my runway?" or "How can I reduce burn rate?"</p>
                <p><strong>✅ Staged Changes Tab:</strong> Review detailed AI recommendations before implementing. Each recommendation shows impact, reasoning, and data sources. Approve or reject changes here.</p>
                <p><strong>📋 Tasks Tab:</strong> Actionable tasks created from approved recommendations. Track your financial action items and mark them complete as you implement them.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <Card className="h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col overflow-hidden">
                <CardHeader className="border-b flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Chat with AI CFO
                  </CardTitle>
                  <CardDescription>Ask questions or request financial analysis plans</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-4 p-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.type === "assistant" && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                <Brain className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap">
                              {message.content.split('\n').map((line, idx) => {
                                // Process markdown formatting
                                const renderLine = (text: string): (string | JSX.Element)[] => {
                                  const parts: (string | JSX.Element)[] = [];
                                  let lastIndex = 0;
                                  
                                  // Process bold **text**
                                  const boldRegex = /\*\*(.*?)\*\*/g;
                                  let match;
                                  const matches: Array<{start: number, end: number, text: string}> = [];
                                  
                                  while ((match = boldRegex.exec(text)) !== null) {
                                    matches.push({
                                      start: match.index,
                                      end: match.index + match[0].length,
                                      text: match[1]
                                    });
                                  }
                                  
                                  matches.forEach((boldMatch, matchIdx) => {
                                    if (boldMatch.start > lastIndex) {
                                      parts.push(text.substring(lastIndex, boldMatch.start));
                                    }
                                    parts.push(<strong key={`bold-${idx}-${matchIdx}`}>{boldMatch.text}</strong>);
                                    lastIndex = boldMatch.end;
                                  });
                                  
                                  if (lastIndex < text.length) {
                                    parts.push(text.substring(lastIndex));
                                  }
                                  
                                  return parts.length > 0 ? parts : [text];
                                };
                                
                                const renderedContent = renderLine(line);
                                
                                // Headers
                                if (line.trim().startsWith('## ')) {
                                  return <h3 key={idx} className="font-bold text-base mt-4 mb-2">{line.replace('## ', '')}</h3>;
                                }
                                if (line.trim().startsWith('### ')) {
                                  return <h4 key={idx} className="font-semibold text-sm mt-3 mb-1">{line.replace('### ', '')}</h4>;
                                }
                                
                                // Bullet points
                                if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                                  return <div key={idx} className="ml-4 my-1">{renderedContent}</div>;
                                }
                                
                                // Regular line
                                if (line.trim()) {
                                  return <p key={idx} className="my-1">{renderedContent}</p>;
                                }
                                
                                return <br key={idx} />;
                              })}
                            </div>
                            {/* Agent Workflow Display */}
                            {message.type === "assistant" && (message.agentThoughts?.length || message.dataSources?.length) && (
                              <div className="mt-3 space-y-2">
                                {/* Agent Type Badge */}
                                {message.agentType && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      <Cpu className="h-3 w-3 mr-1" />
                                      {message.agentType.charAt(0).toUpperCase() + message.agentType.slice(1)} Agent
                                    </Badge>
                                    {message.confidence && (
                                      <Badge variant="outline" className={`text-xs ${
                                        message.confidence > 0.8 ? 'bg-green-50 text-green-700 border-green-200' :
                                        message.confidence > 0.6 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-red-50 text-red-700 border-red-200'
                                      }`}>
                                        <Target className="h-3 w-3 mr-1" />
                                        {Math.round(message.confidence * 100)}% confident
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                
                                {/* Thinking Steps (Collapsible) */}
                                {message.agentThoughts && message.agentThoughts.length > 0 && (
                                  <Collapsible>
                                    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                      <Zap className="h-3 w-3" />
                                      View reasoning ({message.agentThoughts.length} steps)
                                      <ChevronDown className="h-3 w-3" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2">
                                      <div className="bg-slate-50 rounded-md p-2 text-xs space-y-1 border">
                                        {message.agentThoughts.map((thought, idx) => (
                                          <div key={idx} className="flex items-start gap-2">
                                            <span className="text-muted-foreground font-mono">{thought.step}.</span>
                                            <div>
                                              <span className="text-slate-700">{thought.thought}</span>
                                              {thought.observation && (
                                                <span className="text-green-600 ml-1">→ {thought.observation}</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                                
                                {/* Data Sources (Collapsible) */}
                                {message.dataSources && message.dataSources.length > 0 && (
                                  <Collapsible>
                                    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                      <Database className="h-3 w-3" />
                                      Data sources ({message.dataSources.length})
                                      <ChevronDown className="h-3 w-3" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2">
                                      <div className="bg-slate-50 rounded-md p-2 text-xs space-y-1 border">
                                        {message.dataSources.map((source, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                              {source.type}
                                            </Badge>
                                            <span className="text-slate-600">{source.name}</span>
                                            {source.confidence && (
                                              <span className="text-green-600">({Math.round(source.confidence * 100)}%)</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}

                                {/* Recommendations Preview */}
                                {message.recommendations && message.recommendations.length > 0 && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
                                    <div className="flex items-center gap-1 text-xs text-amber-800 font-medium mb-1">
                                      <Lightbulb className="h-3 w-3" />
                                      {message.recommendations.length} Recommendation{message.recommendations.length > 1 ? 's' : ''}
                                    </div>
                                    {message.recommendations.slice(0, 2).map((rec, idx) => (
                                      <div key={idx} className="text-xs text-amber-700">
                                        • {rec.title}
                                      </div>
                                    ))}
                                    {message.recommendations.length > 2 && (
                                      <div className="text-xs text-amber-600 mt-1">
                                        +{message.recommendations.length - 2} more...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {message.actionable && message.recommendation && (
                              <Button
                                size="sm"
                                className="mt-3 w-full"
                                onClick={() => handleCreateTask(message.recommendation || "", message.planId)}
                              >
                                <Plus className="h-3 w-3 mr-2" />
                                Create Task from Recommendation
                              </Button>
                            )}
                            {message.suggestions && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs opacity-70">Suggested follow-ups:</p>
                                <div className="flex flex-wrap gap-2">
                                  {message.suggestions.map((suggestion, index) => (
                                    <Button
                                      key={index}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6 bg-transparent"
                                      onClick={() => handleSendMessage(suggestion)}
                                    >
                                      {suggestion}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {message.type === "user" && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex gap-3 justify-start">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Brain className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              <div>
                                <span className="text-sm font-medium">AI CFO Agents Working...</span>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Classifying intent → Gathering data → Analyzing → Synthesizing
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="border-t p-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask me anything about your finances..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(inputValue)
                          }
                        }}
                        className="flex-1"
                        disabled={isTyping}
                      />
                      <Button onClick={() => handleSendMessage(inputValue)} disabled={!inputValue.trim() || isTyping}>
                        {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Common financial analysis tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start h-auto p-3 bg-transparent"
                      onClick={() => handleQuickAction(action)}
                      disabled={isTyping}
                    >
                      <action.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  ))}
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
                  <CardTitle className="flex items-center gap-2">
                    AI-Generated Tasks
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md">
                        <p className="font-semibold mb-2">What are AI-Generated Tasks?</p>
                        <p className="text-sm mb-2">When AI CFO provides actionable recommendations (like "Reduce burn rate by 10%"), they automatically become tasks here.</p>
                        <p className="text-sm mb-2"><strong>Why use this?</strong> Track and manage your financial action items in one place. Mark tasks as complete as you implement them.</p>
                        <p className="text-sm"><strong>Tip:</strong> Ask specific questions like "Create a plan to extend runway" to get actionable tasks.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
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
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start chatting with AI CFO to get strategic recommendations. Tasks are created from actionable AI recommendations, not from general questions.
                  </p>
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-muted-foreground">💡 <strong>Tip:</strong> Ask questions like:</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                      <li>"What's my current cash runway?"</li>
                      <li>"How can I reduce my burn rate?"</li>
                      <li>"Create a plan to extend runway by 6 months"</li>
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => document.querySelector<HTMLElement>('[value="chat"]')?.click()}
                  >
                    Go to Chat
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {tasks.length} total task{tasks.length !== 1 ? "s" : ""} • {" "}
                        {tasks.filter((t) => t.status === "pending").length} pending • {" "}
                        {tasks.filter((t) => t.status === "in-progress").length} in progress • {" "}
                        {tasks.filter((t) => t.status === "completed").length} completed
                      </p>
                    </div>
                  </div>
                  {tasks.map((task) => (
                    <Card key={task.id} className={`border-l-4 ${
                      task.status === "completed" ? "border-l-green-500 bg-green-50/30" :
                      task.status === "in-progress" ? "border-l-blue-500 bg-blue-50/30" :
                      task.status === "cancelled" ? "border-l-red-500 bg-red-50/30" :
                      "border-l-yellow-500"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <h4 className="font-medium">{task.title}</h4>
                              {task.planId && (
                                <Badge variant="outline" className="text-xs">
                                  From AI Plan
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground whitespace-pre-line">{task.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                {task.priority} priority
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {task.integration}
                              </Badge>
                              {task.scenarioLink && (
                                <Button variant="ghost" size="sm" className="h-6 px-2">
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  View Scenario
                                </Button>
                              )}
                            </div>
                            {task.assumptions && task.assumptions.length > 0 && (
                              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                <span className="font-medium">Context:</span> {task.assumptions.join(", ")}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>📅 Created {task.createdAt.toLocaleDateString()}</span>
                              {task.dueDate && <span>⏰ Due {task.dueDate.toLocaleDateString()}</span>}
                              {task.completedAt && <span>✅ Completed {task.completedAt.toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleTaskStatusChange(task.id, value as Task["status"])}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staged-changes" className="space-y-4">
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">What are Staged Changes?</p>
                  <p className="text-muted-foreground">
                    Staged Changes are detailed AI recommendations that you can review before implementing. Each recommendation includes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li><strong>Action:</strong> What to do (e.g., "Reduce burn rate by 10%")</li>
                    <li><strong>Impact:</strong> Expected financial impact (e.g., "+2 months runway")</li>
                    <li><strong>Reasoning:</strong> Why this recommendation matters</li>
                    <li><strong>Data Sources:</strong> What financial data supports this (auditability)</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    <strong>Workflow:</strong> Review → Approve → Tasks are created → Implement → Mark tasks complete
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <StagedChangesPanel />
        </TabsContent>

      </Tabs>

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create Task from AI Recommendation</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Convert this AI CFO insight into an actionable task and optionally export to your tools
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">Task Title</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Enter task title"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Add task details and context"
                rows={3}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value as Task["priority"] })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration">Export To</Label>
              <Select
                value={taskForm.integration}
                onValueChange={(value) => setTaskForm({ ...taskForm, integration: value as Task["integration"] })}
              >
                <SelectTrigger id="integration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Task List Only</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="asana">Asana</SelectItem>
                  <SelectItem value="calendar">Google Calendar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {taskForm.integration === "slack" && "Task will be posted to your chosen Slack channel"}
                {taskForm.integration === "asana" && "Task will be created in your Asana project"}
                {taskForm.integration === "calendar" && "Event will be created in Google Calendar"}
                {taskForm.integration === "internal" && "Task will only appear in FinaPilot"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={!taskForm.title.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}
