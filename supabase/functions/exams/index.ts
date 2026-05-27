import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExamRequest {
  patient_id: string;
  exam_type: string;
  body_part: string;
  modality: string;
  clinical_indication: string;
  priority: 'routine' | 'urgent' | 'critical' | 'stat';
  requesting_physician?: string;
  institution?: string;
  study_instance_uid?: string;
  image_count?: number;
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
    const path = url.pathname.replace("/functions/v1/exams", "");

    // GET /exams - List exams with filters
    if (req.method === "GET" && (path === "" || path === "/")) {
      const status = url.searchParams.get("status");
      const priority = url.searchParams.get("priority");
      const assigned = url.searchParams.get("assigned");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = supabaseClient
        .from("exams")
        .select(`
          *,
          patient:patients(*),
          radiologist:profiles!exams_assigned_radiologist_id_fkey(*),
          report:reports(*)
        `)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== "all") {
        if (status === "pending_review") {
          query = query.in("status", ["uploaded", "ai_completed"]);
        } else {
          query = query.eq("status", status);
        }
      }

      if (priority && priority !== "all") {
        query = query.eq("priority", priority);
      }

      if (assigned === "me") {
        query = query.eq("assigned_radiologist_id", user.id);
      }

      const { data: exams, error } = await query;

      if (error) throw error;

      // Get total count
      let countQuery = supabaseClient.from("exams").select("*", { count: "exact", head: true });
      if (status && status !== "all") {
        if (status === "pending_review") {
          countQuery = countQuery.in("status", ["uploaded", "ai_completed"]);
        } else {
          countQuery = countQuery.eq("status", status);
        }
      }
      const { count } = await countQuery;

      return new Response(
        JSON.stringify({ exams, total: count }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /exams/:id - Get single exam
    if (req.method === "GET" && path.match(/^\/[a-f0-9-]+$/)) {
      const examId = path.replace("/", "");

      const { data: exam, error } = await supabaseClient
        .from("exams")
        .select(`
          *,
          patient:patients(*),
          radiologist:profiles!exams_assigned_radiologist_id_fkey(*),
          findings(*),
          report:reports(*, radiologist:profiles(*))
        `)
        .eq("id", examId)
        .single();

      if (error) throw error;
      if (!exam) {
        return new Response(
          JSON.stringify({ error: "Exam not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "VIEW_EXAM",
        resource_type: "exam",
        resource_id: examId,
      });

      return new Response(
        JSON.stringify(exam),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /exams - Create new exam
    if (req.method === "POST" && (path === "" || path === "/")) {
      const body: ExamRequest = await req.json();

      // Validate required fields
      if (!body.patient_id || !body.exam_type || !body.body_part || !body.modality) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate accession number
      const timestamp = Date.now();
      const accessionNumber = `ACC-${timestamp}`;

      // Create exam
      const { data: exam, error } = await supabaseClient
        .from("exams")
        .insert({
          patient_id: body.patient_id,
          accession_number: accessionNumber,
          exam_type: body.exam_type,
          body_part: body.body_part,
          modality: body.modality,
          clinical_indication: body.clinical_indication,
          priority: body.priority || "routine",
          requesting_physician: body.requesting_physician,
          institution: body.institution,
          study_instance_uid: body.study_instance_uid,
          image_count: body.image_count || 0,
          status: "pending_upload",
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "CREATE_EXAM",
        resource_type: "exam",
        resource_id: exam.id,
        new_values: exam,
      });

      return new Response(
        JSON.stringify(exam),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /exams/:id - Update exam
    if (req.method === "PUT" && path.match(/^\/[a-f0-9-]+$/)) {
      const examId = path.replace("/", "");
      const body = await req.json();

      // Get current exam for audit
      const { data: currentExam } = await supabaseClient
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      // Prepare update data
      const updateData: Record<string, any> = {};
      if (body.status) updateData.status = body.status;
      if (body.priority) updateData.priority = body.priority;
      if (body.assigned_radiologist_id !== undefined) {
        updateData.assigned_radiologist_id = body.assigned_radiologist_id;
        if (body.assigned_radiologist_id) {
          updateData.assigned_at = new Date().toISOString();
        }
      }
      if (body.image_count !== undefined) updateData.image_count = body.image_count;
      if (body.completed_at) updateData.completed_at = body.completed_at;

      const { data: updatedExam, error } = await supabaseClient
        .from("exams")
        .update(updateData)
        .eq("id", examId)
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "UPDATE_EXAM",
        resource_type: "exam",
        resource_id: examId,
        old_values: currentExam,
        new_values: updatedExam,
      });

      return new Response(
        JSON.stringify(updatedExam),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /exams/:id/assign - Assign exam to radiologist
    if (req.method === "POST" && path.match(/^\/[a-f0-9-]+\/assign$/)) {
      const examId = path.split("/")[1];
      const body = await req.json();

      if (!body.radiologist_id) {
        return new Response(
          JSON.stringify({ error: "radiologist_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: exam, error } = await supabaseClient
        .from("exams")
        .update({
          assigned_radiologist_id: body.radiologist_id,
          assigned_at: new Date().toISOString(),
          status: "in_review",
        })
        .eq("id", examId)
        .select()
        .single();

      if (error) throw error;

      // Create notification for radiologist
      await supabaseClient.from("notifications").insert({
        user_id: body.radiologist_id,
        title: "New Exam Assigned",
        message: `A ${exam.exam_type} of ${exam.body_part} has been assigned to you for review.`,
        type: "assignment",
        exam_id: examId,
      });

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "ASSIGN_EXAM",
        resource_type: "exam",
        resource_id: examId,
        new_values: { assigned_radiologist_id: body.radiologist_id },
      });

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
