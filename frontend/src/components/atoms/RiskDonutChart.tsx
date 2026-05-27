import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

interface RiskSeverityData {
  name: string;
  rawName: string;
  value: number;
}

interface RiskDonutChartProps {
  data: RiskSeverityData[];
  getSeverityColor: (severity: string) => string;
}

export default function RiskDonutChartComponent({ data, getSeverityColor }: RiskDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={75}
          paddingAngle={4}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getSeverityColor(entry.rawName)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#0F172A",
            border: "none",
            borderRadius: "8px",
            color: "#F8FAFC",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
