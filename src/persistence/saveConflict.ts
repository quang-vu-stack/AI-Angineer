export class SaveConflictError extends Error {
  constructor(slotId: string) {
    super(`Save revision conflict for slot ${slotId}. Reload the saved game before trying again.`);
    this.name = 'SaveConflictError';
  }
}
