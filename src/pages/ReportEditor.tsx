import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  Copy,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
  User,
  Calendar,
  Building,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Exam } from '../types/database';

export function ReportEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState({
    findings: '',
    impression: '',
    recommendations: '',
    classification_system: '',
    classification_code: '',
  });
  const [aiSuggestions, setAiSuggestions] = useState({
    findings: '',
    impression: '',
    classifications: [] as string[],
  });
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);

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

        // Fetch existing report
        const { data: reportData } = await supabase
          .from('reports')
          .select('*')
          .eq('exam_id', id!)
          .maybeSingle();

        if (reportData) {
          setReport({
            findings: reportData.findings_text || '',
            impression: reportData.impression || '',
            recommendations: reportData.recommendations || '',
            classification_system: reportData.classification_system || '',
            classification_code: reportData.classification_code || '',
          });
        } else {
          // Load AI suggestions if available
          if (examData.ai_findings_summary) {
            setAiSuggestions({
              findings: generateAiFindings(examData),
              impression: generateAiImpression(examData),
              classifications: generateClassifications(examData),
            });
          }
        }
      } else {
        // Mock data
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
          ai_findings_summary:
            'Multiple findings detected including possible PE in right lower lobe pulmonary artery. Also noted small nodule in right upper lobe requiring follow-up.',
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
          },
        });

        setAiSuggestions({
          findings: `FINDINGS:

CHEST:
- Pulmonary arteries: Filling defect identified in the right lower lobe pulmonary artery, consistent with segmental pulmonary embolism.
- Lung parenchyma: Small spiculated nodule in the right upper lobe measuring approximately 8mm with irregular margins. No other pulmonary nodules identified.
- Pleural spaces: No pleural effusion or pneumothorax.
- Mediastinum: Normal in size. No lymphadenopathy.
- Heart: Normal size. No pericardial effusion.
- Chest wall: Unremarkable.
- Bones: No lytic or blastic lesions identified.

UPPER ABDOMEN:
- Liver: Normal in size. No focal lesions.
- Spleen: Normal in size.
- Adrenal glands: Unremarkable.
- Kidneys: Normal in size bilaterally. No focal lesions or hydronephrosis.`,
          impression: `IMPRESSION:

1. Segmental pulmonary embolism in the right lower lobe pulmonary artery. Clinical correlation recommended. Consider anticoagulation therapy per clinical guidelines.

2. Spiculated nodule in the right upper lobe (8mm) - suspicious for malignancy. Recommend follow-up CT in 3 months or PET-CT for further characterization.

3. No other acute abnormalities identified.`,
          classifications: [
            'TI-RADS: 4 (Suspicious) - Recommend FNA',
            'Lung-RADS: 4B (Suspicious) - Recommend PET-CT or tissue diagnosis',
            'Chest CT for PE: Positive',
          ],
        });

        setReport({
          findings: '',
          impression: '',
          recommendations: 'Consider anticoagulation therapy per clinical guidelines. Follow-up CT chest in 3 months for nodule surveillance.',
          classification_system: 'Lung-RADS',
          classification_code: '4B',
        });
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateAiFindings(exam: Exam): string {
    return `AI-Generated Findings based on analysis of ${exam.image_count} images...

The following findings were detected with high confidence:
${exam.ai_findings_summary || 'No specific findings detected.'}`;
  }

  function generateAiImpression(exam: Exam): string {
    return `Preliminary impression based on AI analysis. Please review and modify as needed.

Priority findings require immediate clinical attention.`;
  }

  function generateClassifications(exam: Exam): string[] {
    const classifications: string[] = [];
    if (exam.body_part.toLowerCase().includes('lung') || exam.body_part.toLowerCase().includes('chest')) {
      classifications.push('Lung-RADS: Category to be determined');
    }
    if (exam.body_part.toLowerCase().includes('thyroid')) {
      classifications.push('TI-RADS: Category to be determined');
    }
    if (exam.body_part.toLowerCase().includes('liver')) {
      classifications.push('LI-RADS: Category to be determined');
    }
    if (exam.body_part.toLowerCase().includes('prostate')) {
      classifications.push('PI-RADS: Category to be determined');
    }
    return classifications;
  }

  const handleApplySuggestion = (field: 'findings' | 'impression', suggestion: string) => {
    setReport((prev) => ({
      ...prev,
      [field]: suggestion,
    }));
  };

  const handleSave = async (isPreliminary: boolean = true) => {
    setSaving(true);
    try {
      const reportData = {
        exam_id: id,
        radiologist_id: (await supabase.auth.getUser()).data.user?.id,
        findings_text: report.findings,
        impression: report.impression,
        recommendations: report.recommendations || null,
        classification_system: report.classification_system || null,
        classification_code: report.classification_code || null,
        is_preliminary: isPreliminary,
        is_signed: false,
        ai_suggestions_used: Object.values(aiSuggestions).some(
          (s) => typeof s === 'string' && (report.findings.includes(s) || report.impression.includes(s))
        ),
      };

      const { error } = await supabase.from('reports').insert(reportData);

      if (error) throw error;

      // Update exam status
      await supabase
        .from('exams')
        .update({ status: isPreliminary ? 'reported' : 'in_review' })
        .eq('id', id);

      alert('Report saved successfully');
      navigate('/worklist');
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Exam not found
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Report Editor</h1>
            <p className="text-sm text-gray-500">
              {exam.accession_number} • {exam.exam_type} • {exam.body_part}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !report.findings || !report.impression}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Submit Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Report Form */}
        <div className="col-span-2 space-y-6">
          {/* Patient Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-semibold">
                  {exam.patient?.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {exam.patient?.full_name}
                  </h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {exam.patient?.gender}, {exam.patient?.age || 'N/A'} years
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {exam.patient?.birth_date
                        ? new Date(exam.patient.birth_date).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>MRN: {exam.patient?.mrn}</span>
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(
                  exam.priority
                )}`}
              >
                {exam.priority.toUpperCase()}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Clinical Indication</h3>
              <p className="text-sm text-gray-600">{exam.clinical_indication}</p>
            </div>
          </div>

          {/* Findings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Findings</h3>
              <button
                onClick={() => setShowAiSuggestions(!showAiSuggestions)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  showAiSuggestions
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Suggestions
              </button>
            </div>

            {showAiSuggestions && aiSuggestions.findings && (
              <div className="mb-4 bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-cyan-600 font-medium mb-1">
                        AI-Generated Findings
                      </p>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {aiSuggestions.findings.slice(0, 300)}...
                      </pre>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplySuggestion('findings', aiSuggestions.findings)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Apply
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={report.findings}
              onChange={(e) => setReport({ ...report, findings: e.target.value })}
              className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none font-sans"
              placeholder="Enter detailed findings..."
            />
          </div>

          {/* Impression Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Impression</h3>
            </div>

            {showAiSuggestions && aiSuggestions.impression && (
              <div className="mb-4 bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-cyan-600 font-medium mb-1">
                        AI-Generated Impression
                      </p>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {aiSuggestions.impression}
                      </pre>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplySuggestion('impression', aiSuggestions.impression)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Apply
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={report.impression}
              onChange={(e) => setReport({ ...report, impression: e.target.value })}
              className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none font-sans"
              placeholder="Enter impression..."
            />
          </div>

          {/* Recommendations Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recommendations</h3>
            <textarea
              value={report.recommendations}
              onChange={(e) => setReport({ ...report, recommendations: e.target.value })}
              className="w-full h-24 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none font-sans"
              placeholder="Enter recommendations..."
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Classification */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Classification</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Classification System</label>
                <select
                  value={report.classification_system}
                  onChange={(e) => setReport({ ...report, classification_system: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="BI-RADS">BI-RADS (Breast)</option>
                  <option value="Lung-RADS">Lung-RADS (Lung)</option>
                  <option value="PI-RADS">PI-RADS (Prostate)</option>
                  <option value="TI-RADS">TI-RADS (Thyroid)</option>
                  <option value="LI-RADS">LI-RADS (Liver)</option>
                </select>
              </div>
              {report.classification_system && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select
                    value={report.classification_code}
                    onChange={(e) =>
                      setReport({ ...report, classification_code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  >
                    {report.classification_system === 'Lung-RADS' && (
                      <>
                        <option value="1">Category 1 - Negative</option>
                        <option value="2">Category 2 - Benign</option>
                        <option value="3">Category 3 - Probably Benign</option>
                        <option value="4A">Category 4A - Low Suspicion</option>
                        <option value="4B">Category 4B - Moderate Suspicion</option>
                        <option value="4X">Category 4X - High Suspicion</option>
                        <option value="5">Category 5 - Highly Suspicious</option>
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>

            {aiSuggestions.classifications.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Suggested Classifications:</p>
                {aiSuggestions.classifications.map((cls, i) => (
                  <div key={i} className="text-sm text-cyan-600 mb-1">
                    {cls}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Detected Findings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-semibold text-gray-800">AI Detected Findings</h3>
            </div>
            <div className="space-y-3">
              {exam.ai_findings_summary
                ?.split('.')
                .filter((s) => s.trim())
                .map((finding, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{finding.trim()}.</p>
                  </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Priority Score</span>
                <span className="font-semibold text-cyan-600">
                  {((exam.ai_priority_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Exam Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Exam Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Modality</span>
                <span className="text-gray-800">{exam.modality}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Body Part</span>
                <span className="text-gray-800">{exam.body_part}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Image Count</span>
                <span className="text-gray-800">{exam.image_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Study Date</span>
                <span className="text-gray-800">
                  {new Date(exam.study_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
