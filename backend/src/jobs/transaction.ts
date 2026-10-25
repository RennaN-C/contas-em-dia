import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/** Locks coordinate with the existing account/payment writers across instances. */
export async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>,isolationLevel:'ReadCommitted'|'Serializable'='ReadCommitted'): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel, timeout: 30_000 });
    } catch (error) {
      const e = error as { code?: string; meta?: { code?: string } };
      const retry = e.code === 'P2034' || (e.code === 'P2010' && ['40001', '40P01'].includes(e.meta?.code ?? ''));
      if (!retry || attempt >= 2) throw error;
    }
  }
}
