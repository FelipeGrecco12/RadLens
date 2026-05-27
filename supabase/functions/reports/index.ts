import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReportRequest {
  exam_id: string;
  findings_text: string;
  impression: string;
  recommendations?: string;
  classification_system?: string;
  classification_code?: string;
  ai_suggestions_used?: boolean;
  ai_suggestions?: Record<string, any>;
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

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/functions/v1/reports", "");

    // GET /reports - List reports
    if (req.method === "GET" && (path === "" || path === "/")) {
      const status = url.searchParams.get("status");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = supabaseClient
        .from("reports")
        .select(`
          *,
          exam:exams(*, patient:patients(*)),
          radiologist:profiles(*)
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status === "signed") {
        query = query.eq("is_signed", true);
      } else if (status === "preliminary") {
        query = query.eq("is_preliminary", true).eq("is_signed", false);
      }

      const { data: reports, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify(reports),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /reports/:id - Get single report
    if (req.method === "GET" && path.match(/^\/[a-f0-9-]+$/)) {
      const reportId = path.replace("/", "");

      const { data: report, error } = await supabaseClient
        .from("reports")
        .select(`
          *,
          exam:exams(*, patient:patients(*), findings(*)),
          radiologist:profiles(*)
        `)
        .eq("id", reportId)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(report),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /reports - Create new report
    if (req.method === "POST" && (path === "" || path === "/")) {
      const body: ReportRequest = await req.json();

      if (!body.exam_id || !body.findings_text || !body.impression) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: exam_id, findings_text, impression" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if report already exists for this exam
      const { data: existingReport } = await supabaseClient
        .from("reports")
        .select("id")
        .eq("exam_id", body.exam_id)
        .maybeSingle();

      if (existingReport) {
        return new Response(
          JSON.stringify({ error: "Report already exists for this exam. Use PUT to update." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create report
      const { data: report, error } = await supabaseClient
        .from("reports")
        .insert({
          exam_id: body.exam_id,
          radiologist_id: user.id,
          findings_text: body.findings_text,
          impression: body.impression,
          recommendations: body.recommendations,
          classification_system: body.classification_system,
          classification_code: body.classification_code,
          is_preliminary: true,
          is_signed: false,
          ai_suggestions_used: body.ai_suggestions_used || false,
          ai_suggestions: body.ai_suggestions,
        })
        .select()
        .single();

      if (error) throw error;

      // Update exam status
      await supabaseClient
        .from("exams")
        .update({ status: "reported" })
        .eq("id", body.exam_id);

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "CREATE_REPORT",
        resource_type: "report",
        resource_id: report.id,
        new_values: report,
      });

      return new Response(
        JSON.stringify(report),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /reports/:id - Update report
    if (req.method === "PUT" && path.match(/^\/[a-f0-9-]+$/)) {
      const reportId = path.replace("/", "");
      const body = await req.json();

      // Get current report
      const { data: currentReport } = await supabaseClient
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (!currentReport) {
        return new Response(
          JSON.stringify({ error: "Report not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user is the radiologist who created the report or admin
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (currentReport.radiologist_id !== user.id && profile?.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Unauthorized to update this report" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prepare update data
      const updateData: Record<string, any> = {};
      if (body.findings_text) updateData.findings_text = body.findings_text;
      if (body.impression) updateData.impression = body.impression;
      if (body.recommendations !== undefined) updateData.recommendations = body.recommendations;
      if (body.classification_system) updateData.classification_system = body.classification_system;
      if (body.classification_code) updateData.classification_code = body.classification_code;
      if (body.addendum) updateData.addendum = body.addendum;

      const { data: updatedReport, error } = await supabaseClient
        .from("reports")
        .update(updateData)
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "UPDATE_REPORT",
        resource_type: "report",
        resource_id: reportId,
        old_values: currentReport,
        new_values: updatedReport,
      });

      return new Response(
        JSON.stringify(updatedReport),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /reports/:id/sign - Sign report
    if (req.method === "POST" && path.match(/^\/[a-f0-9-]+\/sign$/)) {
      const reportId = path.split("/")[1];

      // Get current report
      const { data: currentReport } = await supabaseClient
        .from("reports")
        .select("*, exam:exams(*)")
        .eq("id", reportId)
        .single();

      if (!currentReport) {
        return new Response(
          JSON.stringify({ error: "Report not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user is the radiologist
      if (currentReport.radiologist_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Only the assigned radiologist can sign this report" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already signed
      if (currentReport.is_signed) {
        return new Response(
          JSON.stringify({ error: "Report already signed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sign report
      const { data: signedReport, error } = await supabaseClient
        .from("reports")
        .update({
          is_signed: true,
          is_preliminary: false,
          signed_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;

      // Update exam status
      await supabaseClient
        .from("exams")
        .update({
          status: "signed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentReport.exam_id);

      // Notify requesting physician if available
      if (currentReport.exam?.requesting_physician) {
        // In a real system, you would look up the physician's user ID
        // For now, we'll skip this step
      }

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "SIGN_REPORT",
        resource_type: "report",
        resource_id: reportId,
        new_values: { is_signed: true, signed_at: signedReport.signed_at },
      });

      return new Response(
        JSON.stringify(signedReport),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /reports/:id/addendum - Add addendum to signed report
    if (req.method === "POST" && path.match(/^\/[a-f0-9-]+\/addendum$/)) {
      const reportId = path.split("/")[1];
      const body = await req.json();

      if (!body.text) {
        return new Response(
          JSON.stringify({ error: "Addendum text is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current report
      const { data: currentReport } = await supabaseClient
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (!currentReport) {
        return new Response(
          JSON.stringify({ error: "Report not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prepare addendum with timestamp
      const timestamp = new Date().toISOString();
      const addendum = `\n\n--- ADDENDUM ---\nDate: ${timestamp}\nBy: ${user.id}\n\n${body.text}`;

      const { data: updatedReport, error } = await supabaseClient
        .from("reports")
        .update({
          addendum: currentReport.addendum ? currentReport.addendum + addendum : addendum,
        })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "ADD_ADDENDUM",
        resource_type: "report",
        resource_id: reportId,
        new_values: { addendum: updatedReport.addendum },
      });

      return new Response(
        JSON.stringify(updatedReport),
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
