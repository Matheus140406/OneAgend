'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ReportStats } from '@/lib/reports/stats';
import { formatPriceFromCents } from '@/lib/utils';

const ACCENT = '#22d3a8';
const AXIS_COLOR = '#6b7385';
const GRID_COLOR = 'rgba(255,255,255,0.06)';

const tooltipStyle = {
  backgroundColor: '#0f1117',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  fontSize: 12,
  color: '#f1f3f9',
};

export function AppointmentsByMonthChart({ data }: { data: ReportStats['appointmentsByMonth'] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="appointmentsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCENT} stopOpacity={0.4} />
            <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f1f3f9' }} />
        <Area type="monotone" dataKey="count" name="Agendamentos" stroke={ACCENT} fill="url(#appointmentsFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueByMonthChart({ data }: { data: ReportStats['revenueByMonth'] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data.map((d) => ({ ...d, revenue: d.revenueCents / 100 }))}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#f1f3f9' }}
          formatter={(value) => [formatPriceFromCents(Math.round(Number(value ?? 0) * 100)), 'Receita']}
        />
        <Bar dataKey="revenue" name="Receita" fill={ACCENT} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AppointmentsByServiceChart({ data }: { data: ReportStats['appointmentsByService'] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
        <XAxis type="number" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="service" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} width={120} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f1f3f9' }} />
        <Bar dataKey="count" name="Agendamentos" fill={ACCENT} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
