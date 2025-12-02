"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  MessageSquare,
  Share,
  Eye,
  Edit,
  Plus,
  Send,
  FileText,
  Video,
  Calendar,
  CheckCircle,
} from "lucide-react"

const teamMembers = [
  {
    id: 1,
    name: "John Doe",
    role: "Founder & CEO",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "online",
    lastActive: "now",
  },
  {
    id: 2,
    name: "Sarah Wilson",
    role: "CFO",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "online",
    lastActive: "2 min ago",
  },
  {
    id: 3,
    name: "Mike Chen",
    role: "Finance Manager",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "away",
    lastActive: "1 hour ago",
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    role: "Analyst",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "offline",
    lastActive: "yesterday",
  },
]

const recentActivity = [
  {
    id: 1,
    user: "Sarah Wilson",
    action: "updated the Q2 financial model",
    timestamp: "2 minutes ago",
    type: "edit",
  },
  {
    id: 2,
    user: "Mike Chen",
    action: "commented on the board report",
    timestamp: "15 minutes ago",
    type: "comment",
  },
  {
    id: 3,
    user: "John Doe",
    action: "shared the investor dashboard",
    timestamp: "1 hour ago",
    type: "share",
  },
  {
    id: 4,
    user: "Emily Rodriguez",
    action: "created a new scenario analysis",
    timestamp: "2 hours ago",
    type: "create",
  },
]

const sharedDocuments = [
  {
    id: 1,
    title: "Q2 2024 Board Deck",
    type: "presentation",
    sharedBy: "John Doe",
    sharedWith: ["Sarah Wilson", "Mike Chen"],
    lastModified: "2 hours ago",
    comments: 3,
  },
  {
    id: 2,
    title: "Financial Model v2.1",
    type: "model",
    sharedBy: "Sarah Wilson",
    sharedWith: ["John Doe", "Mike Chen", "Emily Rodriguez"],
    lastModified: "1 day ago",
    comments: 7,
  },
  {
    id: 3,
    title: "Investor Update - June",
    type: "report",
    sharedBy: "Mike Chen",
    sharedWith: ["John Doe", "Sarah Wilson"],
    lastModified: "3 days ago",
    comments: 2,
  },
]

const comments = [
  {
    id: 1,
    user: "Sarah Wilson",
    avatar: "/placeholder.svg?height=32&width=32",
    content: "The revenue projections look conservative. Should we adjust the growth rate based on recent performance?",
    timestamp: "15 minutes ago",
    replies: 2,
  },
  {
    id: 2,
    user: "Mike Chen",
    avatar: "/placeholder.svg?height=32&width=32",
    content: "Great work on the cash flow analysis. The runway calculation is very helpful for the board meeting.",
    timestamp: "1 hour ago",
    replies: 0,
  },
  {
    id: 3,
    user: "John Doe",
    avatar: "/placeholder.svg?height=32&width=32",
    content: "Can we add a sensitivity analysis for the customer acquisition cost? Investors always ask about this.",
    timestamp: "2 hours ago",
    replies: 1,
  },
]

export function CollaborationPage() {
  const [newComment, setNewComment] = useState("")

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Team Collaboration</h1>
          <p className="text-muted-foreground">Work together on financial models and reports in real-time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-transparent">
            <Video className="mr-2 h-4 w-4" />
            Start Meeting
          </Button>
          <Button size="sm">
            <Share className="mr-2 h-4 w-4" />
            Share Workspace
          </Button>
        </div>
      </div>

      {/* Team Status */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Team Status
          </CardTitle>
          <CardDescription>See who's online and actively collaborating</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                      member.status === "online"
                        ? "bg-green-500"
                        : member.status === "away"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{member.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                  <div className="text-xs text-muted-foreground">{member.lastActive}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="documents">Shared Documents</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>See what your team has been working on</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === "edit" && <Edit className="h-4 w-4 text-blue-500" />}
                      {activity.type === "comment" && <MessageSquare className="h-4 w-4 text-green-500" />}
                      {activity.type === "share" && <Share className="h-4 w-4 text-purple-500" />}
                      {activity.type === "create" && <Plus className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shared Documents</CardTitle>
              <CardDescription>Documents and models shared with your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sharedDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{doc.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Shared by {doc.sharedBy} • {doc.lastModified}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{doc.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Shared with:</span>
                        <div className="flex -space-x-2">
                          {doc.sharedWith.slice(0, 3).map((person, index) => (
                            <Avatar key={index} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {person
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {doc.sharedWith.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs">+{doc.sharedWith.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {doc.comments}
                        </span>
                        <Button variant="outline" size="sm" className="bg-transparent">
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Comments</CardTitle>
              <CardDescription>Team discussions and feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {comment.user
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.user}</span>
                        <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm mb-2">{comment.content}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          Reply
                        </Button>
                        {comment.replies > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {comment.replies} {comment.replies === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" disabled={!newComment.trim()}>
                        <Send className="mr-1 h-3 w-3" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Board Meeting</h3>
                    <Badge variant="secondary">Tomorrow</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Monthly board meeting to review Q2 performance</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">10:00 AM - 11:30 AM</span>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Video className="mr-1 h-3 w-3" />
                      Join
                    </Button>
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Finance Team Sync</h3>
                    <Badge variant="outline">Friday</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Weekly sync to review financial models and forecasts
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">2:00 PM - 3:00 PM</span>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Calendar className="mr-1 h-3 w-3" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Meeting Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Q2 Review Meeting</h3>
                    <span className="text-xs text-muted-foreground">June 15</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Key decisions and action items from quarterly review
                  </p>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <FileText className="mr-1 h-3 w-3" />
                    View Notes
                  </Button>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Investor Check-in</h3>
                    <span className="text-xs text-muted-foreground">June 10</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Monthly investor update and Q&A session</p>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <FileText className="mr-1 h-3 w-3" />
                    View Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Start collaborating with your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent">
                  <Video className="h-6 w-6" />
                  <span>Start Video Call</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent">
                  <Share className="h-6 w-6" />
                  <span>Share Screen</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent">
                  <MessageSquare className="h-6 w-6" />
                  <span>Team Chat</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
