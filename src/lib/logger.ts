const PREFIX = '[De-Mainstream]';

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: string, ...args: unknown[]): string {
  return `${timestamp()} ${PREFIX} ${level}: ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}`;
}

export const log = {
  info(...args: unknown[]) {
    console.log(format('INFO', ...args));
  },
  warn(...args: unknown[]) {
    console.warn(format('WARN', ...args));
  },
  error(...args: unknown[]) {
    console.error(format('ERROR', ...args));
  },
  debug(...args: unknown[]) {
    console.debug(format('DEBUG', ...args));
  },
  group(label: string, ...args: unknown[]) {
    console.groupCollapsed(`${PREFIX} ${label}`);
    for (const a of args) {
      console.log(typeof a === 'object' ? a : String(a));
    }
    console.groupEnd();
  },
};
