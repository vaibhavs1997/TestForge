// CronExpression - Utility for validating cron expressions and computing next run times
// Supports standard 5-field cron expressions (minute hour day-of-month month day-of-week)

export interface CronFields {
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
}

export class CronExpression {
  private readonly fields: CronFields;

  constructor(expression: string) {
    this.fields = CronExpression.parse(expression);
  }

  static validate(expression: string): boolean {
    try {
      CronExpression.parse(expression);
      return true;
    } catch {
      return false;
    }
  }

  static parse(expression: string): CronFields {
    if (!expression || typeof expression !== 'string') {
      throw new Error('Cron expression is required');
    }

    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression "${expression}". Expected 5 fields (minute hour day-of-month month day-of-week).`);
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const minutes = CronExpression.parseField(minute, 0, 59);
    const hours = CronExpression.parseField(hour, 0, 23);
    const daysOfMonth = CronExpression.parseField(dayOfMonth, 1, 31);
    const months = CronExpression.parseField(month, 1, 12);
    const daysOfWeek = CronExpression.parseField(dayOfWeek, 0, 6);

    return { minutes, hours, daysOfMonth, months, daysOfWeek };
  }

  private static parseField(field: string, min: number, max: number): Set<number> {
    const values = new Set<number>();

    if (field === '*' || field === '?') {
      for (let i = min; i <= max; i++) {
        values.add(i);
      }
      return values;
    }

    const parts = field.split(',');
    for (const part of parts) {
      if (part === '*') {
        for (let i = min; i <= max; i++) {
          values.add(i);
        }
        continue;
      }

      if (part.includes('/')) {
        const [rangePart, stepPart] = part.split('/');
        const step = parseInt(stepPart, 10);
        if (isNaN(step) || step <= 0) {
          throw new Error(`Invalid step in cron field "${field}"`);
        }

        const range = rangePart === '*' ? `${min}-${max}` : rangePart;
        const [rangeMin, rangeMax] = range.includes('-')
          ? range.split('-').map(v => parseInt(v, 10))
          : [parseInt(range, 10), parseInt(range, 10)];

        if (isNaN(rangeMin) || isNaN(rangeMax) || rangeMin < min || rangeMax > max || rangeMin > rangeMax) {
          throw new Error(`Invalid range in cron field "${field}"`);
        }

        for (let i = rangeMin; i <= rangeMax; i += step) {
          values.add(i);
        }
        continue;
      }

      if (part.includes('-')) {
        const [rangeMin, rangeMax] = part.split('-').map(v => parseInt(v, 10));
        if (isNaN(rangeMin) || isNaN(rangeMax) || rangeMin < min || rangeMax > max || rangeMin > rangeMax) {
          throw new Error(`Invalid range in cron field "${field}"`);
        }
        for (let i = rangeMin; i <= rangeMax; i++) {
          values.add(i);
        }
        continue;
      }

      const value = parseInt(part, 10);
      if (isNaN(value) || value < min || value > max) {
        throw new Error(`Invalid value "${part}" in cron field "${field}"`);
      }
      values.add(value);
    }

    return values;
  }

  matches(date: Date): boolean {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()));

    if (!this.fields.minutes.has(utc.getUTCMinutes())) return false;
    if (!this.fields.hours.has(utc.getUTCHours())) return false;
    if (!this.fields.months.has(utc.getUTCMonth() + 1)) return false;
    if (!this.fields.daysOfWeek.has(utc.getUTCDay())) return false;
    if (!this.fields.daysOfMonth.has(utc.getUTCDate())) return false;

    return true;
  }

  nextRun(from: Date = new Date()): number {
    const now = from.getTime();

    for (let offset = 0; offset < 366 * 24 * 60; offset++) {
      const candidate = new Date(now + offset * 60 * 1000);
      if (this.matches(candidate)) {
        return candidate.getTime();
      }
    }

    throw new Error('Unable to determine next run time for cron expression');
  }

  consecutiveRuns(from: Date = new Date(), count: number = 10): number[] {
    const results: number[] = [];
    let current = from;

    for (let i = 0; i < count; i++) {
      const next = this.nextRun(current);
      results.push(next);
      current = new Date(next + 1);
    }

    return results;
  }
}

export default CronExpression;