import { Injectable } from '@nestjs/common';
import { NetworkNode } from '../interfaces/network-node.interface';
import { ConnectivityResult, TourismGraphMatrix } from '../interfaces/tourism-graph.interface';

@Injectable()
export class GraphValidationService {
  validateConnectivity(graph: TourismGraphMatrix, nodes: NetworkNode[]): ConnectivityResult {
    // ============= DFS Connectivity Validation =============
    // Iterative DFS uses an Array as a Stack and a Set for visited nodes.
    const stack: string[] = [];
    const visitedNodes = new Set<string>();
    const nodeIds = nodes.map((node) => node.id);

    if (nodes.length > 0) {
      stack.push(nodes[0].id);
    }

    while (stack.length > 0) {
      const currentNodeId = stack.pop();

      if (!currentNodeId || visitedNodes.has(currentNodeId)) {
        continue;
      }

      visitedNodes.add(currentNodeId);
      const currentIndex = nodeIds.indexOf(currentNodeId);

      if (currentIndex === -1) {
        continue;
      }

      // --------------------- Matrix Row Scan ------------------
      // With an adjacency matrix, DFS scans a row to find outgoing edges, so traversal is O(V^2).
      for (let targetIndex = 0; targetIndex < graph[currentIndex].length; targetIndex += 1) {
        const edge = graph[currentIndex][targetIndex];
        const targetNodeId = nodes[targetIndex].id;

        if (edge && !visitedNodes.has(targetNodeId)) {
          stack.push(targetNodeId);
        }
      }
    }

    const unreachableNodes = nodes.filter((node) => !visitedNodes.has(node.id)).map((node) => node.id);

    return {
      connected: unreachableNodes.length === 0,
      totalNodes: nodes.length,
      reachableNodes: visitedNodes.size,
      unreachableNodes,
    };
  }
}
