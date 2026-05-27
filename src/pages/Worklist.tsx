import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Search, Clock, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Exam } from '../types/database';

export function Worklist() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    modality: 'all',
    search: '',
  });
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'ai_priority_score'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchExams();
  }, [filters, sortBy, sortOrder]);

  async function fetchExams() {
    try {
      let query = supabase
        .from('exams')
        .select(
          `*, patient:patients(*), radiologist:profiles!exams_assigned_radiologist_id_fkey(*)`
        )
        .not('status', 'in', '("delivered","pending_upload")');

      if (filters.status !== 'all' && filters.status !== 'pending_review') {
        query = query.eq('status', filters.status);
      } else if (filters.status === 'pending_review') {
        query = query.in('status', ['uploaded', 'ai_completed']);
      }

      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters.modality !== 'all') {
        query = query.eq('modality', filters.modality);
      }

      if (filters.search) {
        query = query.or(`accession_number.ilike.%${filters.search}%`);
      }

      query = query.order('priority', { ascending: true });
      query = query.order('ai_priority_score', { ascending: false });
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'urgent':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'stat' || priority === 'critical') {
      return <AlertTriangle className="w-3.5 h-3.5" />;
    } else if (priority === 'urgent') {
      return <Clock className="w-3.5 h-3.5" />;
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'reported':
        return 'bg-emerald-100 text-emerald-700';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'ai_processing':
        return 'bg-purple-100 text-purple-700';
      case 'ai_completed':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Mock data for display when database is empty
  const mockExams: Exam[] = [
    {
      id: '1',
      patient_id: '1',
      accession_number: 'ACC-2024-001',
      exam_type: 'CT Scan',
      body_part: 'Chest',
      modality: 'CT',
      study_date: new Date().toISOString(),
      status: 'ai_completed',
      priority: 'critical',
      clinical_indication: 'Suspected pulmonary embolism',
      ai_analysis_complete: true,
      ai_priority_score: 0.95,
      ai_findings_summary: 'Possible PE in right lower lobe',
      image_count: 245,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      patient: {
        id: '1',
        mrn: 'MRN-001',
        full_name: 'Maria Santos',
        birth_date: '1965-03-15',
        gender: 'Female',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    {
      id: '2',
      patient_id: '2',
      accession_number: 'ACC-2024-002',
      exam_type: 'MRI',
      body_part: 'Brain',
      modality: 'MRI',
      study_date: new Date().toISOString(),
      status: 'in_review',
      priority: 'urgent',
      clinical_indication: 'Headache with neurological symptoms',
      ai_analysis_complete: true,
      ai_priority_score: 0.78,
      ai_findings_summary: 'Small lesion in left temporal lobe',
      image_count: 120,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      patient: {
        id: '2',
        mrn: 'MRN-002',
        full_name: 'João Silva',
        birth_date: '1978-08-22',
        gender: 'Male',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    {
      id: '3',
      patient_id: '3',
      accession_number: 'ACC-2024-003',
      exam_type: 'X-Ray',
      body_part: 'Chest',
      modality: 'XR',
      study_date: new Date().toISOString(),
      status: 'uploaded',
      priority: 'routine',
      clinical_indication: 'Routine check-up',
      ai_analysis_complete: false,
      image_count: 2,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      patient: {
        id: '3',
        mrn: 'MRN-003',
        full_name: 'Ana Oliveira',
        birth_date: '1990-11-05',
        gender: 'Female',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  ];

  const displayExams = exams.length > 0 ? exams : mockExams;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Exam Worklist</h1>
          <p className="text-gray-500 mt-1">
            {displayExams.length} exam{displayExams.length !== 1 ? 's' : ''} requiring attention
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by accession number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="in_review">In Review</option>
              <option value="reported">Reported</option>
              <option value="signed">Signed</option>
            </select>

            <select
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="all">All Priority</option>
              <option value="stat">STAT</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>

            <select
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={filters.modality}
              onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
            >
              <option value="all">All Modalities</option>
              <option value="CT">CT</option>
              <option value="MRI">MRI</option>
              <option value="XR">X-Ray</option>
              <option value="US">Ultrasound</option>
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Exams Table */}
      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Analysis
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayExams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/exam/${exam.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
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
                          <p className="text-xs text-gray-400">
                            {exam.patient?.gender},{' '}
                            {exam.patient?.birth_date
                              ? `${Math.floor(
                                  (Date.now() - new Date(exam.patient.birth_date).getTime()) /
                                    365 /
                                    24 /
                                    60 /
                                    60 /
                                    1000
                                )}y`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{exam.exam_type}</p>
                        <p className="text-sm text-gray-500">{exam.body_part}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {exam.modality} • {exam.image_count} images
                        </p>
                        <p className="text-xs text-gray-400">
                          Acc: {exam.accession_number}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(
                          exam.priority
                        )}`}
                      >
                        {getPriorityIcon(exam.priority)}
                        {exam.priority.toUpperCase()}
                      </span>
                      {exam.ai_priority_score && (
                        <p className="text-xs text-gray-400 mt-1">
                          AI Score: {(exam.ai_priority_score * 100).toFixed(0)}%
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          exam.status
                        )}`}
                      >
                        {formatStatus(exam.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {exam.ai_analysis_complete ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-gray-600">Complete</span>
                        </div>
                      ) : exam.status === 'ai_processing' ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                          <span className="text-xs text-gray-600">Processing</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                      {exam.ai_findings_summary && (
                        <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {exam.ai_findings_summary}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{formatDate(exam.created_at)}</p>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/exam/${exam.id}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
