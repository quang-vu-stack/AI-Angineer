export interface DailyActivity {
  day: number;
  workingMinutes: number;
  productivityMinutes: number;
  tasksCompleted: number;
  meetingsCompleted: number;
  conversationsCompleted: number;
}

const empty = (day: number): DailyActivity => ({
  day, workingMinutes: 0, productivityMinutes: 0,
  tasksCompleted: 0, meetingsCompleted: 0, conversationsCompleted: 0,
});

export type ProductivityReport = Omit<DailyActivity, 'day' | 'productivityMinutes'> & {
  fromDay: number;
  toDay: number;
  averageProductivity: number;
};

export class ProductivityLog {
  readonly #days: Map<number, DailyActivity>;

  constructor(days: DailyActivity[] = []) {
    this.#days = new Map(days.map((day) => [day.day, { ...day }]));
  }

  recordWork(from: number, duration: number, productivity: number): void {
    const end = from + duration;
    while (from < end) {
      const day = Math.floor(from / 1440) + 1;
      const next = Math.min(end, day * 1440);
      const elapsed = next - from;
      const entry = this.entry(day);
      entry.workingMinutes += elapsed;
      entry.productivityMinutes += elapsed * productivity;
      from = next;
    }
  }

  count(day: number, event: 'tasksCompleted' | 'meetingsCompleted' | 'conversationsCompleted'): void {
    this.entry(day)[event]++;
  }

  daily(day: number): ProductivityReport { return this.report(day, day); }

  weekly(week: number): ProductivityReport {
    this.validatePeriod(week);
    return this.report((week - 1) * 7 + 1, week * 7);
  }

  snapshot(): DailyActivity[] {
    return [...this.#days.values()].sort((a, b) => a.day - b.day).map((day) => ({ ...day }));
  }

  private validatePeriod(value: number): void {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid simulation report period');
  }

  private entry(day: number): DailyActivity {
    const entry = this.#days.get(day) ?? empty(day);
    this.#days.set(day, entry);
    return entry;
  }

  private report(fromDay: number, toDay: number): ProductivityReport {
    this.validatePeriod(fromDay);
    this.validatePeriod(toDay);
    const totals = empty(fromDay);
    for (const day of this.#days.values()) {
      if (day.day < fromDay || day.day > toDay) continue;
      totals.workingMinutes += day.workingMinutes;
      totals.productivityMinutes += day.productivityMinutes;
      totals.tasksCompleted += day.tasksCompleted;
      totals.meetingsCompleted += day.meetingsCompleted;
      totals.conversationsCompleted += day.conversationsCompleted;
    }
    const { day: _, productivityMinutes, ...counts } = totals;
    return {
      ...counts, fromDay, toDay,
      averageProductivity: counts.workingMinutes ? Math.round(productivityMinutes / counts.workingMinutes) : 0,
    };
  }
}
