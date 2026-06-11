"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type Toast = {
  id: string;
  message: string;
  undo?: () => void;
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastHost({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
    delete timers.current[id];
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);
    timers.current[id] = setTimeout(() => remove(id), 4500);
  }, [remove]);

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  const ctxValue = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={ctxValue}>
      {children}
      <div className="toast-wrap" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <output className="toast" key={t.id}>
            <Icon name="check" />
            <span className="t-msg">{t.message}</span>
            {t.undo ? (
              <button
                className="t-undo"
                type="button"
                onClick={() => {
                  t.undo?.();
                  remove(t.id);
                }}
              >
                Undo
              </button>
            ) : null}
          </output>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastHost>");
  return ctx;
}
