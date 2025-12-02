"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle,
  Circle,
  Play,
  BookOpen,
  Users,
  Zap,
  Target,
  CreditCard,
  Settings,
  ArrowRight,
  Video,
  FileText,
  MessageSquare,
} from "lucide-react"

const onboardingSteps = [
  {
    id: 1,
    title: "Welcome to FinaPilot",
    description: "Get started with your AI financial copilot",
    completed: true,
    category: "setup",
  },
  {
    id: 2,
    title: "Complete Your Profile",
    description: "Add your personal and company information",
    completed: true,
    category: "setup",
  },
  {
    id: 3,
    title: "Connect Your First Integration",
    description: "Link your accounting software or payment processor",
    completed: false,
    category: "integrations",
  },
  {
    id: 4,
    title: "Set Up Your Financial Model",
    description: "Create your first financial model and projections",
    completed: false,
    category: "modeling",
  },
  {
    id: 5,
    title: "Invite Team Members",
    description: "Add your team and set up permissions",
    completed: false,
    category: "team",
  },
  {
    id: 6,
    title: "Configure Notifications",
    description: "Set up alerts for key financial metrics",
    completed: false,
    category: "settings",
  },
  {
    id: 7,
    title: "Generate Your First Report",
    description: "Create a board report or investor update",
    completed: false,
    category: "reporting",
  },
]

const quickActions = [
  {
    title: "Connect Stripe",
    description: "Import your revenue data automatically",
    icon: CreditCard,
    action: "Connect",
    category: "integrations",
  },
  {
    title: "Build Financial Model",
    description: "Create projections for the next 12 months",
    icon: Target,
    action: "Start",
    category: "modeling",
  },
  {
    title: "Invite Your CFO",
    description: "Give your finance team access",
    icon: Users,
    action: "Invite",
    category: "team",
  },
  {
    title: "Set Up Alerts",
    description: "Get notified of important changes",
    icon: Zap,
    action: "Configure",
    category: "settings",
  },
]

const resources = [
  {
    title: "Getting Started Guide",
    description: "Complete walkthrough of FinaPilot features",
    type: "guide",
    duration: "10 min read",
    icon: BookOpen,
  },
  {
    title: "Financial Modeling 101",
    description: "Learn the basics of startup financial modeling",
    type: "video",
    duration: "15 min watch",
    icon: Video,
  },
  {
    title: "Integration Setup",
    description: "Step-by-step integration tutorials",
    type: "tutorial",
    duration: "5 min read",
    icon: Settings,
  },
  {
    title: "Best Practices",
    description: "Tips from successful founders and CFOs",
    type: "article",
    duration: "8 min read",
    icon: FileText,
  },
]

export function OnboardingPage() {
  const [completedSteps, setCompletedSteps] = useState(2)
  const totalSteps = onboardingSteps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  const handleStepComplete = (stepId: number) => {
    setCompletedSteps((prev) => Math.max(prev, stepId))
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome to FinaPilot! 🚀</h1>
          <p className="text-muted-foreground">Let's get you set up with your AI financial copilot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-transparent">
            <MessageSquare className="mr-2 h-4 w-4" />
            Get Help
          </Button>
          <Button size="sm">
            <Play className="mr-2 h-4 w-4" />
            Watch Demo
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Your Progress
          </CardTitle>
          <CardDescription>Complete these steps to get the most out of FinaPilot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedSteps}/{totalSteps} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{completedSteps}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalSteps - completedSteps}</div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">5 min</div>
                <div className="text-sm text-muted-foreground">Est. Time Left</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{Math.round(progressPercentage)}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Onboarding Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setup Checklist</CardTitle>
              <CardDescription>Follow these steps to complete your setup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                      step.completed ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${step.completed ? "text-green-800" : ""}`}>{step.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {step.category}
                        </Badge>
                      </div>
                      <p className={`text-sm ${step.completed ? "text-green-700" : "text-muted-foreground"}`}>
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {!step.completed && (
                        <Button
                          size="sm"
                          onClick={() => handleStepComplete(step.id)}
                          className="bg-transparent"
                          variant="outline"
                        >
                          Start
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump straight into the most important tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <action.icon className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{action.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                        <Button size="sm" variant="outline" className="bg-transparent">
                          {action.action}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resources & Help */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Resources</CardTitle>
              <CardDescription>Get up to speed quickly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resources.map((resource, index) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <resource.icon className="h-4 w-4 text-primary mt-1" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{resource.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{resource.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>We're here to support you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat with Support
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <BookOpen className="mr-2 h-4 w-4" />
                View Documentation
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Video className="mr-2 h-4 w-4" />
                Schedule Demo Call
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>Essential information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-stage">Company Stage</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-seed">Pre-seed</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series-a">Series A</SelectItem>
                    <SelectItem value="series-b">Series B+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-revenue">Monthly Revenue</Label>
                <Input id="monthly-revenue" placeholder="e.g., $50,000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-size">Team Size</Label>
                <Input id="team-size" placeholder="e.g., 15" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="newsletter" />
                <Label htmlFor="newsletter" className="text-sm">
                  Subscribe to financial tips newsletter
                </Label>
              </div>
              <Button className="w-full">Save & Continue</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
