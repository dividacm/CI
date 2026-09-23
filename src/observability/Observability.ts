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

const defaultObservability: Observability = {
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
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

function normalizeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'Erro desconhecido',
  };
}
