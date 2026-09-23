export type LogLevel = 'info' | 'warn' | 'error';

export interface ErrorContext {
  operation: string;
  component: string;
  documentId?: string;
  errorName?: string;
}

export interface Observability {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
  captureError(error: unknown, context: ErrorContext): void;
}

const SENSITIVE_KEY_PATTERN =
  /(?:password|passwd|token|secret|authorization|cookie|bodyhtml|content|html|document|fields?)/i;
const MAX_STRING_LENGTH = 500;

const defaultObservability: Observability = {
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizeString(message),
      context: sanitizeContext(context),
    };
    const serialized = JSON.stringify(entry);
    if (level === 'error') console.error(serialized);
    else if (level === 'warn') console.warn(serialized);
    else console.info(serialized);
  },
  captureError(error, context) {
    const normalized = normalizeError(error);
    this.log('error', normalized.message, {
      ...context,
      errorName: normalized.name,
      stack: normalized.stack,
    });
  },
};

let currentObservability: Observability = defaultObservability;

export function getObservability(): Observability {
  return currentObservability;
}

export function setObservability(observability: Observability): void {
  currentObservability = observability;
}

export function resetObservability(): void {
  currentObservability = defaultObservability;
}

function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeValue(value),
    ]),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    return sanitizeContext(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeString(value: string): string {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
}

function normalizeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeErrorMessage(error.message),
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: sanitizeErrorMessage(typeof error === 'string' ? error : 'Erro desconhecido'),
  };
}

function sanitizeErrorMessage(value: string): string {
  return sanitizeString(
    value
      .replace(/<[^>]*>/g, '[REDACTED]')
      .replace(
        /(?:token|password|authorization|cookie)\s*[=:]\s*[^\s,;]+/gi,
        '[REDACTED]',
      ),
  );
}
