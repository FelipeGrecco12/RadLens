import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface StatusData {
  status: string;
  count: number;
}

export function ExamsByStatusChart() {
  const [data, setData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: exams } = await supabase.from('exams').select('status');

      if (exams) {
        const counts: Record<string, number> = {};
        exams.forEach((e) => {
          counts[e.status] = (counts[e.status] || 0) + 1;
        });

        const chartData = Object.entries(counts)
          .map(([status, count]) => ({
            status: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            count,
          }))
          .sort((a, b) => b.count - a.count);

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
    <div className="space-y-3">
      {data.map((item) => {
        const percentage = (item.count / total) * 100;
        return (
          <div key={item.status}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">{item.status}</span>
              <span className="text-sm font-semibold text-gray-800">{item.count}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
