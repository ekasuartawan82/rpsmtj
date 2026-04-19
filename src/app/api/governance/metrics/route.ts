/**
 * Fase 2 Governance - Metrics API
 *
 * Provides basic governance metrics for observability
 * Policy: FASE_2_IMPLEMENTATION_CONTRACT.md - Section 7 (Observability Layer)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    // Require authentication
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and governance roles can access metrics
    if (!['admin', 'kaprodi', 'koordinator_rmk'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Calculate metrics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Metric 1: Approval Freshness Compliance
    // % of approvals performed within 60 seconds of last change
    const [totalApprovals, rushedApprovals] = await Promise.all([
      prisma.rpsApprovalLog.count({
        where: {
          action: { in: ['approve_rmk', 'approve_kaprodi'] },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.rpsApprovalLog.count({
        where: {
          action: { in: ['approve_rmk', 'approve_kaprodi'] },
          createdAt: { gte: thirtyDaysAgo }
        }
      })
      // Note: Review duration calculation would require JOIN with RPS table
      // For MVP, we're counting all approvals as baseline
    ]);

    const freshnessViolationRate = totalApprovals > 0
      ? (rushedApprovals / totalApprovals) * 100
      : 0;

    // Metric 2: Revision Cycle Distribution
    const revisionDistribution = await prisma.rpsApprovalLog.groupBy({
      by: ['revisionRound'],
      where: {
        action: { contains: 'revision' },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      },
      _count: {
        revisionRound: true
      },
      orderBy: {
        revisionRound: 'asc'
      }
    });

    const totalRevisions = revisionDistribution.reduce((sum, item) => sum + item._count.revisionRound, 0);

    // Metric 3: Documents by workflow status
    const documentsByStatus = await prisma.rps.groupBy({
      by: ['workflowStatus'],
      where: {
        recordStatus: 'active'
      },
      _count: {
        workflowStatus: true
      }
    });

    // Metric 4: Documents by record status
    const documentsByRecordStatus = await prisma.rps.groupBy({
      by: ['recordStatus'],
      _count: {
        recordStatus: true
      }
    });

    // Calculate status category
    const getStatusCategory = (rate: number) => {
      if (rate < 5) return 'green';
      if (rate < 15) return 'yellow';
      return 'red';
    };

    return NextResponse.json({
      period: 'last_30_days',
      calculatedAt: new Date().toISOString(),
      metrics: {
        freshness: {
          rate: freshnessViolationRate,
          totalApprovals,
          status: getStatusCategory(freshnessViolationRate)
        },
        revisionDistribution: {
          total: totalRevisions,
          byRound: revisionDistribution.map(item => ({
            round: item.revisionRound,
            count: item._count.revisionRound,
            percentage: totalRevisions > 0
              ? ((item._count.revisionRound / totalRevisions) * 100).toFixed(2)
              : '0.00'
          }))
        },
        documents: {
          byWorkflowStatus: documentsByStatus.map(item => ({
            status: item.workflowStatus,
            count: item._count.workflowStatus
          })),
          byRecordStatus: documentsByRecordStatus.map(item => ({
            status: item.recordStatus,
            count: item._count.recordStatus
          }))
        }
      }
    });

  } catch (error) {
    console.error('Governance metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate governance metrics' },
      { status: 500 }
    );
  }
}
