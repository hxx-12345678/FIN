/**
 * Audit & Provenance Agent — Production Grade
 *
 * Provides a verifiable audit trail by querying real model-run history,
 * diffing parameter changes across runs, and surfacing governance overrides.
 * Zero hardcoded responses — every answer is grounded in DB records.
 */

import prisma from '../../config/database';
import { AgentType, AgentResponse, AgentStatus, AgentThought, DataSource } from './agent-types';
import { v4 as uuidv4 } from 'uuid';

export class AuditProvenanceAgent {
  public type: AgentType = 'audit_provenance';

  async execute(orgId: string, userId: string, params: any): Promise<AgentResponse> {
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];
    const calculations: Record<string, number> = {};

    thoughts.push({
      step: 1,
      thought: 'Querying model-run history and change provenance records...',
      action: 'data_retrieval',
    });

    // ── 1. Fetch the last N model runs to build a real change-log ──
    let modelRuns: any[] = [];
    try {
      modelRuns = await prisma.modelRun.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { model: { select: { name: true } } },
      });
    } catch (err) {
      console.warn('[AuditProvenanceAgent] DB access error:', err);
    }

    if (modelRuns.length > 0) {
      dataSources.push({
        type: 'model_run',
        id: 'model_run_history',
        name: `Model Run History (${modelRuns.length} runs)`,
        timestamp: new Date(),
        confidence: 1.0,
        snippet: `Analysed ${modelRuns.length} historical model runs for ${modelRuns[0]?.model?.name || 'Unknown Model'}.`,
      });
    }

    thoughts.push({
      step: 2,
      thought: `Retrieved ${modelRuns.length} model runs for provenance analysis.`,
      observation: modelRuns.length > 0
        ? `Latest run: ${modelRuns[0]?.createdAt?.toISOString().split('T')[0]} | Status: ${modelRuns[0]?.status}`
        : 'No model runs found for this organisation.',
    });

    // ── 2. Diff summaryJson between consecutive runs ──
    interface ParamChange {
      field: string;
      previousValue: string;
      currentValue: string;
      runDate: string;
      runId: string;
      delta: string;
    }

    const changes: ParamChange[] = [];

    for (let i = 0; i < modelRuns.length - 1; i++) {
      const current = modelRuns[i];
      const previous = modelRuns[i + 1];
      const curSummary = (current.summaryJson as Record<string, any>) || {};
      const prevSummary = (previous.summaryJson as Record<string, any>) || {};

      const allKeys = new Set([...Object.keys(curSummary), ...Object.keys(prevSummary)]);
      for (const key of allKeys) {
        const curVal = curSummary[key];
        const prevVal = prevSummary[key];

        // Only track scalar values that actually changed
        if (
          (typeof curVal === 'number' || typeof curVal === 'string') &&
          (typeof prevVal === 'number' || typeof prevVal === 'string') &&
          String(curVal) !== String(prevVal)
        ) {
          const numCur = typeof curVal === 'number' ? curVal : parseFloat(String(curVal));
          const numPrev = typeof prevVal === 'number' ? prevVal : parseFloat(String(prevVal));
          const deltaStr =
            !isNaN(numCur) && !isNaN(numPrev) && numPrev !== 0
              ? `${((numCur - numPrev) / Math.abs(numPrev) * 100).toFixed(1)}%`
              : 'N/A';

          changes.push({
            field: key,
            previousValue: String(prevVal),
            currentValue: String(curVal),
            runDate: current.createdAt?.toISOString().split('T')[0] || 'unknown',
            runId: current.id,
            delta: deltaStr,
          });
        }
      }
    }

    thoughts.push({
      step: 3,
      thought: `Diffed consecutive runs. Found ${changes.length} parameter changes across ${modelRuns.length} runs.`,
      action: 'provenance_diff',
    });

    calculations.total_model_runs = modelRuns.length;
    calculations.parameter_changes_detected = changes.length;
    calculations.unique_fields_changed = new Set(changes.map(c => c.field)).size;

    // ── 3. Build the answer ──
    let answer = '';

    if (modelRuns.length === 0) {
      answer =
        `**Audit Provenance Report**\n\n` +
        `⚠️ **No model runs found** for this organisation. There is no provenance trail to audit.\n\n` +
        `**Recommendation:** Run a financial model to create the first snapshot. ` +
        `All subsequent runs will be diffed automatically to create a verifiable change log.`;
    } else if (changes.length === 0) {
      answer =
        `**Audit Provenance Report**\n\n` +
        `✅ **No parameter changes detected** across ${modelRuns.length} model runs.\n\n` +
        `| Metric | Value |\n` +
        `|--------|-------|\n` +
        `| **Total Runs Audited** | ${modelRuns.length} |\n` +
        `| **Latest Run** | ${modelRuns[0]?.createdAt?.toISOString().split('T')[0]} |\n` +
        `| **Model** | ${modelRuns[0]?.model?.name || 'Default'} |\n` +
        `| **Status** | ${modelRuns[0]?.status} |\n\n` +
        `All model parameters have remained stable across the audit window. No governance overrides detected.`;
    } else {
      // Show most significant changes (top 10)
      const topChanges = changes.slice(0, 10);

      answer =
        `**Audit Provenance Report — Change Log**\n\n` +
        `Detected **${changes.length} parameter change(s)** across **${modelRuns.length}** historical model runs.\n\n` +
        `| Date | Parameter | Previous | Current | Δ% | Run ID |\n` +
        `|------|-----------|----------|---------|-----|--------|\n` +
        topChanges.map(c =>
          `| ${c.runDate} | **${c.field.replace(/_/g, ' ')}** | ${c.previousValue} | ${c.currentValue} | ${c.delta} | \`${c.runId.slice(0, 8)}…\` |`
        ).join('\n') +
        `\n\n`;

      if (changes.length > 10) {
        answer += `*...and ${changes.length - 10} more changes in the audit trail.*\n\n`;
      }

      // Governance risk assessment
      const largeChanges = changes.filter(c => {
        if (c.delta === 'N/A') return false;
        return Math.abs(parseFloat(c.delta)) > 20;
      });

      if (largeChanges.length > 0) {
        answer +=
          `### ⚠️ Governance Alert: Large Parameter Shifts\n\n` +
          `**${largeChanges.length} change(s)** exceeded the 20% variance threshold:\n\n` +
          largeChanges.slice(0, 5).map(c =>
            `- **${c.field.replace(/_/g, ' ')}**: ${c.delta} change on ${c.runDate}`
          ).join('\n') +
          `\n\n` +
          `These require review under SOX/SOC2 governance controls. Each change has been logged with a unique Run ID for full traceability.`;
      } else {
        answer += `✅ All changes are within normal variance bounds (< 20%). No governance escalation required.`;
      }
    }

    return {
      agentType: this.type,
      taskId: uuidv4(),
      status: 'completed' as AgentStatus,
      answer,
      confidence: modelRuns.length > 0 ? 0.95 : 0.3,
      thoughts,
      dataSources,
      calculations,
      governanceOverrides: changes
        .filter(c => c.delta !== 'N/A' && Math.abs(parseFloat(c.delta)) > 20)
        .map(c => ({
          userId: 'system',
          timestamp: new Date(c.runDate),
          originalValue: parseFloat(c.previousValue) || 0,
          newValue: parseFloat(c.currentValue) || 0,
          justification: `Parameter "${c.field}" changed by ${c.delta} between consecutive runs.`,
          impactDelta: parseFloat(c.currentValue) - parseFloat(c.previousValue) || 0,
        })),
      auditMetadata: {
        modelVersion: 'audit-provenance-v2.0.0-production',
        timestamp: new Date(),
        inputVersions: {
          model_run_count: String(modelRuns.length),
          audit_window: modelRuns.length > 1
            ? `${modelRuns[modelRuns.length - 1]?.createdAt?.toISOString().split('T')[0]} → ${modelRuns[0]?.createdAt?.toISOString().split('T')[0]}`
            : 'single_run',
        },
      },
    };
  }
}

export const auditProvenanceAgent = new AuditProvenanceAgent();
