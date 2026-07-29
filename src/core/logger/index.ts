export interface Logger {
  info(msg: string, ctx?: any): void
  error(msg: string, err?: any, ctx?: any): void
  warn(msg: string, ctx?: any): void
}

export const logger: Logger = {
  info: (msg, ctx) => console.log(JSON.stringify({ level: 'INFO', msg, ctx, time: new Date().toISOString() })),
  error: (msg, err, ctx) => console.error(JSON.stringify({ level: 'ERROR', msg, err: err?.message || err, ctx, time: new Date().toISOString() })),
  warn: (msg, ctx) => console.warn(JSON.stringify({ level: 'WARN', msg, ctx, time: new Date().toISOString() }))
}
