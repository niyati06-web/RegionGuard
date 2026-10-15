import React from 'react';
import { Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ExplanationToastProps {
  explanation: {
    title: string;
    text: string;
    severity: string;
  } | null;
  onClose: () => void;
}

export const ExplanationToast: React.FC<ExplanationToastProps> = ({ explanation, onClose }) => {
  if (!explanation) return null;

  let border = 'border-blue-500 bg-navy-900/95 text-slate-100';
  let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

  if (explanation.severity === 'warn') {
    border = 'border-amber-500 bg-navy-900/95 text-slate-100';
    icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
  } else if (explanation.severity === 'success') {
    border = 'border-emerald-500 bg-navy-900/95 text-slate-100';
    icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
  } else if (explanation.severity === 'error') {
    border = 'border-rose-500 bg-navy-900/95 text-slate-100';
    icon = <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
  }

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] select-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className={`p-3.5 rounded-xl border-2 shadow-2xl backdrop-blur flex items-start gap-3 ${border}`}>
        {icon}
        <div className="flex-1 text-xs">
          <div className="font-bold text-sm tracking-tight text-slate-100 mb-0.5">
            What Just Happened? {explanation.title}
          </div>
          <p className="text-slate-300 leading-relaxed font-sans">{explanation.text}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
