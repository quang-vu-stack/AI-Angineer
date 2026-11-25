import type { IMemorySystem, MemoryRecord } from './interfaces';
export class AgentMemory implements IMemorySystem {
  private records: MemoryRecord[] = [];
  private sequence = 0;
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
    this.records = [];
    this.sequence = 0;
    for (const {id: _id, ...record} of records) this.addMemory(record);
  }
}
