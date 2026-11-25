import type { IRelationshipSystem, RelationshipEdge } from './interfaces';
export class AgentRelationships implements IRelationshipSystem {
  private edges = new Map<string, RelationshipEdge>();
  private key(a: string, b: string): string { return JSON.stringify([a,b]); }
  getRelationship(a: string, b: string): RelationshipEdge {
    return {...(this.edges.get(this.key(a,b)) ?? {fromAgentId:a,toAgentId:b,affinity:0,trust:50,lastInteractionDay:0})};
  }
  recordInteraction(a: string, b: string, delta: number, day: number): void {
    if (a === b || !Number.isFinite(delta)) return;
    for (const [from,to] of [[a,b],[b,a]]) {
      const edge = this.getRelationship(from,to);
      edge.affinity = Math.max(-100, Math.min(100, edge.affinity + delta));
      edge.trust = Math.max(0, Math.min(100, edge.trust + delta / 2));
      edge.lastInteractionDay = day;
      this.edges.set(this.key(from,to), edge);
    }
  }
  exportAll(): RelationshipEdge[] {
    return [...this.edges.values()].map((edge) => ({ ...edge }));
  }

  importAll(records: RelationshipEdge[]): void {
    this.edges = new Map(records.map((edge) => [
      this.key(edge.fromAgentId, edge.toAgentId), { ...edge },
    ]));
  }

  getTopCollaborators(id: string, limit = 5): RelationshipEdge[] {
    return [...this.edges.values()].filter(e => e.fromAgentId === id).sort((a,b) => b.affinity+b.trust-a.affinity-a.trust).slice(0,Math.max(0,limit)).map(e=>({...e}));
  }
}
