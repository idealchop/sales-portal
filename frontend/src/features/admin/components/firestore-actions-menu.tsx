"use client";

import { Building2, Eye, MoreVertical, Pencil, ScrollText, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const MENU_WIDTH = 176;
const MENU_ITEM_HEIGHT = 36;
const MENU_PADDING = 8;

function menuHeight(itemCount: number): number {
  return itemCount * MENU_ITEM_HEIGHT + MENU_PADDING;
}

export function FirestoreActionsMenu({
  onView,
  onViewProfile,
  onLogs,
  onViewBusinessInfo,
  onEdit,
  onRemove,
  removeDisabled = false,
  removeDisabledTitle,
  align = "right",
  buttonClassName,
}: {
  onView?: () => void;
  onViewProfile?: () => void;
  onLogs?: () => void;
  onViewBusinessInfo?: () => void;
  onEdit: () => void;
  onRemove: () => void;
  removeDisabled?: boolean;
  removeDisabledTitle?: string;
  align?: "left" | "right";
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLSpanElement>(null);

  const itemCount =
    (onView ? 1 : 0) +
    (onViewProfile ? 1 : 0) +
    (onLogs ? 1 : 0) +
    (onViewBusinessInfo ? 1 : 0) +
    2;

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const height = menuHeight(itemCount);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < height + 8;

    const top = openUpward ? rect.top - height - 4 : rect.bottom + 4;
    const left =
      align === "right" ?
        Math.max(8, rect.right - MENU_WIDTH)
      : Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);

    setMenuPosition({ top, left });
  }, [align, itemCount]);

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

  const menu =
    open && menuPosition ?
      createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] min-w-[9rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: MENU_WIDTH,
          }}
        >
          {onView && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
              onClick={() => {
                setOpen(false);
                onView();
              }}
            >
              <Eye className="h-3.5 w-3.5 text-zinc-500" />
              View
            </button>
          )}
          {onViewProfile && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
              onClick={() => {
                setOpen(false);
                onViewProfile();
              }}
            >
              <Eye className="h-3.5 w-3.5 text-zinc-500" />
              View profile
            </button>
          )}
          {onViewBusinessInfo && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
              onClick={() => {
                setOpen(false);
                onViewBusinessInfo();
              }}
            >
              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
              View business info
            </button>
          )}
          {onLogs && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
              onClick={() => {
                setOpen(false);
                onLogs();
              }}
            >
              <ScrollText className="h-3.5 w-3.5 text-zinc-500" />
              Logs
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-zinc-500" />
            Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={removeDisabled}
            title={removeDisabled ? removeDisabledTitle : undefined}
            onClick={() => {
              if (removeDisabled) return;
              setOpen(false);
              onRemove();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
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
          className={buttonClassName ?? "h-8 w-8 p-0"}
          aria-label="Actions"
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
