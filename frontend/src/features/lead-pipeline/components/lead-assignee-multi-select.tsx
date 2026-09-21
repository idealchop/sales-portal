"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { resolveAssigneeUids } from "@/features/lead-pipeline/lib/lead-assignees";
import { inputClassName } from "@/features/lead-pipeline/lib/lead-pipeline-display";
import type { Lead } from "@/lib/definitions";
import { cn } from "@/lib/utils";

export type LeadAssigneeMember = {
  id: string;
  displayName?: string;
  email?: string;
};

function memberLabel(member: LeadAssigneeMember) {
  return member.displayName || member.email || member.id;
}

export function LeadAssigneeMultiSelect({
  lead,
  members,
  disabled,
  onSave,
}: {
  lead: Lead;
  members: LeadAssigneeMember[];
  disabled?: boolean;
  onSave: (assignedToUids: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(() => resolveAssigneeUids(lead));
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setDraft(resolveAssigneeUids(lead));
  }, [lead]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setDraft(resolveAssigneeUids(lead));
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, lead]);

  const labels = draft.map((uid) => {
    const member = members.find((row) => row.id === uid);
    return member ? memberLabel(member) : uid;
  });
  const summary =
    labels.length === 0 ? "Unassigned"
    : labels.length <= 2 ? labels.join(", ")
    : `${labels[0]} +${labels.length - 1}`;

  async function commit(next: string[]) {
    setSaving(true);
    try {
      await onSave(next);
      setDraft(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function toggleUid(uid: string) {
    setDraft((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-[160px]">
      <button
        type="button"
        disabled={disabled || saving}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Assignees for ${lead.businessName}`}
        className={cn(
          inputClassName,
          "flex w-full items-center justify-between gap-1 py-1.5 text-left",
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
          if (!open) setDraft(resolveAssigneeUids(lead));
        }}
      >
        <span className="truncate">{summary}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>
      {open ?
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 z-30 mt-1 max-h-56 w-56 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {members.length === 0 ?
            <p className="px-3 py-2 text-xs text-zinc-500">No assignees</p>
          : members.map((member) => {
              const checked = draft.includes(member.id);
              return (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300"
                    checked={checked}
                    onChange={() => toggleUid(member.id)}
                  />
                  <span className="truncate">{memberLabel(member)}</span>
                </label>
              );
            })
          }
          <div className="mt-1 flex gap-1 border-t border-zinc-100 px-2 py-1.5">
            <button
              type="button"
              className="flex-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              disabled={saving}
              onClick={() => {
                setDraft([]);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="flex-1 rounded-md bg-teal-700 px-2 py-1 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              disabled={saving}
              onClick={() => void commit(draft)}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      : null}
    </div>
  );
}
