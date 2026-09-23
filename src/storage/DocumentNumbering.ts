import { getObservability } from '../observability/Observability';

const COUNTER_PREFIX = 'ci:counter:';
const LOCK_PREFIX = 'ci:document-numbering:';

export interface LockManagerLike {
  request<T>(
    name: string,
    options: { mode: 'exclusive' },
    callback: (lock: Lock | null) => Promise<T> | T,
  ): Promise<T>;
}

export class DocumentNumbering {
  public peek(year: number): number {
    const value = Number(
      localStorage.getItem(`${COUNTER_PREFIX}${year}`) ?? '0',
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  public async next(year: number): Promise<number> {
    const lockManager = this.getLockManager();

    if (!lockManager) {
      getObservability().log(
        'warn',
        'Numeração executada sem Web Locks; concorrência entre abas não pode ser garantida.',
        {
          operation: 'issue-number',
          component: 'DocumentNumbering',
          year,
        },
      );
      return this.increment(year);
    }

    return lockManager.request(
      `${LOCK_PREFIX}${year}`,
      { mode: 'exclusive' },
      () => this.increment(year),
    );
  }

  private increment(year: number): number {
    const nextValue = this.peek(year) + 1;
    localStorage.setItem(`${COUNTER_PREFIX}${year}`, String(nextValue));
    return nextValue;
  }

  private getLockManager(): LockManagerLike | undefined {
    if (typeof navigator === 'undefined') return undefined;

    return (navigator as Navigator & { locks?: LockManagerLike }).locks;
  }
}
