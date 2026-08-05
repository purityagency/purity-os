export interface Logger {
  info(msg: string, ctx?: Record<string, unknown>): void
  error(msg: string, err?: unknown, ctx?: Record<string, unknown>): void
  warn(msg: string, ctx?: Record<string, unknown>): void
}

function errMessage(err: unknown) {
  return err instanceof Error ? err.message : err
}

export const logger: Logger = {
  info: (msg, ctx) => console.log(JSON.stringify({ level: 'INFO', msg, ctx, time: new Date().toISOString() })),
  error: (msg, err, ctx) => console.error(JSON.stringify({ level: 'ERROR', msg, err: errMessage(err), ctx, time: new Date().toISOString() })),
  warn: (msg, ctx) => console.warn(JSON.stringify({ level: 'WARN', msg, ctx, time: new Date().toISOString() }))
}
