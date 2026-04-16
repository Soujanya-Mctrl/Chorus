export type GraphLevel = 'file' | 'module' | 'service';
export type NodeType = 'file' | 'module' | 'service' | 'external';
export type EdgeType = 'import' | 'export' | 'call' | 'dependency' | 'data-flow';
export interface GraphNode {
    id: string;
    label: string;
    type: NodeType;
    level: GraphLevel;
    filePath?: string;
    language?: string;
    linesOfCode?: number;
    position: {
        x: number;
        y: number;
    };
    metadata: Record<string, unknown>;
}
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: EdgeType;
    weight: number;
    label?: string;
    metadata: Record<string, unknown>;
}
export interface DiagramData {
    repoId: string;
    level: GraphLevel;
    commitSha: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    generatedAt: Date;
}
export interface LayoutOptions {
    direction: 'TB' | 'LR' | 'BT' | 'RL';
    algorithm: 'dagre' | 'elk';
    nodeSpacing: number;
    rankSpacing: number;
}
//# sourceMappingURL=graph.d.ts.map