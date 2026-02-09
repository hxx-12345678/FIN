import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Clock, User, Zap, ChevronRight, Info } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

export interface TraceEntry {
    id: string;
    triggerNodeId: string;
    triggerUserId?: string;
    affectedNodes: string[];
    durationMs: number;
    createdAt: string;
}

interface TraceViewerProps {
    traces: TraceEntry[];
    isLoading?: boolean;
}

export function TraceViewer({ traces, isLoading }: TraceViewerProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Computation Trace</CardTitle>
                    <CardDescription>Real-time recalculation logs</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse bg-slate-800/50 rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-200 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
                            <Activity className="h-5 w-5 text-blue-400" />
                            Explainability Trace
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Tracking real-time dependency recomputations
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        Real-time Active
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                    {traces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                            <Info className="h-12 w-12 text-slate-600 mb-4" />
                            <p className="text-slate-400 font-medium">No recomputations tracked yet.</p>
                            <p className="text-slate-500 text-sm mt-1">Changes to drivers will appear here in real-time.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {traces.map((trace) => (
                                <div key={trace.id} className="p-6 hover:bg-slate-800/30 transition-colors group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                                <Zap className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white flex items-center gap-2">
                                                    {trace.triggerNodeId}
                                                    <span className="text-slate-500 font-normal">changed</span>
                                                </h4>
                                                <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {trace.triggerUserId ? 'User' : 'System API'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDistanceToNow(new Date(trace.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Latency</p>
                                                <p className="font-mono text-sm text-green-400 font-medium">{trace.durationMs}ms</p>
                                            </div>
                                            <div className="h-8 w-px bg-slate-800" />
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Impact</p>
                                                <p className="font-bold text-blue-400">{trace.affectedNodes.length} nodes</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Computation Path</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
                                                {trace.triggerNodeId}
                                            </Badge>
                                            <ChevronRight className="h-3 w-3 text-slate-600" />
                                            {trace.affectedNodes.slice(0, 5).map((node, i) => (
                                                <React.Fragment key={node}>
                                                    <Badge variant="outline" className="border-blue-500/20 bg-blue-500/5 text-blue-300">
                                                        {node}
                                                    </Badge>
                                                    {i < Math.min(trace.affectedNodes.length, 5) - 1 && (
                                                        <ChevronRight className="h-3 w-3 text-slate-600" />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                            {trace.affectedNodes.length > 5 && (
                                                <span className="text-xs text-slate-500 ml-1">
                                                    + {trace.affectedNodes.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
