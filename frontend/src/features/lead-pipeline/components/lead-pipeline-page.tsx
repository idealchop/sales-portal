'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Columns3,
  Download,
  Table2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeadDetailsDialog } from '@/features/lead-pipeline/components/lead-details-dialog';
import { LeadFollowUpComposeDialog } from '@/features/lead-pipeline/components/lead-follow-up-compose-dialog';
import { LeadHistoryDialog } from '@/features/lead-pipeline/components/lead-history-dialog';
import { LeadPipelineBoard } from '@/features/lead-pipeline/components/lead-pipeline-board';
import { LeadPipelineInsights } from '@/features/lead-pipeline/components/lead-pipeline-insights';
import { LeadPipelineTable } from '@/features/lead-pipeline/components/lead-pipeline-table';
import { LeadPipelineTableLoading } from '@/features/lead-pipeline/components/lead-pipeline-table-loading';
import { LeadStatusDialog } from '@/features/lead-pipeline/components/lead-status-dialog';
import { LeadUpdateDetailsDialog } from '@/features/lead-pipeline/components/lead-update-details-dialog';
import { ConfirmDeleteDialog } from '@/features/events-training/components/confirm-delete-dialog';
import { LEAD_QUEUE_TABS } from '@/features/lead-pipeline/lib/lead-pipeline-display';
import { useLeads } from '@/hooks/use-leads';
import { useAuthUid } from '@/hooks/use-auth-uid';
import type { Lead, LeadQueue } from '@/lib/definitions';
import { cn } from '@/lib/utils';

type ViewMode = 'board' | 'table' | 'insights';

