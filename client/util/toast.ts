// global toast API. Callable from any component with no local state or ToastContainer of its own required
// Intended for one-off notifications (e.g. "Refresh succeeded")

export type TToastVariant = "success" | "error" | "info" | "warning";

export interface IToast {
  id: number;
  variant: TToastVariant;
  message: string;
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

function show(variant: TToastVariant, message: string): number {
  const id = nextToastId++;
  toasts = [...toasts, { id, variant, message }];
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
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
  warning: (message: string) => show("warning", message),
  dismiss,
};
