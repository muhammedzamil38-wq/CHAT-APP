import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./button";

export function Dialog({ isOpen, onClose, title, description, children, footer }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border/50 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </Button>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="p-6 pt-0">{children}</div>
        {footer && (
          <div className="p-6 pt-0 flex flex-col gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
