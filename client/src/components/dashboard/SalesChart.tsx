import { useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChartData } from "@/types";
import { formatLargeNumber, formatCurrency, formatPercentageChange } from "@/utils/formatting";

interface SalesChartProps {
  data: ChartData[];
  totalSales: number;
  avgOrder: number;
  salesGrowth: number;
  avgOrderGrowth: number;
  loading?: boolean;
}

export default function SalesChart({
  data,
  totalSales,
  avgOrder,
  salesGrowth,
  avgOrderGrowth,
  loading = false
}: SalesChartProps) {
  const [period, setPeriod] = useState<string>("month");

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriod(e.target.value);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        <div className="p-6 border-b dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-white">Sales Overview</h3>
            <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
      <div className="p-6 border-b dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-white">Sales Overview</h3>
          <div className="flex items-center space-x-2">
            <select
              value={period}
              onChange={handlePeriodChange}
              className="form-select py-1 px-2 text-xs rounded border-slate-200 dark:border-slate-600 dark:bg-slate-700"
            >
              <option value="month">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="quarter">Last 3 Months</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <YAxis
                tickFormatter={(value) => `₹${value / 100000}L`}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), "Sales"]}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Bar
                dataKey="value"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="text-primary-500 dark:text-primary-400"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Sales</div>
            <div className="font-semibold text-lg text-slate-800 dark:text-white font-mono">
              {formatLargeNumber(totalSales)}
            </div>
            <div className={`text-xs mt-1 flex items-center ${salesGrowth >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
              <i className={`ri-arrow-${salesGrowth >= 0 ? 'up' : 'down'}-line mr-1`}></i>
              {formatPercentageChange(salesGrowth)} growth
            </div>
          </div>
          
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg. Order</div>
            <div className="font-semibold text-lg text-slate-800 dark:text-white font-mono">
              {formatLargeNumber(avgOrder)}
            </div>
            <div className={`text-xs mt-1 flex items-center ${avgOrderGrowth >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
              <i className={`ri-arrow-${avgOrderGrowth >= 0 ? 'up' : 'down'}-line mr-1`}></i>
              {formatPercentageChange(avgOrderGrowth)} {avgOrderGrowth >= 0 ? 'growth' : 'drop'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
