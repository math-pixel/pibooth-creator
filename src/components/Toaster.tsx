import { useEffect } from 'react';
import { useStore } from '../store';

export default function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismissToast(t.id), 2600));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => dismissToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
