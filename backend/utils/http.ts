import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);

export function num(v: unknown, name: string, { min = -Infinity, max = Infinity, fallback }: { min?: number; max?: number; fallback?: number } = {}) {
  if (v === undefined || v === null || v === '') {
    if (fallback !== undefined) return fallback;
    throw new HttpError(400, `"${name}" is required`);
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `"${name}" must be a number between ${min} and ${max}`);
  return n;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Unexpected error';
  if (status >= 500) console.error('[api]', err);
  res.status(status).json({ error: message });
}

export const log = (...args: unknown[]) => console.log('\x1b[36m[chargeflow]\x1b[0m', ...args);
