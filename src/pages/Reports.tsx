import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Eye, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Report, Exam } from '../types/database';

interface ReportWithExam extends Report {
  exam?: Exam;
}

export function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'preliminary' | 'signed'>('all');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  async function fetchReports() {
    try {
      let query = supabase
        .from('reports')
        .select(`*, exam:exams(*, patient:patients(*))`)
        .order('created_at', { ascending: false });

      if (filter === 'preliminary') {
        query = query.eq('is_preliminary', true).eq('is_signed', false);
      } else if (filter === 'signed') {
        query = query.eq('is_signed', true);
      }

      const { data } = await query;
      if (data) setReports(data);
      else {
        // Mock data
        setReports([
          {
            id: '1',
            exam_id: '1',
            radiologist_id: '1',
            findings_text: 'Findings text for exam 1...',
            impression: 'Impression for exam 1',
            recommendations: 'Follow-up in 3 months',
            classification_system: 'Lung-RADS',
            classification_code: '4B',
            is_preliminary: false,
            is_signed: true,
            signed_at: new Date().toISOString(),
            ai_suggestions_used: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            exam: {
              id: '1',
              patient_id: '1',
              accession_number: 'ACC-2024-001',
              exam_type: 'CT Scan',
              body_part: 'Chest',
              modality: 'CT',
              study_date: new Date().toISOString(),
              status: 'signed',
              priority: 'critical',
              ai_analysis_complete: true,
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
            } as Exam,
          } as ReportWithExam,
          {
            id: '2',
            exam_id: '2',
            radiologist_id: '1',
            findings_text: 'Findings text for exam 2...',
            impression: 'Impression for exam 2',
            is_preliminary: true,
            is_signed: false,
            ai_suggestions_used: true,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
            exam: {
              id: '2',
              patient_id: '2',
              accession_number: 'ACC-2024-002',
              exam_type: 'MRI',
              body_part: 'Brain',
              modality: 'MRI',
              study_date: new Date().toISOString(),
              status: 'reported',
              priority: 'urgent',
              ai_analysis_complete: true,
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
            } as Exam,
          } as ReportWithExam,
        ]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredReports = reports.filter((report) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      report.exam?.patient?.full_name.toLowerCase().includes(searchLower) ||
      report.exam?.accession_number.toLowerCase().includes(searchLower)
    );
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat':
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'urgent':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 mt-1">
            View and manage medical reports
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name or accession number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All Reports</option>
            <option value="preliminary">Preliminary</option>
            <option value="signed">Signed</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800">No reports found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/exam/${report.exam_id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">
                        {report.exam?.patient?.full_name}
                      </h3>
                      {report.is_signed ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Signed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Preliminary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {report.exam?.exam_type} - {report.exam?.body_part}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{report.exam?.modality}</span>
                      <span>•</span>
                      <span>Acc: {report.exam?.accession_number}</span>
                      {report.classification_system && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-600">
                            {report.classification_system}: {report.classification_code}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(
                      report.exam?.priority || 'routine'
                    )}`}
                  >
                    {(report.exam?.priority || 'routine').toUpperCase()}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Impression:</span>{' '}
                  {report.impression.slice(0, 150)}
                  {report.impression.length > 150 ? '...' : ''}
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/exam/${report.exam_id}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
