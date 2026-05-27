import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const path = url.pathname.replace("/functions/v1/notifications", "");

    // GET /notifications - List user notifications
    if (req.method === "GET" && (path === "" || path === "/")) {
      const unreadOnly = url.searchParams.get("unread") === "true";
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabaseClient
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq("is_read", false);
      }

      const { data: notifications, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify(notifications),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /notifications/:id/read - Mark notification as read
    if (req.method === "PUT" && path.match(/^\/[a-f0-9-]+\/read$/)) {
      const notificationId = path.split("/")[1];

      const { data: notification, error } = await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(notification),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /notifications/mark-all-read - Mark all as read
    if (req.method === "PUT" && path === "/mark-all-read") {
      const { error } = await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "All notifications marked as read" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /notifications/:id - Delete notification
    if (req.method === "DELETE" && path.match(/^\/[a-f0-9-]+$/)) {
      const notificationId = path.replace("/", "");

      const { error } = await supabaseClient
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /notifications/broadcast - Send notification to multiple users (admin only)
    if (req.method === "POST" && path === "/broadcast") {
      const body = await req.json();

      // Check if user is admin
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Unauthorized - Admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!body.title || !body.message || !body.user_ids) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: title, message, user_ids" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const notifications = body.user_ids.map((userId: string) => ({
        user_id: userId,
        title: body.title,
        message: body.message,
        type: body.type || "info",
        exam_id: body.exam_id,
      }));

      const { data: inserted, error } = await supabaseClient
        .from("notifications")
        .insert(notifications)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, count: inserted.length }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /notifications/unread-count - Get unread count
    if (req.method === "GET" && path === "/unread-count") {
      const { count, error } = await supabaseClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      return new Response(
        JSON.stringify({ count }),
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
