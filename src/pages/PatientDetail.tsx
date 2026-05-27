import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Eye,
  Plus,
  Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient, Exam, Report } from '../types/database';

interface PatientDetail extends Patient {
  exams?: (Exam & { report?: Report })[];
  age?: number;
}

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  async function fetchPatientData() {
    try {
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (patientData) {
        const { data: examsData } = await supabase
          .from('exams')
          .select('*, report:reports(*)')
          .eq('patient_id', id!)
          .order('created_at', { ascending: false });

        const age = patientData.birth_date
          ? Math.floor(
              (Date.now() - new Date(patientData.birth_date).getTime()) /
                365 /
                24 /
                60 /
                60 /
                1000
            )
          : undefined;

        setPatient({
          ...patientData,
          exams: examsData || [],
          age,
        });
      } else {
        // Mock data
        setPatient({
          id: '1',
          mrn: 'MRN-001234',
          full_name: 'Maria Santos Silva',
          birth_date: '1965-03-15',
          gender: 'Female',
          phone: '+55 11 98765-4321',
          email: 'maria.santos@email.com',
          age: 59,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          exams: [
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
              image_count: 245,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '2',
              patient_id: '1',
              accession_number: 'ACC-2024-002',
              exam_type: 'X-Ray',
              body_part: 'Chest',
              modality: 'XR',
              study_date: new Date(Date.now() - 2592000000).toISOString(),
              status: 'delivered',
              priority: 'routine',
              clinical_indication: 'Routine check-up',
              ai_analysis_complete: true,
              image_count: 2,
              created_at: new Date(Date.now() - 2592000000).toISOString(),
              updated_at: new Date(Date.now() - 2592000000).toISOString(),
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
    } finally {
      setLoading(false);
    }
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'reported':
        return 'bg-emerald-100 text-emerald-700';
      case 'in_review':
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

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Patient not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-semibold">
              {patient.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{patient.full_name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {patient.gender}, {patient.age} years
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(patient.birth_date!).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  MRN: {patient.mrn}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/patient/${id}/exam/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Exam
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          {patient.phone && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-800">{patient.phone}</p>
              </div>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-800">{patient.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Exam</p>
              <p className="text-sm font-medium text-gray-800">
                {patient.exams && patient.exams.length > 0
                  ? new Date(patient.exams[0].created_at).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Exam History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Exam History</h2>
          <p className="text-sm text-gray-500 mt-1">
            {patient.exams?.length || 0} exam{(patient.exams?.length || 0) !== 1 ? 's' : ''} on record
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {patient.exams && patient.exams.length > 0 ? (
            patient.exams.map((exam) => (
              <div
                key={exam.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/exam/${exam.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{exam.exam_type}</h3>
                      <p className="text-sm text-gray-500">{exam.body_part}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{exam.modality}</span>
                        <span>•</span>
                        <span>{exam.image_count} images</span>
                        <span>•</span>
                        <span>Acc: {exam.accession_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(
                          exam.priority
                        )}`}
                      >
                        {exam.priority.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                          exam.status
                        )}`}
                      >
                        {exam.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(exam.study_date).toLocaleDateString()}
                    </p>
                    {exam.clinical_indication && (
                      <p className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                        {exam.clinical_indication}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No exams on record</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
