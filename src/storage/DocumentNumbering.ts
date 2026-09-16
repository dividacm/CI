const COUNTER_PREFIX = 'ci:counter:';

export class DocumentNumbering {
  public peek(year: number): number {
    const value = Number(
      localStorage.getItem(`${COUNTER_PREFIX}${year}`) ?? '0',
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  public next(year: number): number {
    const nextValue = this.peek(year) + 1;
    localStorage.setItem(`${COUNTER_PREFIX}${year}`, String(nextValue));
    return nextValue;
  }
}
