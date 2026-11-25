import type { IMemorySystem, MemoryRecord } from './interfaces';
export class AgentMemory implements IMemorySystem {
  private records: MemoryRecord[] = [];
  private sequence = 0n;
  addMemory(input: Omit<MemoryRecord, 'id'>): MemoryRecord {
    const record = {...input, importance: Math.max(1, Math.min(10, input.importance)), id: 'mem-' + (++this.sequence)};
    this.records.push(structuredClone(record));
    const own = this.records.filter(r => r.agentId === input.agentId);
    if (own.length > 100) this.records = this.records.filter(r => r.id !== own[0].id);
    return structuredClone(record);
  }
  getRecentMemories(agentId: string, limit = 10): MemoryRecord[] {
    return structuredClone(this.records.filter(r => r.agentId === agentId).reverse().slice(0, Math.max(0, limit)));
  }
  clearAgentMemories(agentId: string): void { this.records = this.records.filter(r => r.agentId !== agentId); }
  exportAll(): MemoryRecord[] { return structuredClone(this.records); }
  importAll(records: MemoryRecord[]): void {
    const counts = new Map<string, number>();
    const ids = new Set<string>();
    const retained: MemoryRecord[] = [];
    let highest = 0n;
    for (let index = records.length - 1; index >= 0; index--) {
      const record = records[index];
      const sequence = /^mem-(\d+)$/.exec(record.id);
      if (sequence) {
        const value = BigInt(sequence[1]);
        if (value > highest) highest = value;
      }
      const count = counts.get(record.agentId) ?? 0;
      if (count >= 100 || ids.has(record.id)) continue;
      retained.push(structuredClone(record));
      counts.set(record.agentId, count + 1);
      ids.add(record.id);
    }
    this.records = retained.reverse();
    this.sequence = highest;
  }
}
