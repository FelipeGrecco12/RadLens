import { StatsCard } from '../components/StatsCard';
import { ExamsByPriorityChart } from '../components/Charts/ExamsByPriorityChart';
import { ExamsByStatusChart } from '../components/Charts/ExamsByStatusChart';
import { WorkflowChart } from '../components/Charts/WorkflowChart';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Exam } from '../types/database';

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalExams: 0,
    criticalPending: 0,
    urgentPending: 0,
    avgCompletionTime: 0,
    completedToday: 0,
    aiDetectedFindings: 0,
  });
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch exam counts by status
        const { data: examStats } = await supabase
          .from('exams')
          .select('status, priority, ai_analysis_complete, completed_at');

        if (examStats) {
          const pending = examStats.filter(
            (e) => e.status === 'uploaded' || e.status === 'ai_completed'
          );
          const critical = pending.filter((e) => e.priority === 'critical' || e.priority === 'stat');
          const urgent = pending.filter((e) => e.priority === 'urgent');

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const completedTodayCount = examStats.filter(
            (e) => e.completed_at && new Date(e.completed_at) >= today
          ).length;

          const aiFindings = examStats.filter((e) => e.ai_analysis_complete).length;

          setStats({
            totalExams: examStats.length,
            criticalPending: critical.length,
            urgentPending: urgent.length,
            avgCompletionTime: 45, // Mock value for now
            completedToday: completedTodayCount,
            aiDetectedFindings: aiFindings,
          });
        }

        // Fetch recent exams
        const { data: recent } = await supabase
          .from('exams')
          .select(
            `*, patient:patients(*), radiologist:profiles!exams_assigned_radiologist_id_fkey(*)`
          )
          .order('created_at', { ascending: false })
          .limit(5);

        if (recent) setRecentExams(recent);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'signed':
        return 'bg-green-100 text-green-700';
      case 'in_review':
      case 'reported':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name || 'Doctor'}</p>
        </div>
        <button
          onClick={() => navigate('/worklist')}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          View Worklist
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Exams"
          value={stats.totalExams}
          change={+12}
          changeLabel="vs last week"
          icon="scan"
          color="blue"
        />
        <StatsCard
          title="Critical Pending"
          value={stats.criticalPending}
          subtitle="Immediate attention required"
          icon="alert"
          color="red"
          highlight={stats.criticalPending > 0}
        />
        <StatsCard
          title="Urgent Pending"
          value={stats.urgentPending}
          subtitle="High priority exams"
          icon="clock"
          color="orange"
        />
        <StatsCard
          title="Completed Today"
          value={stats.completedToday}
          change={+8}
          changeLabel="vs yesterday"
          icon="check"
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Workflow Overview</h2>
          <WorkflowChart />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Exams by Priority</h2>
          <ExamsByPriorityChart />
        </div>
      </div>

      {/* Recent Exams & Status Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Exams</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Exam</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentExams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No exams found
                    </td>
                  </tr>
                ) : (
                  recentExams.map((exam) => (
                    <tr
                      key={exam.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/exam/${exam.id}`)}
                    >
                      <td className="py-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                            {exam.patient?.full_name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-800">
                              {exam.patient?.full_name}
                            </p>
                            <p className="text-xs text-gray-500">MRN: {exam.patient?.mrn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <p className="text-sm text-gray-800">{exam.exam_type}</p>
                        <p className="text-xs text-gray-500">{exam.body_part}</p>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
                            exam.priority
                          )}`}
                        >
                          {exam.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            exam.status
                          )}`}
                        >
                          {exam.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(exam.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h2>
          <ExamsByStatusChart />
        </div>
      </div>
    </div>
  );
}
