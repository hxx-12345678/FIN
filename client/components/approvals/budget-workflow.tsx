"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    User,
    MessageSquare,
    ShieldCheck,
    Send,
    Lock,
    Unlock,
    FileText,
    History
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface ApprovalRequest {
    id: string
    title: string
    requesterName: string
    status: 'pending' | 'approved' | 'rejected'
    requestedAt: string
    amount?: number
    type: 'budget_increase' | 'scenario_lock' | 'hiring_plan' | 'model_baseline'
    priority: 'low' | 'medium' | 'high'
    description?: string
    versionId?: string
}

export function BudgetWorkflow({ orgId, modelId }: { orgId: string | null, modelId: string | null }) {
    const [requests, setRequests] = useState<ApprovalRequest[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (orgId) {
            fetchRequests()
        }
    }, [orgId])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/approvals`, {
                headers: getAuthHeaders(),
                credentials: "include"
            })

            if (res.status === 401) {
                handleUnauthorized()
                return
            }

            if (res.ok) {
                const data = await res.json()
                if (data.ok && data.data && data.data.length > 0) {
                    setRequests(data.data)
                } else {
                    setRequests([])
                }
            }
        } catch (error) {
            console.error("Error fetching approvals:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const promise = fetch(`${API_BASE_URL}/approvals/${id}/${action}`, {
                method: "POST",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ comment: `Institutional ${action}` })
            })

            toast.promise(
                promise,
                {
                    loading: `${action === 'approve' ? 'Approving' : 'Rejecting'} request...`,
                    success: `Request ${action === 'approve' ? 'approved' : 'rejected'} and locked.`,
                    error: 'Action failed'
                }
            )

            const res = await promise
            if (res.ok) {
                fetchRequests()
            }
        } catch (error) {
            console.error("Error handling approval:", error)
        }
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="xl:col-span-3 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            Governance Workflow
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Institutional Approval Queue & Audit Trail</p>
                    </div>
                    <Button variant="outline" size="sm" className="font-bold border-2 text-[10px] h-8 bg-slate-50">
                        <History className="h-3.5 w-3.5 mr-2" /> FULL AUDIT LOG
                    </Button>
                </div>

                <div className="space-y-4">
                    {requests.map((req) => (
                        <Card key={req.id} className={`overflow-hidden border-2 transition-all hover:shadow-md ${req.status === 'pending' ? 'border-amber-100' : 'border-slate-100 opacity-80'}`}>
                            <div className={`h-1.5 w-full ${req.status === 'approved' ? 'bg-emerald-500' :
                                req.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-400'
                                }`} />
                            <CardContent className="p-0">
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className={`text-[9px] uppercase font-black tracking-tighter ${req.priority === 'high' ? 'text-rose-500 border-rose-200 bg-rose-50' : 'text-slate-500'
                                                }`}>
                                                {req.priority} PRIORITY
                                            </Badge>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.type.replace('_', ' ')}</span>
                                        </div>
                                        <h4 className="font-black text-lg text-slate-800 tracking-tight">{req.title}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{req.description}</p>

                                        <div className="flex items-center gap-6 pt-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="h-3 w-3 text-slate-600" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-600">{req.requesterName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="text-[11px] font-bold">{new Date(req.requestedAt).toLocaleDateString()}</span>
                                            </div>
                                            {req.versionId && (
                                                <div className="flex items-center gap-2 text-indigo-500 font-black">
                                                    <Lock className="h-3.5 w-3.5" />
                                                    <span className="text-[11px] uppercase tracking-tighter">Model {req.versionId}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col gap-2 min-w-[140px]">
                                        {req.status === 'pending' ? (
                                            <>
                                                <Button
                                                    onClick={() => handleAction(req.id, 'approve')}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-9 font-black text-xs shadow-lg shadow-emerald-600/20"
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-2" /> APPROVE
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => handleAction(req.id, 'reject')}
                                                    className="w-full h-9 font-black text-xs bg-slate-100 border-2"
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" /> REJECT
                                                </Button>
                                            </>
                                        ) : (
                                            <div className={`w-full py-2 rounded-lg text-center font-black text-[10px] uppercase border-2 flex items-center justify-center gap-2 ${req.status === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                                                }`}>
                                                {req.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                                {req.status}
                                            </div>
                                        )}
                                        <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold text-slate-400 gap-1 hover:text-slate-900">
                                            <MessageSquare className="h-3.5 w-3.5" /> VIEW COMMENTS (3)
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {requests.length === 0 && (
                        <div className="p-20 text-center border-2 border-dashed rounded-3xl bg-slate-50/50">
                            <Clock className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <h4 className="font-bold text-slate-400">Governance Queue Empty</h4>
                            <p className="text-xs text-slate-400 mt-1">No pending approval requests for this organization.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50" />
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-indigo-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <Lock className="h-3 w-3" />
                            Version Maturity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-6">
                        <div>
                            <div className="flex justify-between text-[11px] font-bold mb-2">
                                <span className="text-slate-400 uppercase">Current Stability</span>
                                <span className="text-emerald-400">STABLE</span>
                            </div>
                            <Progress value={88} className="h-2 bg-slate-800" indicatorClassName="bg-emerald-500" />
                        </div>

                        <div className="space-y-3 pb-2 pt-4">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                                <span>Immutable Snapshotting</span>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                                <span>Event-Sourced Recalc</span>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 opacity-50">
                                <span>Idempotent Calculation</span>
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                        </div>

                        <Separator className="bg-slate-800" />

                        <div className="pt-2">
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                                "Models are strictly versioned. Every change creates a new state hash, ensuring 100% auditability for regulatory compliance."
                            </p>
                        </div>

                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-black text-[10px] tracking-widest uppercase shadow-lg shadow-indigo-600/30">
                            <Send className="h-4 w-4 mr-2" /> REQUEST NEW POLICY
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-white border-2 border-slate-100 shadow-xl p-1">
                    <div className="p-4 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            Compliance Alerts
                        </h4>
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                            <div className="flex items-center gap-2">
                                <Flame className="h-3.5 w-3.5 text-amber-600 font-bold" />
                                <span className="text-[11px] font-black text-amber-900">BURNRATE THRESHOLD</span>
                            </div>
                            <p className="text-[10px] text-amber-800 leading-tight">Q3 forecast exceeds variance budget by 12.5%. Board review recommended.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

function Flame({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
}
