import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, Clock, FileText, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient, Exam } from '../types/database';

interface PatientWithExams extends Patient {
  exams?: Exam[];
  exam_count?: number;
  last_exam_date?: string;
}

export function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientWithExams[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    try {
      const { data: patientsData } = await supabase.from('patients').select('*').order('full_name');

      if (patientsData && patientsData.length > 0) {
        // Fetch exams for each patient
        const patientIds = patientsData.map((p) => p.id);
        const { data: examsData } = await supabase
          .from('exams')
          .select('*')
          .in('patient_id', patientIds);

        const patientsWithExams = patientsData.map((patient) => {
          const patientExams = examsData?.filter((e) => e.patient_id === patient.id) || [];
          return {
            ...patient,
            exams: patientExams,
            exam_count: patientExams.length,
            last_exam_date: patientExams[0]?.created_at || null,
          };
        });

        setPatients(patientsWithExams);
      } else {
        // Mock data
        setPatients([
          {
            id: '1',
            mrn: 'MRN-001234',
            full_name: 'Maria Santos Silva',
            birth_date: '1965-03-15',
            gender: 'Female',
            phone: '+55 11 98765-4321',
            email: 'maria.santos@email.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            exam_count: 3,
            last_exam_date: new Date().toISOString(),
          },
          {
            id: '2',
            mrn: 'MRN-002345',
            full_name: 'João Carlos de Oliveira',
            birth_date: '1978-08-22',
            gender: 'Male',
            phone: '+55 11 91234-5678',
            email: 'joao.oliveira@email.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            exam_count: 2,
            last_exam_date: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '3',
            mrn: 'MRN-003456',
            full_name: 'Ana Paula Ferreira',
            birth_date: '1990-11-05',
            gender: 'Female',
            phone: '+55 11 92345-6789',
            email: 'ana.ferreira@email.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            exam_count: 1,
            last_exam_date: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: '4',
            mrn: 'MRN-004567',
            full_name: 'Carlos Eduardo Santos',
            birth_date: '1955-06-18',
            gender: 'Male',
            phone: '+55 11 93456-7890',
            email: 'carlos.santos@email.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            exam_count: 5,
            last_exam_date: new Date(Date.now() - 259200000).toISOString(),
          },
          {
            id: '5',
            mrn: 'MRN-005678',
            full_name: 'Fernanda Lima Costa',
            birth_date: '1982-04-30',
            gender: 'Female',
            phone: '+55 11 94567-8901',
            email: 'fernanda.costa@email.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            exam_count: 2,
            last_exam_date: new Date(Date.now() - 345600000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredPatients = patients.filter((patient) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      patient.full_name.toLowerCase().includes(searchLower) ||
      patient.mrn.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Patients</h1>
          <p className="text-gray-500 mt-1">
            Manage patient records and exam history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or MRN..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800">No patients found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
                    {patient.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-800 truncate">
                      {patient.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {patient.gender}, {calculateAge(patient.birth_date!) } years
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      MRN: {patient.mrn}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                      DOB:{' '}
                      {patient.birth_date
                        ? new Date(patient.birth_date).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  {patient.last_exam_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>
                        Last Exam:{' '}
                        {new Date(patient.last_exam_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <span className="text-sm font-medium text-gray-800">
                      {patient.exam_count} exam{patient.exam_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/patient/${patient.id}/exam/new`)}
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  New Exam
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-800">
                  View History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
