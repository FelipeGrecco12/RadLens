import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIAnalysisRequest {
  exam_id: string;
  findings: FindingData[];
  priority_score: number;
  summary: string;
  metadata?: Record<string, any>;
}

interface FindingData {
  finding_type: string;
  location: string;
  laterality?: string;
  size_mm?: number;
  severity: 'benign' | 'probably_benign' | 'indeterminate' | 'suspicious' | 'malignant';
  description: string;
  confidence_score: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const url = new URL(req.url);
    const path = url.pathname.replace("/functions/v1/ai-analysis", "");

    // POST /ai-analysis - Receive AI analysis results (webhook from AI service)
    if (req.method === "POST" && (path === "" || path === "/")) {
      const body: AIAnalysisRequest = await req.json();

      if (!body.exam_id || !body.findings) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: exam_id, findings" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify exam exists
      const { data: exam, error: examError } = await supabaseClient
        .from("exams")
        .select("*, patient:patients(*)")
        .eq("id", body.exam_id)
        .single();

      if (examError || !exam) {
        return new Response(
          JSON.stringify({ error: "Exam not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine new priority based on AI score
      let newPriority = exam.priority;
      if (body.priority_score >= 0.85) {
        newPriority = "critical";
      } else if (body.priority_score >= 0.70) {
        newPriority = "urgent";
      }

      // Update exam with AI results
      const { error: updateError } = await supabaseClient
        .from("exams")
        .update({
          ai_analysis_complete: true,
          ai_priority_score: body.priority_score,
          ai_findings_summary: body.summary,
          priority: newPriority,
          status: "ai_completed",
        })
        .eq("id", body.exam_id);

      if (updateError) throw updateError;

      // Insert findings
      const findingsData = body.findings.map((finding) => ({
        exam_id: body.exam_id,
        finding_type: finding.finding_type,
        location: finding.location,
        laterality: finding.laterality,
        size_mm: finding.size_mm,
        severity: finding.severity,
        description: finding.description,
        ai_confidence_score: finding.confidence_score,
        is_ai_detected: true,
        validated_by_radiologist: false,
      }));

      const { data: insertedFindings, error: findingsError } = await supabaseClient
        .from("findings")
        .insert(findingsData)
        .select();

      if (findingsError) throw findingsError;

      // Create notifications for critical findings
      const criticalFindings = body.findings.filter(
        (f) => f.severity === "malignant" || f.severity === "suspicious"
      );

      if (criticalFindings.length > 0 || newPriority === "critical") {
        // Get all radiologists to notify
        const { data: radiologists } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("role", "radiologist")
          .eq("is_active", true);

        if (radiologists && radiologists.length > 0) {
          const notifications = radiologists.map((rad) => ({
            user_id: rad.id,
            title: "Critical Finding Detected",
            message: `AI detected ${criticalFindings.length > 0 ? criticalFindings.length + " critical findings" : "critical priority"} in ${exam.exam_type} - ${exam.body_part}. Patient: ${exam.patient?.full_name}`,
            type: "critical",
            exam_id: body.exam_id,
          }));

          await supabaseClient.from("notifications").insert(notifications);
        }
      }

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        action: "AI_ANALYSIS_COMPLETE",
        resource_type: "exam",
        resource_id: body.exam_id,
        new_values: {
          findings_count: body.findings.length,
          priority_score: body.priority_score,
          critical_findings: criticalFindings.length,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          exam_id: body.exam_id,
          findings_count: insertedFindings.length,
          priority: newPriority,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /ai-analysis/trigger - Trigger AI analysis for an exam
    if (req.method === "POST" && path === "/trigger") {
      const body = await req.json();

      if (!body.exam_id) {
        return new Response(
          JSON.stringify({ error: "exam_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get exam details
      const { data: exam, error: examError } = await supabaseClient
        .from("exams")
        .select("*, patient:patients(*)")
        .eq("id", body.exam_id)
        .single();

      if (examError || !exam) {
        return new Response(
          JSON.stringify({ error: "Exam not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update exam status to processing
      await supabaseClient
        .from("exams")
        .update({ status: "ai_processing" })
        .eq("id", body.exam_id);

      // In a real implementation, this would send the exam to an AI service
      // For demo purposes, we'll simulate the AI response
      const simulatedAnalysis: AIAnalysisRequest = {
        exam_id: body.exam_id,
        priority_score: exam.priority === "critical" ? 0.95 : exam.priority === "urgent" ? 0.75 : 0.45,
        summary: `AI analysis detected potential findings in ${exam.body_part}. Clinical correlation recommended.`,
        findings: [
          {
            finding_type: "Nodule",
            location: `${exam.body_part} - Central Region`,
            size_mm: 12,
            severity: exam.priority === "critical" ? "suspicious" : "probably_benign",
            description: "Rounded opacity with well-defined margins measuring approximately 12mm",
            confidence_score: 0.85,
          },
        ],
      };

      // Simulate async processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Call our own webhook to process results
      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(simulatedAnalysis),
        }
      );

      const result = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          message: "AI analysis triggered",
          exam_id: body.exam_id,
          result,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /ai-analysis/:exam_id - Get AI analysis status
    if (req.method === "GET" && path.match(/^\/[a-f0-9-]+$/)) {
      const examId = path.replace("/", "");

      const { data: exam, error } = await supabaseClient
        .from("exams")
        .select(`
          id,
          status,
          ai_analysis_complete,
          ai_priority_score,
          ai_findings_summary,
          findings(*)
        `)
        .eq("id", examId)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(exam),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