export function LeadPipelinePage() {
  const { uid, authReady } = useAuthUid();
  const [queue, setQueue] = useState<LeadQueue>('all');
  const [tableQueue, setTableQueue] = useState<LeadQueue>('all');
  const [view, setView] = useState<ViewMode>('board');
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [editingDetails, setEditingDetails] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState<Lead | null>(null);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [gatherMenuOpen, setGatherMenuOpen] = useState(false);
  const [confirmFullRefresh, setConfirmFullRefresh] = useState(false);

  const boardOnly = view === 'board';

  const {
    leads,
    analytics,
    isLoading,
    error,
    saveLead,
    bulkAssign,
    gather,
    isGathering,
    gatherError,
    gatherSummary,
    refresh,
  } = useLeads({
    queue,
    assignee: boardOnly && uid ? uid : undefined,
    enabled: !boardOnly || Boolean(uid),
  });

  const counts = useMemo(
    () =>
      analytics?.queueCounts ?? {
        all: 0,
        content: 0,
        warm: 0,
        cold: 0,
        onboarded: 0,
        archive: 0,
      },
    [analytics],
  );

  async function handleAssign(lead: Lead, assignedToUids: string[]) {
    await saveLead({ assignedToUids }, lead.id);
  }

  async function handleBulkAssign(
    leadIds: string[],
    mode: 'set' | 'add' | 'remove' | 'clear',
    assignedToUids?: string[],
  ) {
    await bulkAssign({ leadIds, mode, assignedToUids });
  }

  function switchView(next: ViewMode) {
    if (next === view) return;
    if (next === 'insights' || next === 'board') {
      if (view === 'table') {
        setTableQueue(queue);
      }
      setQueue('all');
      setView(next);
      return;
    }
    setQueue(queue !== 'all' ? queue : tableQueue);
    setView('table');
  }

  function selectQueue(next: LeadQueue) {
    setQueue(next);
    setTableQueue(next);
  }

  const showQueueTabs = view === 'table' || view === 'insights';

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Lead pipeline</h1>
          <p className='mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]'>
            {boardOnly
              ? 'Your personal board — only leads assigned to you.'
              : 'Prospects, customers, and content emails.'}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative inline-flex'>
            <Button
              type='button'
              size='sm'
              disabled={isGathering}
              onClick={() => void gather('incremental')}
              className='gap-1.5 rounded-r-none'
            >
              {isGathering ? (
                <span className='inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent' />
              ) : (
                <Download className='h-3.5 w-3.5' />
              )}
              Gather new leads
            </Button>
            <Button
              type='button'
              size='sm'
              variant='primary'
              disabled={isGathering}
              aria-expanded={gatherMenuOpen}
              aria-label='Gather options'
              onClick={() => setGatherMenuOpen((open) => !open)}
              className='rounded-l-none border-l border-teal-500 px-2'
            >
              <ChevronDown className='h-3.5 w-3.5' />
            </Button>
            {gatherMenuOpen ? (
              <div className='absolute right-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-md'>
                <button
                  type='button'
                  disabled={isGathering}
                  className='block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60'
                  onClick={() => {
                    setGatherMenuOpen(false);
                    void gather('incremental');
                  }}
                >
                  Incremental
                  <span className='mt-0.5 block text-xs text-zinc-500'>
                    Insert missing leads only (same as the button)
                  </span>
                </button>
                <button
                  type='button'
                  disabled={isGathering}
                  className='block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60'
                  onClick={() => {
                    setGatherMenuOpen(false);
                    setConfirmFullRefresh(true);
                  }}
                >
                  Full refresh
                  <span className='mt-0.5 block text-xs text-zinc-500'>
                    Same as the midnight batch; keeps CRM fields
                  </span>
                </button>
              </div>
            ) : null}
          </div>
          <div className='inline-flex rounded-lg border border-zinc-200 bg-white p-0.5'>
            <button
              type='button'
              onClick={() => switchView('board')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                view === 'board'
                  ? 'bg-teal-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50',
              )}
            >
              <Columns3 className='h-3.5 w-3.5' />
              Board
            </button>
            <button
              type='button'
              onClick={() => switchView('table')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                view === 'table'
                  ? 'bg-teal-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50',
              )}
            >
              <Table2 className='h-3.5 w-3.5' />
              Table
            </button>
            <button
              type='button'
              onClick={() => switchView('insights')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                view === 'insights'
                  ? 'bg-teal-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50',
              )}
            >
              <BarChart3 className='h-3.5 w-3.5' />
              Insights
            </button>
          </div>
        </div>
      </div>

      {gatherSummary ? (
        <p className='rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900'>
          Gather complete ({gatherSummary.mode}): Inserted{' '}
          {gatherSummary.inserted} · Updated {gatherSummary.updated} · Skipped{' '}
          {gatherSummary.skipped}
          <span className='text-teal-700'>
            {' '}
            (scanned {gatherSummary.scanned})
          </span>
        </p>
      ) : null}
      {gatherError ? (
        <p className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {gatherError}
        </p>
      ) : null}

      {showQueueTabs ? (
        <div className='flex flex-wrap items-center gap-2'>
          {LEAD_QUEUE_TABS.map((tab) => {
            const count = counts[tab.id];
            const active = queue === tab.id;
            return (
              <button
                key={tab.id}
                type='button'
                onClick={() => selectQueue(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                  active
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-teal-200',
                )}
              >
                {tab.label}
                <Badge
                  className={cn(
                    'min-w-5 justify-center px-1.5 py-0 text-[10px]',
                    active
                      ? 'border-teal-200 bg-white text-teal-800'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600',
                  )}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {error}
        </p>
      ) : null}

      {isLoading || (boardOnly && !authReady) ? (
        view === 'table' ? (
          <LeadPipelineTableLoading />
        ) : (
          <div className='flex h-48 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600'>
            <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent' />
            Loading {view === 'board' ? 'your board' : 'insights'}…
          </div>
        )
      ) : boardOnly && !uid ? (
        <p className='rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-10 text-center text-sm text-zinc-500'>
          Sign in to see leads assigned to you.
        </p>
      ) : view === 'board' ? (
        <div className='space-y-3'>
          <p className='text-xs text-zinc-500'>
            Showing only leads assigned to you · {leads.length} total
          </p>
          <LeadPipelineBoard
            leads={leads}
            onViewDetails={setViewing}
            onUpdateDetails={setEditingDetails}
            onUpdateStatus={setUpdating}
            onViewHistory={setHistoryLead}
            onFollowUpEmail={setFollowUpLead}
          />
        </div>
      ) : view === 'table' ? (
        <LeadPipelineTable
          leads={leads}
          queue={queue}
          onViewDetails={setViewing}
          onUpdateDetails={setEditingDetails}
          onUpdateStatus={setUpdating}
          onViewHistory={setHistoryLead}
          onFollowUpEmail={setFollowUpLead}
          onAssign={handleAssign}
          onBulkAssign={handleBulkAssign}
          onLeadsChanged={() => {
            void refresh();
          }}
        />
      ) : (
        <LeadPipelineInsights
          leads={leads}
          queue={queue}
          analytics={analytics}
        />
      )}

      <LeadDetailsDialog
        open={Boolean(viewing)}
        lead={viewing}
        onClose={() => setViewing(null)}
        onUpdateDetails={(lead) => {
          setViewing(null);
          setEditingDetails(lead);
        }}
        onUpdateStatus={(lead) => {
          setViewing(null);
          setUpdating(lead);
        }}
        onViewHistory={(lead) => {
          setViewing(null);
          setHistoryLead(lead);
        }}
      />
      <LeadUpdateDetailsDialog
        open={Boolean(editingDetails)}
        lead={editingDetails}
        onClose={() => setEditingDetails(null)}
        onSave={saveLead}
      />
      <LeadStatusDialog
        open={Boolean(updating)}
        lead={updating}
        onClose={() => setUpdating(null)}
        onSave={saveLead}
      />
      <LeadHistoryDialog
        open={Boolean(historyLead)}
        lead={historyLead}
        onClose={() => setHistoryLead(null)}
      />
      <LeadFollowUpComposeDialog
        open={Boolean(followUpLead)}
        lead={followUpLead}
        onClose={() => setFollowUpLead(null)}
        onSave={saveLead}
      />
      {confirmFullRefresh ? (
        <ConfirmDeleteDialog
          title='Full refresh from sources?'
          description='Same as the midnight batch: updates names, emails, content sources, and other source fields from SmartRefill and legacy. Keeps status, attempts, assignee, notes, and follow-up dates.'
          confirmLabel='Run full refresh'
          busyLabel='Gathering…'
          onClose={() => setConfirmFullRefresh(false)}
          onConfirm={async () => {
            await gather('full');
            setConfirmFullRefresh(false);
          }}
        />
      ) : null}
    </div>
  );
}
