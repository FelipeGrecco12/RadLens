import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PriorityData {
  priority: string;
  count: number;
  color: string;
}

export function ExamsByPriorityChart() {
  const [data, setData] = useState<PriorityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: exams } = await supabase.from('exams').select('priority');

      if (exams) {
        const counts: Record<string, number> = {};
        exams.forEach((e) => {
          counts[e.priority] = (counts[e.priority] || 0) + 1;
        });

        const priorityColors: Record<string, string> = {
          stat: '#dc2626',
          critical: '#ea580c',
          urgent: '#f59e0b',
          routine: '#3b82f6',
        };

        const chartData = Object.entries(counts).map(([priority, count]) => ({
          priority: priority.charAt(0).toUpperCase() + priority.slice(1),
          count,
          color: priorityColors[priority] || '#64748b',
        }));

        setData(chartData);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Donut Chart Visualization */}
      <div className="relative w-40 h-40 mx-auto">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.count / total) * 100;
            const strokeDasharray = `${percentage} ${100 - percentage}`;
            const strokeDashoffset = data
              .slice(0, index)
              .reduce((sum, d) => sum + (d.count / total) * 100, 0);

            return (
              <circle
                key={item.priority}
                cx="18"
                cy="18"
                r="15.9"
                fill="transparent"
                stroke={item.color}
                strokeWidth="3"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={-strokeDashoffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.priority} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-gray-600">{item.priority}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">{item.count}</span>
              <span className="text-xs text-gray-400">
                ({((item.count / total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
