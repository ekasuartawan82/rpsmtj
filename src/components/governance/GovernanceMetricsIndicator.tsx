/**
 * Fase 2 Governance - Metrics Indicator Component
 *
 * Simple UI component to display governance health
 * Policy: FASE_2_IMPLEMENTATION_CONTRACT.md - Section 7.4
 */

'use client';

import { useEffect, useState } from 'react';

interface MetricsResponse {
  period: string;
  calculatedAt: string;
  metrics: {
    freshness: {
      rate: number;
      totalApprovals: number;
      status: 'green' | 'yellow' | 'red';
    };
    revisionDistribution: {
      total: number;
      byRound: Array<{
        round: number;
        count: number;
        percentage: string;
      }>;
    };
    documents: {
      byWorkflowStatus: Array<{
        status: string;
        count: number;
      }>;
      byRecordStatus: Array<{
        status: string;
        count: number;
      }>;
    };
  };
}

export function GovernanceMetricsIndicator() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch metrics every 5 minutes
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/governance/metrics');
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
          <span className="text-sm text-gray-600">Memuat metrik governance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">
          ⚠️ Gagal memuat metrik: {error}
        </p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const getStatusColor = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'text-green-700 bg-green-50 border-green-200';
      case 'yellow': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'red': return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  return (
    <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        📊 Governance Health (Last 30 Days)
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Freshness Rate */}
        <div className={`px-3 py-2 rounded border ${getStatusColor(metrics.metrics.freshness.status)}`}>
          <div className="text-xs opacity-75">Freshness Rate</div>
          <div className="text-lg font-bold">
            {metrics.metrics.freshness.rate.toFixed(1)}%
          </div>
          <div className="text-xs opacity-75">
            {metrics.metrics.freshness.totalApprovals} approvals
          </div>
        </div>

        {/* Total Documents */}
        <div className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded">
          <div className="text-xs opacity-75">Total Revisions</div>
          <div className="text-lg font-bold">
            {metrics.metrics.revisionDistribution.total}
          </div>
          <div className="text-xs opacity-75">Last 90 days</div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Draft:</span>
            <span className="font-medium">
              {metrics.metrics.documents.byWorkflowStatus.find(s => s.status === 'draft')?.count || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Submitted RMK:</span>
            <span className="font-medium">
              {metrics.metrics.documents.byWorkflowStatus.find(s => s.status === 'submitted_to_rmk')?.count || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Submitted Kaprodi:</span>
            <span className="font-medium">
              {metrics.metrics.documents.byWorkflowStatus.find(s => s.status === 'submitted_to_kaprodi')?.count || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Approved:</span>
            <span className="font-medium">
              {metrics.metrics.documents.byWorkflowStatus.find(s => s.status === 'approved')?.count || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Warning if high freshness violations */}
      {metrics.metrics.freshness.status === 'red' && (
        <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ Tingkat pelanggaran freshness tinggi. Pertimbangkan untuk review ulang proses approval.
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Updated: {new Date(metrics.calculatedAt).toLocaleString('id-ID')}
      </div>
    </div>
  );
}
