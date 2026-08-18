// global toast API. Callable from any component with no local state or ToastContainer of its own required
// Intended for one-off notifications (e.g. "Refresh succeeded")

export type TToastVariant = "success" | "error" | "info" | "warning";

export interface IToast {
  id: number;
  variant: TToastVariant;
  // Each entry renders on its own line
  messages: string[];
}

type TListener = (toasts: IToast[]) => void;

let nextToastId = 0;
let toasts: IToast[] = [];
const listeners = new Set<TListener>();

const AUTOHIDE_DELAY_MS = 4000;

function notify() {
  for (const listener of listeners) {
    listener(toasts);
  }
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function show(variant: TToastVariant, messages: string[]): number {
  const id = nextToastId++;
  toasts = [...toasts, { id, variant, messages }];
  notify();

  setTimeout(() => dismiss(id), AUTOHIDE_DELAY_MS);

  return id;
}

// Subscribed to by ToastHost only - not meant for use outside that one component.
export function subscribeToasts(listener: TListener): () => void {
  listeners.add(listener);
  listener(toasts);

  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success: (...messages: string[]) => show("success", messages),
  error: (...messages: string[]) => show("error", messages),
  info: (...messages: string[]) => show("info", messages),
  warning: (...messages: string[]) => show("warning", messages),
  dismiss,
};
