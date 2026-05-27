import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  BookmarkIcon,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Activity,
  ScanLine,
  Brain,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Exam, Finding, Report } from '../types/database';

export function ExamViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(1);
  const [totalImages] = useState(245);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [layout, setLayout] = useState<'single' | '2x2' | '1x2'>('single');
  const [showAIOverlay, setShowAIOverlay] = useState(true);
  const [showFindings, setShowFindings] = useState(true);
  const [playing, setPlaying] = useState(false);

  // Mock image URLs for display
  const mockImageUrls = [
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
  ];

  // Mock AI-detected findings overlay
  const mockFindingsOverlay = [
    {
      id: 1,
      x: 35,
      y: 30,
      width: 20,
      height: 15,
      type: 'suspicious',
      confidence: 0.92,
      label: 'Nodule - Right Upper Lobe',
    },
    {
      id: 2,
      x: 55,
      y: 45,
      width: 15,
      height: 12,
      type: 'critical',
      confidence: 0.95,
      label: 'Possible PE',
    },
    {
      id: 3,
      x: 25,
      y: 60,
      width: 10,
      height: 10,
      type: 'benign',
      confidence: 0.78,
      label: 'Calcification',
    },
  ];

  useEffect(() => {
    fetchExamData();
  }, [id]);

  async function fetchExamData() {
    try {
      const { data: examData } = await supabase
        .from('exams')
        .select(
          `*, patient:patients(*), radiologist:profiles!exams_assigned_radiologist_id_fkey(*)`
        )
        .eq('id', id)
        .maybeSingle();

      if (examData) {
        setExam(examData);

        const { data: findingsData } = await supabase
          .from('findings')
          .select('*')
          .eq('exam_id', id!);
        if (findingsData) setFindings(findingsData);

        const { data: reportData } = await supabase
          .from('reports')
          .select('*, radiologist:profiles(*)')
          .eq('exam_id', id!)
          .maybeSingle();
        if (reportData) setReport(reportData);
      }

      // Mock data if nothing returned
      if (!examData) {
        setExam({
          id: '1',
          patient_id: '1',
          accession_number: 'ACC-2024-001',
          exam_type: 'CT Scan',
          body_part: 'Chest',
          modality: 'CT',
          study_date: new Date().toISOString(),
          status: 'ai_completed',
          priority: 'critical',
          clinical_indication: 'Suspected pulmonary embolism with sudden onset dyspnea',
          ai_analysis_complete: true,
          ai_priority_score: 0.95,
          ai_findings_summary: 'Multiple findings detected including possible PE in right lower lobe pulmonary artery. Also noted small nodule in right upper lobe requiring follow-up.',
          image_count: 245,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient: {
            id: '1',
            mrn: 'MRN-001234',
            full_name: 'Maria Santos Silva',
            birth_date: '1965-03-15',
            gender: 'Female',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            age: 59,
          },
        });

        setFindings([
          {
            id: '1',
            exam_id: '1',
            finding_type: 'Nodule',
            location: 'Right Upper Lobe',
            laterality: 'Right',
            size_mm: 8,
            severity: 'suspicious',
            description: 'Spiculated nodule measuring 8mm in diameter with irregular margins',
            ai_confidence_score: 0.92,
            is_ai_detected: true,
            validated_by_radiologist: false,
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            exam_id: '1',
            finding_type: 'Pulmonary Embolism',
            location: 'Right Lower Lobe Pulmonary Artery',
            laterality: 'Right',
            severity: 'critical',
            description: 'Filling defect consistent with pulmonary embolism in segmental artery',
            ai_confidence_score: 0.95,
            is_ai_detected: true,
            validated_by_radiologist: false,
            created_at: new Date().toISOString(),
          },
          {
            id: '3',
            exam_id: '1',
            finding_type: 'Calcification',
            location: 'Right hilar region',
            laterality: 'Right',
            size_mm: 5,
            severity: 'benign',
            description: 'Calcified granuloma, likely sequela of prior infection',
            ai_confidence_score: 0.78,
            is_ai_detected: true,
            validated_by_radiologist: false,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
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

  const getFindingColor = (severity: string | undefined) => {
    switch (severity) {
      case 'malignant':
      case 'critical':
        return 'border-red-500 bg-red-500/10';
      case 'suspicious':
        return 'border-orange-500 bg-orange-500/10';
      case 'indeterminate':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'probably_benign':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-green-500 bg-green-500/10';
    }
  };

  const getOverlayColor = (type: string) => {
    switch (type) {
      case 'critical':
      case 'malignant':
        return 'border-red-500 bg-red-500/20';
      case 'suspicious':
        return 'border-orange-500 bg-orange-500/20';
      case 'indeterminate':
        return 'border-yellow-500 bg-yellow-500/20';
      default:
        return 'border-blue-500 bg-blue-500/20';
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(Math.max(50, Math.min(300, zoom + delta)));
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleExport = () => {
    console.log('Export images...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>Exam not found</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back to Worklist</span>
            </button>
            <div className="h-6 w-px bg-gray-600" />
            <div className="flex items-center gap-3">
              <div className="text-white">
                <span className="font-semibold">{exam.patient?.full_name}</span>
                <span className="text-gray-400 ml-2">({exam.patient?.mrn})</span>
              </div>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityColor(
                  exam.priority
                )}`}
              >
                {exam.priority.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIOverlay(!showAIOverlay)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showAIOverlay
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Brain className="w-4 h-4" />
              AI Findings
            </button>
            <button
              onClick={() => setShowFindings(!showFindings)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showFindings
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Activity className="w-4 h-4" />
              Details Panel
            </button>
          </div>

          <div className="flex items-center gap-3 text-gray-300">
            <span className="text-sm">{exam.exam_type}</span>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm">{exam.body_part}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image Viewer */}
        <div className="flex-1 flex flex-col bg-gray-950">
          {/* Image Controls */}
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoom(-10)}
                className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-300 w-16 text-center">{zoom}%</span>
              <button
                onClick={() => handleZoom(10)}
                className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-6 w-px bg-gray-600 mx-2" />
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="h-6 w-px bg-gray-600 mx-2" />
              <button
                onClick={() => setLayout('single')}
                className={`p-2 rounded transition-colors ${
                  layout === 'single' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout('1x2')}
                className={`p-2 rounded transition-colors ${
                  layout === '1x2' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <div className="w-4 h-4 flex gap-0.5">
                  <div className="w-1/2 h-full bg-current rounded-sm" />
                  <div className="w-1/2 h-full bg-current rounded-sm" />
                </div>
              </button>
              <button
                onClick={() => setLayout('2x2')}
                className={`p-2 rounded transition-colors ${
                  layout === '2x2' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-current rounded-sm" />
                  ))}
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentImage(Math.max(1, currentImage - 1))}
                className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-300 w-32 text-center">
                {currentImage} / {totalImages}
              </span>
              <button
                onClick={() => setCurrentImage(Math.min(totalImages, currentImage + 1))}
                className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPlaying(!playing)}
                className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors ml-2"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white text-sm transition-colors">
                <BookmarkIcon className="w-4 h-4" />
                Bookmark
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded text-white text-sm transition-colors"
              >
                Export
              </button>
            </div>
          </div>

          {/* Image Display Area */}
          <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
            <div
              className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
            >
              {/* Placeholder for medical image */}
              <div className="w-[800px] h-[600px] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-10">
                  <div className="w-full h-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)]" />
                </div>

                {/* Medical Image Simulation */}
                <div className="w-full h-full relative">
                  <img
                    src={mockImageUrls[0]}
                    alt="CT Scan"
                    className="w-full h-full object-cover opacity-30 grayscale"
                  />

                  {/* AI Findings Overlay */}
                  {showAIOverlay && (
                    <div className="absolute inset-0">
                      {mockFindingsOverlay.map((finding) => (
                        <div
                          key={finding.id}
                          className={`absolute border-2 rounded cursor-pointer transition-all hover:border-opacity-100 ${getOverlayColor(
                            finding.type
                          )}`}
                          style={{
                            left: `${finding.x}%`,
                            top: `${finding.y}%`,
                            width: `${finding.width}%`,
                            height: `${finding.height}%`,
                          }}
                          title={`${finding.label} (${(finding.confidence * 100).toFixed(0)}% confidence)`}
                        >
                          <div
                            className={`absolute -top-6 left-0 px-2 py-0.5 text-xs rounded text-white whitespace-nowrap ${
                              finding.type === 'critical'
                                ? 'bg-red-600'
                                : finding.type === 'suspicious'
                                ? 'bg-orange-600'
                                : 'bg-blue-600'
                            }`}
                          >
                            {finding.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patient Info Overlay */}
                <div className="absolute top-4 left-4 text-gray-400 text-xs">
                  <p>{exam.accession_number}</p>
                  <p>{new Date(exam.study_date).toLocaleDateString()}</p>
                </div>
                <div className="absolute bottom-4 right-4 text-gray-400 text-xs">
                  <p>W: 350 L: 50</p>
                  <p>{exam.modality}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Findings & Details */}
        {showFindings && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button className="flex-1 px-4 py-3 text-sm font-medium text-cyan-500 border-b-2 border-cyan-500">
                Findings
              </button>
              <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
                History
              </button>
              <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
                Report
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Patient Info */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {exam.patient?.full_name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{exam.patient?.full_name}</h3>
                    <p className="text-gray-400 text-sm">
                      {exam.patient?.gender}, {exam.patient?.age || 'N/A'} years
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">MRN:</span>
                    <span className="text-white">{exam.patient?.mrn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">DOB:</span>
                    <span className="text-white">
                      {exam.patient?.birth_date
                        ? new Date(exam.patient.birth_date).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinical Indication */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Clinical Indication
                </h4>
                <p className="text-white text-sm">{exam.clinical_indication}</p>
              </div>

              {/* AI Summary */}
              <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-cyan-500" />
                  <h4 className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                    AI Analysis Summary
                  </h4>
                </div>
                <p className="text-gray-200 text-sm">{exam.ai_findings_summary}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full"
                      style={{ width: `${(exam.ai_priority_score || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-cyan-400 text-sm font-medium">
                    {((exam.ai_priority_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Findings List */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Detected Findings ({findings.length})
                </h4>
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`border rounded-lg p-3 ${getFindingColor(finding.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">
                            {finding.finding_type}
                          </span>
                          {finding.is_ai_detected && (
                            <span className="px-1.5 py-0.5 bg-cyan-600/30 text-cyan-400 text-xs rounded">
                              AI
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-xs mt-0.5">
                          {finding.location}
                          {finding.laterality && ` - ${finding.laterality}`}
                        </p>
                      </div>
                      {finding.size_mm && (
                        <span className="text-gray-300 text-xs">{finding.size_mm}mm</span>
                      )}
                    </div>
                    <p className="text-gray-300 text-xs">{finding.description}</p>
                    {finding.ai_confidence_score && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-400">Confidence:</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-cyan-500 h-1.5 rounded-full"
                            style={{ width: `${finding.ai_confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-cyan-400">
                          {(finding.ai_confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button className="flex-1 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs rounded transition-colors">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Validate
                      </button>
                      <button className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors">
                        <X className="w-3 h-3 inline mr-1" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-700 p-4 space-y-2">
              <button
                onClick={() => navigate(`/exam/${id}/report`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                Create Report
              </button>
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Add Findings
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Compare
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
