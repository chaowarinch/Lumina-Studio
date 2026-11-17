/**
 * Undo/Redo stack แบบ snapshot
 * ใช้ `record(before, after)` หลังการแก้ไขเสร็จ: ถ้าไม่มีอะไรเปลี่ยนจะไม่ถูกบันทึก
 */
export class History<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  constructor(
    private readonly limit = 60,
    private readonly equals: (a: T, b: T) => boolean = Object.is,
  ) {}

  record(before: T, after: T): boolean {
    if (this.equals(before, after)) return false;
    this.undoStack.push(before);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    return true;
  }

  undo(current: T): T | null {
    const prev = this.undoStack.pop();
    if (prev === undefined) return null;
    this.redoStack.push(current);
    return prev;
  }

  redo(current: T): T | null {
    const next = this.redoStack.pop();
    if (next === undefined) return null;
    this.undoStack.push(current);
    return next;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
