"use client";

import React from "react";
import { Risk } from "@/services/risks";
import { cn } from "@/utils/cn";

interface RiskHeatMapProps {
  risks: Risk[];
  selectedCell: { likelihood: number; impact: number } | null;
  onCellClick: (cell: { likelihood: number; impact: number } | null) => void;
}

export const RiskHeatMap: React.FC<RiskHeatMapProps> = ({
  risks,
  selectedCell,
  onCellClick,
}) => {
  const likelihoods = [5, 4, 3, 2, 1];
  const impacts = [1, 2, 3, 4, 5];

  // Helper to resolve cell severity class
  const getCellSeverityStyles = (l: number, i: number, isSelected: boolean) => {
    const score = l * i;
    let base = "";
    if (score >= 16) {
      base = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20";
    } else if (score >= 11) {
      base = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20";
    } else if (score >= 6) {
      base = "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20";
    } else {
      base = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20";
    }

    return cn(
      "border p-4 rounded flex flex-col items-center justify-center cursor-pointer transition-all relative group h-16 md:h-20 min-w-16 md:min-w-20",
      base,
      isSelected && "ring-2 ring-primary dark:ring-white ring-offset-2 dark:ring-offset-slate-950 font-bold z-10 shadow-md scale-105"
    );
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 mb-4 flex items-center justify-between">
        <span>5x5 Risk Heat Map</span>
        {selectedCell && (
          <button
            onClick={() => onCellClick(null)}
            className="text-body-sm text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 underline font-normal"
          >
            Clear Filter (L: {selectedCell.likelihood}, I: {selectedCell.impact})
          </button>
        )}
      </h3>

      <div className="flex flex-col items-center select-none">
        {/* Heat Map Main Wrapper */}
        <div className="flex w-full max-w-xl">
          {/* Y Axis Label (Likelihood) */}
          <div className="flex items-center justify-center pr-2">
            <span className="text-label-caps text-secondary dark:text-slate-400 font-bold uppercase tracking-wider origin-center -rotate-90 whitespace-nowrap">
              Likelihood
            </span>
          </div>

          <div className="flex-1">
            {/* Grid Container */}
            <div className="grid grid-cols-6 gap-2">
              {/* Row: Likelihood 5 down to 1 */}
              {likelihoods.map((l) => {
                const cellKey = `row-${l}`;
                return (
                  <React.Fragment key={cellKey}>
                    {/* Y-Axis scale label */}
                    <div className="flex items-center justify-end pr-2 text-body-sm font-bold text-secondary dark:text-slate-400">
                      {l}
                    </div>

                    {/* Impact Columns 1 to 5 */}
                    {impacts.map((i) => {
                      const cellRisks = risks.filter(
                        (r) => r.likelihood === l && r.impact === i
                      );
                      const isSelected =
                        selectedCell?.likelihood === l && selectedCell?.impact === i;

                      return (
                        <div
                          key={`${l}-${i}`}
                          onClick={() =>
                            onCellClick(isSelected ? null : { likelihood: l, impact: i })
                          }
                          className={getCellSeverityStyles(l, i, isSelected)}
                          role="button"
                          aria-label={`Likelihood ${l}, Impact ${i}. Contains ${cellRisks.length} risks.`}
                        >
                          <span className="text-headline-md font-bold leading-none">
                            {cellRisks.length}
                          </span>
                          <span className="text-[10px] opacity-75 mt-1 font-mono text-data-mono">
                            S:{l * i}
                          </span>

                          {/* Hover Tooltip (absolute positioning CSS-based) */}
                          <div className="absolute hidden group-hover:block z-50 bg-slate-950 text-white text-body-sm rounded p-3 shadow-xl w-64 -top-4 left-full ml-3 border border-slate-800 pointer-events-none text-left">
                            <div className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 flex items-center justify-between">
                              <span>Cell Score: {l * i}</span>
                              <span className="text-[10px] font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                L:{l} I:{i}
                              </span>
                            </div>
                            {cellRisks.length > 0 ? (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {cellRisks.map((r) => (
                                  <div key={r.risk_id} className="text-body-sm truncate border-l-2 border-primary pl-1.5">
                                    <span className="font-bold text-slate-300 font-mono">
                                      {r.risk_id}
                                    </span>
                                    : {r.asset} - {r.threat}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">No risks registered</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Empty corner cell */}
              <div></div>
              {/* X Axis scale labels */}
              {impacts.map((i) => (
                <div
                  key={`scale-x-${i}`}
                  className="text-center font-bold text-body-sm text-secondary dark:text-slate-400 pt-1"
                >
                  {i}
                </div>
              ))}
            </div>

            {/* X Axis Label (Impact) */}
            <div className="text-center mt-3">
              <span className="text-label-caps text-secondary dark:text-slate-400 font-bold uppercase tracking-wider">
                Impact
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
