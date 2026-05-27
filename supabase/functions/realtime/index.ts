import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const path = url.pathname.replace("/functions/v1/realtime", "");

    // GET /realtime/stats - Get real-time statistics
    if (req.method === "GET" && path === "/stats") {
      // Get counts
      const { count: totalExams } = await supabaseClient
        .from("exams")
        .select("*", { count: "exact", head: true });

      const { count: pendingReview } = await supabaseClient
        .from("exams")
        .select("*", { count: "exact", head: true })
        .in("status", ["uploaded", "ai_completed"]);

      const { count: criticalPending } = await supabaseClient
        .from("exams")
        .select("*", { count: "exact", head: true })
        .in("status", ["uploaded", "ai_completed", "in_review"])
        .in("priority", ["critical", "stat"]);

      const { count: reportedToday } = await supabaseClient
        .from("exams")
        .select("*", { count: "exact", head: true })
        .eq("status", "signed")
        .gte("completed_at", new Date().toISOString().split("T")[0]);

      // Get average turnaround time
      const { data: completedExams } = await supabaseClient
        .from("exams")
        .select("created_at, completed_at")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(100);

      let avgTurnaround = 0;
      if (completedExams && completedExams.length > 0) {
        const turnarounds = completedExams.map((exam) => {
          const start = new Date(exam.created_at).getTime();
          const end = new Date(exam.completed_at!).getTime();
          return (end - start) / 1000 / 60; // minutes
        });
        avgTurnaround = turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length;
      }

      // Get active radiologists
      const { data: activeRadiologists } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .eq("role", "radiologist")
        .eq("is_active", true);

      // Get exams by status
      const { data: examsByStatus } = await supabaseClient
        .from("exams")
        .select("status");

      const statusCounts: Record<string, number> = {};
      examsByStatus?.forEach((exam) => {
        statusCounts[exam.status] = (statusCounts[exam.status] || 0) + 1;
      });

      // Get exams by priority
      const { data: examsByPriority } = await supabaseClient
        .from("exams")
        .select("priority");

      const priorityCounts: Record<string, number> = {};
      examsByPriority?.forEach((exam) => {
        priorityCounts[exam.priority] = (priorityCounts[exam.priority] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          total_exams: totalExams || 0,
          pending_review: pendingReview || 0,
          critical_pending: criticalPending || 0,
          reported_today: reportedToday || 0,
          avg_turnaround_minutes: Math.round(avgTurnaround),
          active_radiologists: activeRadiologists?.length || 0,
          by_status: statusCounts,
          by_priority: priorityCounts,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /realtime/activities - Get recent activities for dashboard
    if (req.method === "GET" && path === "/activities") {
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const { data: activities, error } = await supabaseClient
        .from("audit_logs")
        .select(`
          id,
          action,
          resource_type,
          resource_id,
          created_at,
          profile:profiles!user_id(full_name, role)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(
        JSON.stringify(activities),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /realtime/radiologist-workload - Get workload per radiologist
    if (req.method === "GET" && path === "/radiologist-workload") {
      const { data: radiologists, error } = await supabaseClient
        .from("profiles")
        .select(`
          id,
          full_name,
          specialization,
          exams!exams_assigned_radiologist_id_fkey(count)
        `)
        .eq("role", "radiologist")
        .eq("is_active", true);

      if (error) throw error;

      // Get pending exams for each radiologist
      const workload = await Promise.all(
        (radiologists || []).map(async (rad) => {
          const { count: pendingCount } = await supabaseClient
            .from("exams")
            .select("*", { count: "exact", head: true })
            .eq("assigned_radiologist_id", rad.id)
            .in("status", ["in_review", "reported"]);

          const { count: completedToday } = await supabaseClient
            .from("exams")
            .select("*", { count: "exact", head: true })
            .eq("assigned_radiologist_id", rad.id)
            .eq("status", "signed")
            .gte("completed_at", new Date().toISOString().split("T")[0]);

          return {
            id: rad.id,
            full_name: rad.full_name,
            specialization: rad.specialization,
            pending_exams: pendingCount || 0,
            completed_today: completedToday || 0,
            total_assigned: rad.exams?.length || 0,
          };
        })
      );

      return new Response(
        JSON.stringify(workload),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /realtime/sla-status - Get SLA compliance status
    if (req.method === "GET" && path === "/sla-status") {
      // Get exams that are approaching SLA breach
      const slaThresholds = {
        stat: 60, // 1 hour in minutes
        critical: 240, // 4 hours in minutes
        urgent: 1440, // 24 hours in minutes
        routine: 4320, // 72 hours in minutes
      };

      const now = new Date();
      const warnings: any[] = [];
      const breached: any[] = [];

      const { data: pendingExams } = await supabaseClient
        .from("exams")
        .select(`
          id,
          accession_number,
          priority,
          created_at,
          exam_type,
          body_part,
          patient:patients(full_name),
          assigned_radiologist:profiles!exams_assigned_radiologist_id_fkey(full_name)
        `)
        .in("status", ["uploaded", "ai_completed", "in_review"]);

      pendingExams?.forEach((exam) => {
        const createdAt = new Date(exam.created_at);
        const elapsedMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
        const threshold = slaThresholds[exam.priority as keyof typeof slaThresholds] || slaThresholds.routine;

        if (elapsedMinutes >= threshold) {
          breached.push({
            ...exam,
            overdue_minutes: Math.round(elapsedMinutes - threshold),
          });
        } else if (elapsedMinutes >= threshold * 0.8) {
          warnings.push({
            ...exam,
            minutes_remaining: Math.round(threshold - elapsedMinutes),
          });
        }
      });

      // Calculate SLA compliance rate
      const totalExams = pendingExams?.length || 0;
      const breachedCount = breached.length;
      const complianceRate = totalExams > 0 ? ((totalExams - breachedCount) / totalExams) * 100 : 100;

      return new Response(
        JSON.stringify({
          warnings,
          breached,
          compliance_rate: Math.round(complianceRate),
          total_pending: totalExams,
          sla_thresholds: slaThresholds,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /realtime/broadcast - Send real-time update to specific channel
    if (req.method === "POST" && path === "/broadcast") {
      const body = await req.json();

      // This would typically use Supabase Realtime channels
      // For now, we just log and acknowledge
      console.log("Broadcasting:", body);

      return new Response(
        JSON.stringify({ success: true, message: "Update broadcasted" }),
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
