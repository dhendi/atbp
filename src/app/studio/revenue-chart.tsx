"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatPeso } from "@/lib/utils";

export function RevenueChart({ data, dataKey, valueLabel = "gmv" }: { data: Record<string, number | string>[]; dataKey: string; valueLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6c3bfa" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6c3bfa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeedf2" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8d89a1" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8d89a1" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `₱${v}`} />
        <Tooltip formatter={(value) => [formatPeso(Number(value ?? 0)), valueLabel]} contentStyle={{ borderRadius: 12, border: "1px solid #eeedf2", fontSize: 12 }} />
        <Area type="monotone" dataKey={dataKey} stroke="#6c3bfa" strokeWidth={2} fill="url(#revFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
