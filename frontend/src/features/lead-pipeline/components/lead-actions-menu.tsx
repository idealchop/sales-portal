"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  History,
  Mail,
  MoreVertical,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MENU_WIDTH = 208;
const MENU_ITEM_HEIGHT = 36;
const MENU_PADDING = 8;
const ITEM_COUNT = 5;

function menuHeight(): number {
  return ITEM_COUNT * MENU_ITEM_HEIGHT + MENU_PADDING;
}

export function LeadActionsMenu({
  onViewDetails,
  onUpdateDetails,
  onUpdateStatus,
  onViewHistory,
  onFollowUpEmail,
}: {
  onViewDetails: () => void;
  onUpdateDetails: () => void;
  onUpdateStatus: () => void;
  onViewHistory: () => void;
  onFollowUpEmail: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLSpanElement>(null);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const height = menuHeight();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < height + 8;

    setMenuPosition({
      top: openUpward ? rect.top - height - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleReposition() {
      updateMenuPosition();
    }

    window.document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateMenuPosition]);

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        requestAnimationFrame(() => updateMenuPosition());
      } else {
        setMenuPosition(null);
      }
      return next;
    });
  }

  function runAction(action: () => void) {
    setOpen(false);
    setMenuPosition(null);
    action();
  }

  const menu =
    open && menuPosition ?
      createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: MENU_WIDTH,
          }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={() => runAction(onViewDetails)}
          >
            <Eye className="h-3.5 w-3.5 text-zinc-500" />
            View details
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={() => runAction(onUpdateDetails)}
          >
            <Pencil className="h-3.5 w-3.5 text-zinc-500" />
            Update details
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={() => runAction(onUpdateStatus)}
          >
            <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
            Update status
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={() => runAction(onFollowUpEmail)}
          >
            <Mail className="h-3.5 w-3.5 text-zinc-500" />
            Follow up via email
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={() => runAction(onViewHistory)}
          >
            <History className="h-3.5 w-3.5 text-zinc-500" />
            View history
          </button>
        </div>,
        window.document.body,
      )
    : null;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <span ref={buttonRef} className="inline-flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-800"
          aria-label="Lead actions"
          aria-expanded={open}
          onClick={toggleOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </span>
      {menu}
    </div>
  );
}
