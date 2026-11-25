import { ledgerEntrySchema } from '../types/companySchema';
import type { LedgerEntry } from '../types/company';

export interface FinanceSummary {
  capitalVnd: number;
  revenueVnd: number;
  expensesVnd: number;
  operatingProfitVnd: number;
  balanceVnd: number;
}

export function summarizeLedger(entries: readonly LedgerEntry[]): FinanceSummary {
  let capitalVnd = 0;
  let revenueVnd = 0;
  let expensesVnd = 0;
  let balanceVnd = 0;
  for (const entry of entries) {
    switch (entry.kind) {
      case 'capital': capitalVnd += entry.amountVnd; break;
      case 'revenue': revenueVnd += entry.amountVnd; break;
      case 'expense': expensesVnd += entry.amountVnd; break;
    }
    balanceVnd += entry.kind === 'expense' ? -entry.amountVnd : entry.amountVnd;
    if (balanceVnd < 0) throw new Error('Insufficient funds');
    if (![capitalVnd, revenueVnd, expensesVnd, balanceVnd].every(Number.isSafeInteger)) {
      throw new Error('Ledger exceeds safe integer precision');
    }
  }
  return { capitalVnd, revenueVnd, expensesVnd, operatingProfitVnd: revenueVnd - expensesVnd, balanceVnd };
}

export class CompanyLedger {
  constructor(
    private readonly entries: LedgerEntry[],
    private readonly requireProject: (id: string) => void,
  ) {}

  record(input: LedgerEntry): LedgerEntry {
    const entry = ledgerEntrySchema.parse(input);
    if (this.entries.some(({ id }) => id === entry.id)) throw new Error(`Duplicate entry: ${entry.id}`);
    if (entry.projectId !== null) this.requireProject(entry.projectId);
    summarizeLedger([...this.entries, entry]);
    this.entries.push(entry);
    return { ...entry };
  }

  summary(): FinanceSummary {
    return summarizeLedger(this.entries);
  }
}
