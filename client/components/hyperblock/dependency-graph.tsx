import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Zap, Cpu, Layers } from "lucide-react";

export interface GraphNode {
    id: string;
    name: string;
    type: 'input' | 'formula';
    category?: string;
}

export interface GraphEdge {
    source: string;
    target: string;
}

interface DependencyGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    affectedNodeIds?: string[];
}

export function DependencyGraph({ nodes, edges, affectedNodeIds = [] }: DependencyGraphProps) {
    // Simple layout logic: Rank by depth
    const layout = useMemo(() => {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const graph = new Map<string, string[]>();
        edges.forEach(e => {
            if (!graph.has(e.source)) graph.set(e.source, []);
            graph.get(e.source)!.push(e.target);
        });

        // Calculate depths
        const depths: Record<string, number> = {};
        const calculateDepth = (id: string, visited: Set<string>): number => {
            if (depths[id] !== undefined) return depths[id];
            if (visited.has(id)) return 0; // Cycle safety

            visited.add(id);
            const incoming = edges.filter(e => e.target === id);
            if (incoming.length === 0) {
                depths[id] = 0;
                return 0;
            }

            const maxDepth = Math.max(...incoming.map(e => calculateDepth(e.source, new Set(visited)))) + 1;
            depths[id] = maxDepth;
            return maxDepth;
        };

        nodes.forEach(n => calculateDepth(n.id, new Set()));

        // Group by depth
        const levels: string[][] = [];
        Object.entries(depths).forEach(([id, depth]) => {
            if (!levels[depth]) levels[depth] = [];
            levels[depth].push(id);
        });

        // Position nodes
        const positions: Record<string, { x: number, y: number }> = {};
        const LEVEL_WIDTH = 250;
        const NODE_HEIGHT = 100;

        levels.forEach((levelNodes, depth) => {
            levelNodes.forEach((id, i) => {
                positions[id] = {
                    x: depth * LEVEL_WIDTH + 50,
                    y: i * NODE_HEIGHT + 50
                };
            });
        });

        return { levels, positions };
    }, [nodes, edges]);

    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-200 overflow-hidden shadow-2xl">
            <CardHeader className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
                            <Network className="h-5 w-5 text-indigo-400" />
                            Computational DAG
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Visualizing the dependency graph of your financial model
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700">
                            Nodes: {nodes.length}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700">
                            Edges: {edges.length}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                <div className="overflow-auto max-h-[600px] min-h-[400px] p-10 custom-scrollbar">
                    <svg
                        width={layout.levels.length * 250 + 100}
                        height={Math.max(...layout.levels.map(l => l.length)) * 100 + 100}
                        className="relative z-10"
                    >
                        {/* Draw Edges */}
                        {edges.map((edge, i) => {
                            const start = layout.positions[edge.source];
                            const end = layout.positions[edge.target];
                            if (!start || !end) return null;

                            const isHighlight = affectedNodeIds.includes(edge.target);

                            return (
                                <g key={`edge-${i}`}>
                                    <motion.path
                                        d={`M ${start.x + 180} ${start.y + 35} L ${end.x} ${end.y + 35}`}
                                        stroke={isHighlight ? "#60a5fa" : "#334155"}
                                        strokeWidth={isHighlight ? 2 : 1}
                                        fill="none"
                                        initial={{ pathLength: 0, opacity: 0.2 }}
                                        animate={{ pathLength: 1, opacity: isHighlight ? 1 : 0.4 }}
                                        transition={{ duration: 1.5, repeat: isHighlight ? Infinity : 0 }}
                                    />
                                    {isHighlight && (
                                        <motion.circle
                                            r="3"
                                            fill="#60a5fa"
                                            initial={{ offset: 0 }}
                                            animate={{
                                                cx: [start.x + 180, end.x],
                                                cy: [start.y + 35, end.y + 35]
                                            }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        />
                                    )}
                                </g>
                            );
                        })}

                        {/* Draw Nodes */}
                        {nodes.map((node) => {
                            const pos = layout.positions[node.id];
                            if (!pos) return null;
                            const isAffected = affectedNodeIds.includes(node.id);

                            return (
                                <foreignObject
                                    key={node.id}
                                    x={pos.x}
                                    y={pos.y}
                                    width="180"
                                    height="70"
                                >
                                    <motion.div
                                        className={`p-3 rounded-lg border flex flex-col justify-center transition-all ${isAffected
                                                ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                                : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                                            }`}
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">
                                                {node.type === 'formula' ? 'Calculated' : 'Input'}
                                            </span>
                                            {node.type === 'formula' ? (
                                                <Cpu className={`h-3 w-3 ${isAffected ? 'text-blue-400' : 'text-slate-400'}`} />
                                            ) : (
                                                <Layers className="h-3 w-3 text-slate-400" />
                                            )}
                                        </div>
                                        <div className={`font-bold text-sm truncate ${isAffected ? 'text-white' : 'text-slate-200'}`}>
                                            {node.name}
                                        </div>
                                        {isAffected && (
                                            <motion.div
                                                className="mt-1"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            >
                                                <Badge variant="secondary" className="bg-blue-500 text-white text-[9px] py-0 px-1">
                                                    Recomputing...
                                                </Badge>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </foreignObject>
                            );
                        })}
                    </svg>
                </div>
            </CardContent>
        </Card>
    );
}
