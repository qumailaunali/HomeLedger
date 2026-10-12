"use client";

import * as React from "react";
import { Dialog as D, AlertDialog as A } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

/**
 * Accessible dialog (focus trap, Escape, aria labelling via Radix).
 * On phones it slides up as a bottom sheet; on larger screens it is centred.
 */

const Dialog = D.Root;
const DialogTrigger = D.Trigger;
const DialogClose = D.Close;

const overlay = "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in";
const panel =
  "fixed z-50 flex max-h-[92dvh] w-full flex-col bg-popover text-popover-foreground shadow-2xl outline-none " +
  "inset-x-0 bottom-0 rounded-t-3xl pb-safe data-[state=open]:animate-sheet " +
  "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:pb-0 sm:data-[state=open]:animate-dialog";

function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof D.Content> & { hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content className={cn(panel, className)} {...props}>
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />
        {children}
        {!hideClose && (
          <D.Close
            className="absolute right-3 top-3 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pt-4 pb-2 pr-12 sm:pt-5", className)} {...props} />;
}
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3", className)} {...props} />;
}
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end", className)} {...props} />;
}
function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}
function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}

// ---- Alert dialog (destructive confirmations) ----

const AlertDialog = A.Root;

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Portal>
      <A.Overlay className={overlay} />
      <A.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-popover p-6 text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-dialog",
          className,
        )}
        {...props}
      />
    </A.Portal>
  );
}
const AlertDialogTitle = ({ className, ...p }: React.ComponentProps<typeof A.Title>) => (
  <A.Title className={cn("text-lg font-semibold", className)} {...p} />
);
const AlertDialogDescription = ({ className, ...p }: React.ComponentProps<typeof A.Description>) => (
  <A.Description className={cn("text-sm text-muted-foreground", className)} {...p} />
);
const AlertDialogCancel = ({ className, ...p }: React.ComponentProps<typeof A.Cancel>) => (
  <A.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...p} />
);
const AlertDialogAction = A.Action;

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
