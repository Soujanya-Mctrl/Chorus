// ── Incremental Graph Sync ──────────────────────
import { diffGraphs } from '@chorus/graph-utils';
import type { GraphNode, GraphEdge } from '@chorus/shared-types';
import { GraphModel } from '../db/models/Graph.model';

export async function syncGraph(
  repoId: string,
  newNodes: GraphNode[],
  newEdges: GraphEdge[],
  commitSha: string,
): Promise<{ nodesChanged: number; edgesChanged: number }> {
  // Get current graph
  const current = await GraphModel.findOne({ repoId, level: 'file' });

  if (!current) {
    // First graph — save directly
    await GraphModel.create({ repoId, level: 'file', commitSha, nodes: newNodes, edges: newEdges, generatedAt: new Date() });
    return { nodesChanged: newNodes.length, edgesChanged: newEdges.length };
  }

  // Compute diff
  const diff = diffGraphs(
    { nodes: current.nodes as GraphNode[], edges: current.edges as GraphEdge[] },
    { nodes: newNodes, edges: newEdges },
  );

  // Save updated graph
  await GraphModel.create({ repoId, level: 'file', commitSha, nodes: newNodes, edges: newEdges, generatedAt: new Date() });

  return {
    nodesChanged: diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length,
    edgesChanged: diff.addedEdges.length + diff.removedEdges.length + diff.changedEdges.length,
  };
}
