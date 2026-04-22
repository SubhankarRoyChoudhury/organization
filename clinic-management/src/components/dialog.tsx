"use client";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
}: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,15,26,0.46)] p-4 backdrop-blur-md">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(247,250,252,0.94)_100%)] p-6 shadow-[0_40px_120px_rgba(9,18,34,0.24)] sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.14),transparent_52%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_48%)]"
        />
        <div className="relative flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700/70">
              Clinical Workspace
            </p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="relative mt-6">{children}</div>
      </div>
    </div>
  );
}
