import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

interface ComplianceFrameworkData {
  name: string;
  complianceScore: number;
  implemented: number;
  total: number;
}

interface ComplianceBarChartProps {
  data: ComplianceFrameworkData[];
  scoreLabel: string;
}

export default function ComplianceBarChartComponent({ data, scoreLabel }: ComplianceBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
        <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(148, 163, 184, 0.05)" }}
          contentStyle={{
            background: "#0F172A",
            border: "none",
            borderRadius: "8px",
            color: "#F8FAFC",
            fontSize: "12px",
          }}
        />
        <Legend verticalAlign="top" height={36} iconType="circle" fontSize={12} />
        <Bar
          dataKey="complianceScore"
          name={scoreLabel}
          fill="#6366F1"
          radius={[4, 4, 0, 0]}
          barSize={40}
        >
          {data.map((entry, idx) => {
            const score = entry.complianceScore;
            return (
              <Cell
                key={`cell-${idx}`}
                fill={score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444"}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
