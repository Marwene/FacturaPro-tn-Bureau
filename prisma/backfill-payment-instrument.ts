import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PaymentMethod, ChequeStatus, EffetStatus } from '@/prisma/generated/prisma/client';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface MatchResult {
  paymentId: string;
  instrumentId: string;
  instrumentType: 'CHEQUE' | 'EFFET';
  montant: number;
  tiers: string;
  score: number;
}

interface UnmatchedPayment {
  paymentId: string;
  methode: PaymentMethod;
  montant: number;
  tiersId: string;
  dateReglement: Date;
  reference: string | null;
  companyId: string;
}

async function main() {
  console.log('🔄 Starting backfill: Payment ↔ Cheque/Effet linking\n');

  // NOTE: PaymentMethod enum no longer includes CHEQUE or EFFET (removed in Phase 3)
  // This script is kept for historical reference but will find 0 payments to process.
  // If you need to run a similar backfill in the future, update the query accordingly.

  // 1. Fetch all payments with methode CHEQUE or EFFET that don't already have a link
  const payments = await prisma.payment.findMany({
    where: {
      methode: { in: [] }, // Empty array - CHEQUE and EFFET removed from PaymentMethod enum
      OR: [
        { chequeId: null },
        { effetId: null },
      ],
    },
    include: {
      tiers: { select: { id: true, code: true, raisonSociale: true } },
    },
    orderBy: { dateReglement: 'asc' },
  });

  console.log(`📋 Found ${payments.length} payments to process (CHEQUE/EFFET without links)\n`);

  if (payments.length === 0) {
    console.log('✅ No payments with CHEQUE/EFFET method found. Backfill complete.');
    return;
  }

  // ... rest of the script would continue here if needed
  console.log('⚠️  This script needs updating for new PaymentMethod enum values.');
}