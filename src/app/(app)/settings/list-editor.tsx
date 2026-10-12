"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/misc";

/**
 * Shared row list for Settings (categories and members): reorder with up/down
 * buttons (keyboard accessible), and a menu for edit / enable-disable / delete.
 */
export function ReorderList<T extends { id: string; name: string; isActive: boolean }>({
  items,
  onReorder,
  onEdit,
  onToggle,
  onDelete,
  renderMeta,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  onEdit: (item: T) => void;
  onToggle: (item: T) => void;
  onDelete: (item: T) => void;
  renderMeta: (item: T) => React.ReactNode;
}) {
  const move = (index: number, delta: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onReorder(next.map((i) => i.id));
  };

  return (
    <ul className="divide-y divide-border/60">
      {items.map((item, i) => (
        <li key={item.id} className={cn("flex items-center gap-2 py-2.5", !item.isActive && "opacity-60")}>
          <div className="flex flex-col">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label={`Move ${item.name} up`}
              className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="size-5" />
            </button>
            <button
              type="button"
              disabled={i === items.length - 1}
              onClick={() => move(i, 1)}
              aria-label={`Move ${item.name} down`}
              className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="size-5" />
            </button>
          </div>
          <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left hover:bg-accent/50">
            <span className="block truncate text-sm font-medium">
              {item.name}
              {!item.isActive && <span className="ml-2 text-xs font-normal text-muted-foreground">Disabled</span>}
            </span>
            <span className="block text-xs text-muted-foreground">{renderMeta(item)}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Options for ${item.name}`}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(item)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggle(item)}>
                {item.isActive ? <EyeOff /> : <Eye />} {item.isActive ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => onDelete(item)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}

/** Keeps a local copy for instant (optimistic) reordering. */
export function useOptimisticList<T extends { id: string }>(items: T[]) {
  const [order, setOrder] = React.useState<string[] | null>(null);
  const sorted = React.useMemo(() => {
    if (!order) return items;
    const map = new Map(items.map((i) => [i.id, i]));
    const ordered = order.map((id) => map.get(id)).filter(Boolean) as T[];
    return ordered.length === items.length ? ordered : items;
  }, [items, order]);
  return [sorted, setOrder] as const;
}
