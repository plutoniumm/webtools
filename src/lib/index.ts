import { writable } from 'svelte/store';

interface Toast {
  type: 200 | 400;
  text: string;
}

export const toasts: any = writable([]);

export function notify (type: 200 | 400, text: string) {
  const toast: Toast = { type, text };

  toasts.update((current: Toast[]) => {
    current.push(toast);
    return current;
  });
}