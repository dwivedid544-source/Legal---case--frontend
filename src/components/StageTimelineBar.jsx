import React from 'react';
import { getTemplateForPracticeArea } from '../config/practiceAreaTemplates';

export default function StageTimelineBar({ practiceArea, currentStage, onStageClick }) {
  const template = getTemplateForPracticeArea(practiceArea);
  const stages = template.stages;

  // Compute active stage index
  const normalizedCurrent = String(currentStage || 'Intake').trim().toLowerCase();
  let activeIndex = stages.findIndex(s => {
    const normStage = s.toLowerCase();
    return normStage === normalizedCurrent || normStage.includes(normalizedCurrent) || normalizedCurrent.includes(normStage);
  });
  if (activeIndex === -1) activeIndex = 0;

  return (
    <div className="w-full bg-[#1a2233] border border-white/10 rounded-2xl p-4 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8] animate-pulse" />
          <span className="text-xs font-900 text-white uppercase tracking-wider">Matter Stage Timeline</span>
          <span className="text-[10px] font-700 bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {practiceArea || template.name}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-600">Click any stage to advance case</span>
      </div>

      {/* Linear Timeline Bar */}
      <div className="flex items-center justify-between relative overflow-x-auto py-2 px-1 gap-2">
        {stages.map((stage, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={stage}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onStageClick) onStageClick(stage);
              }}
              className="flex-1 min-w-[110px] flex flex-col items-center cursor-pointer group"
            >
              {/* Connector line & step indicator */}
              <div className="flex items-center w-full mb-2 relative">
                {/* Left line */}
                <div className={`h-1 flex-1 ${idx === 0 ? 'opacity-0' : isCompleted || isCurrent ? 'bg-[#0057c7]' : 'bg-white/10'}`} />

                {/* Node Circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 shrink-0 ${
                  isCurrent
                    ? 'bg-[#0057c7] border-[#38bdf8] text-white shadow-[0_0_12px_#0057c7] scale-110'
                    : isCompleted
                    ? 'bg-[#0057c7]/30 border-[#0057c7] text-[#38bdf8]'
                    : 'bg-slate-800 border-white/15 text-slate-500 group-hover:border-slate-400'
                }`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>

                {/* Right line */}
                <div className={`h-1 flex-1 ${idx === stages.length - 1 ? 'opacity-0' : isCompleted ? 'bg-[#0057c7]' : 'bg-white/10'}`} />
              </div>

              {/* Stage Title */}
              <span className={`text-[11px] font-700 text-center leading-tight transition-all ${
                isCurrent
                  ? 'text-[#38bdf8] font-900 scale-105'
                  : isCompleted
                  ? 'text-slate-300'
                  : 'text-slate-500 group-hover:text-slate-300'
              }`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
