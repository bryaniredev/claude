import { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  title: React.ReactNode;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Mobile-first bottom sheet; centred dialog on large screens. */
export default function BottomSheet({ title, eyebrow, onClose, children, footer }: BottomSheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:bottom-8 lg:w-full lg:max-w-lg lg:rounded-3xl"
        style={{ maxHeight: '88vh' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-5 pt-2 pb-3 border-b border-gray-100 shrink-0 flex items-start gap-3 lg:pt-5">
          <div className="flex-1 min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                {eyebrow}
              </p>
            )}
            <div className="font-bold text-gray-900 text-lg leading-snug">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 pt-3 pb-6 border-t border-gray-100 shrink-0 bg-white rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
