import { useState } from "react";

export interface IErrorToast {
  id: number;
  title: string;
  messages: string[];
}

let nextErrorToastId = 0;

export function useErrorToasts() {
  const [toasts, setToasts] = useState<IErrorToast[]>([]);

  function showError(title: string, messages: string[]) {
    const id = nextErrorToastId++;
    setToasts((current) => [...current, { id, title, messages }]);
  }

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return { toasts, showError, dismiss };
}
