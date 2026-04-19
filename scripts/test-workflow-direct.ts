import { approveByRmk } from '../src/services/rps-workflow/review-rmk';
import { PrismaClient } from '@prisma/client';

const RPS_ID = '768d9dfb-920f-430b-a8c5-8dca4c6be92b';
const RMK_USER_ID = 'e9ee8dd4-1019-431d-b912-4822ce775efb';
const prisma = new PrismaClient();

async function main() {
  await prisma.rps.update({
    where: { id: RPS_ID },
    data: {
      workflowStatus: 'submitted_to_rmk',
      currentRevisionCount: 0,
      lastChangedAt: new Date('2025-01-01'),
      lastReviewedAtByRmk: null,
      lastReviewedAtByKaprodi: null,
    },
  });
  console.log('State reset to submitted_to_rmk');

  try {
    const result = await approveByRmk(RPS_ID, { actorUserId: RMK_USER_ID });
    console.log('OK — workflowStatus:', result.workflowStatus);
  } catch (e: any) {
    console.error('ERROR class:', e.constructor?.name);
    console.error('ERROR name:', e.name);
    console.error('ERROR message:', e.message);
    if (e.code) console.error('ERROR prisma code:', e.code);
    console.error('STACK:', (e.stack ?? '').split('\n').slice(0, 8).join('\n'));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect().then(() => process.exit(0)));
