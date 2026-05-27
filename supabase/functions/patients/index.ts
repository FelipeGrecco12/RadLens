import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PatientRequest {
  mrn: string;
  full_name: string;
  birth_date?: string;
  gender?: string;
  phone?: string;
  email?: string;
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
    const path = url.pathname.replace("/functions/v1/patients", "");

    // GET /patients - List patients with search
    if (req.method === "GET" && (path === "" || path === "/")) {
      const search = url.searchParams.get("search");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = supabaseClient
        .from("patients")
        .select(`
          *,
          exams(count)
        `)
        .order("full_name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,mrn.ilike.%${search}%`);
      }

      const { data: patients, error } = await query;

      if (error) throw error;

      // Get last exam date for each patient
      const patientsWithLastExam = await Promise.all(
        (patients || []).map(async (patient) => {
          const { data: lastExam } = await supabaseClient
            .from("exams")
            .select("created_at")
            .eq("patient_id", patient.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...patient,
            exam_count: patient.exams?.[0]?.count || 0,
            last_exam_date: lastExam?.created_at || null,
          };
        })
      );

      return new Response(
        JSON.stringify(patientsWithLastExam),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /patients/:id - Get single patient with full history
    if (req.method === "GET" && path.match(/^\/[a-f0-9-]+$/)) {
      const patientId = path.replace("/", "");

      const { data: patient, error } = await supabaseClient
        .from("patients")
        .select(`
          *,
          exams(
            *,
            report:reports(*)
          )
        `)
        .eq("id", patientId)
        .single();

      if (error) throw error;

      // Calculate age
      let age = null;
      if (patient.birth_date) {
        const today = new Date();
        const birth = new Date(patient.birth_date);
        age = Math.floor(
          (today.getTime() - birth.getTime()) / 365 / 24 / 60 / 60 / 1000
        );
      }

      return new Response(
        JSON.stringify({ ...patient, age }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /patients - Create new patient
    if (req.method === "POST" && (path === "" || path === "/")) {
      const body: PatientRequest = await req.json();

      if (!body.mrn || !body.full_name) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: mrn, full_name" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if MRN already exists
      const { data: existingPatient } = await supabaseClient
        .from("patients")
        .select("id")
        .eq("mrn", body.mrn)
        .maybeSingle();

      if (existingPatient) {
        return new Response(
          JSON.stringify({ error: "Patient with this MRN already exists" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create patient
      const { data: patient, error } = await supabaseClient
        .from("patients")
        .insert({
          mrn: body.mrn,
          full_name: body.full_name,
          birth_date: body.birth_date,
          gender: body.gender,
          phone: body.phone,
          email: body.email,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "CREATE_PATIENT",
        resource_type: "patient",
        resource_id: patient.id,
        new_values: patient,
      });

      return new Response(
        JSON.stringify(patient),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /patients/:id - Update patient
    if (req.method === "PUT" && path.match(/^\/[a-f0-9-]+$/)) {
      const patientId = path.replace("/", "");
      const body = await req.json();

      // Get current patient for audit
      const { data: currentPatient } = await supabaseClient
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      if (!currentPatient) {
        return new Response(
          JSON.stringify({ error: "Patient not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prepare update data
      const updateData: Record<string, any> = {};
      if (body.full_name) updateData.full_name = body.full_name;
      if (body.birth_date !== undefined) updateData.birth_date = body.birth_date;
      if (body.gender !== undefined) updateData.gender = body.gender;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.email !== undefined) updateData.email = body.email;

      const { data: updatedPatient, error } = await supabaseClient
        .from("patients")
        .update(updateData)
        .eq("id", patientId)
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "UPDATE_PATIENT",
        resource_type: "patient",
        resource_id: patientId,
        old_values: currentPatient,
        new_values: updatedPatient,
      });

      return new Response(
        JSON.stringify(updatedPatient),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /patients/:id/exams - Get patient's exam history
    if (req.method === "GET" && path.match(/^\/[a-f0-9-]+\/exams$/)) {
      const patientId = path.split("/")[1];

      const { data: exams, error } = await supabaseClient
        .from("exams")
        .select(`
          *,
          report:reports(*, radiologist:profiles(*))
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify(exams),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /patients/sync-fhir - Sync patient from FHIR server
    if (req.method === "POST" && path === "/sync-fhir") {
      const body = await req.json();

      if (!body.fhir_patient_id || !body.fhir_server_url) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: fhir_patient_id, fhir_server_url" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch patient from FHIR server
      const fhirUrl = `${body.fhir_server_url}/Patient/${body.fhir_patient_id}`;
      const fhirResponse = await fetch(fhirUrl, {
        headers: {
          Accept: "application/json",
          ...(body.fhir_api_key && { Authorization: `Bearer ${body.fhir_api_key}` }),
        },
      });

      if (!fhirResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch patient from FHIR server" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fhirPatient = await fhirResponse.json();

      // Extract patient data from FHIR resource
      const mrn = fhirPatient.identifier?.find((id: any) => id.type?.coding?.[0]?.code === "MR")?.value || body.fhir_patient_id;
      const fullName = fhirPatient.name?.[0]
        ? [fhirPatient.name[0].given, fhirPatient.name[0].family]
            .filter(Boolean)
            .flat()
            .join(" ")
        : "Unknown";
      const birthDate = fhirPatient.birthDate;
      const gender = fhirPatient.gender;
      const phone = fhirPatient.telecom?.find((t: any) => t.system === "phone")?.value;
      const email = fhirPatient.telecom?.find((t: any) => t.system === "email")?.value;

      // Check if patient already exists
      const { data: existingPatient } = await supabaseClient
        .from("patients")
        .select("*")
        .eq("mrn", mrn)
        .maybeSingle();

      let patient;
      if (existingPatient) {
        // Update existing patient
        const { data, error } = await supabaseClient
          .from("patients")
          .update({
            full_name: fullName,
            birth_date: birthDate,
            gender: gender,
            phone: phone,
            email: email,
          })
          .eq("id", existingPatient.id)
          .select()
          .single();

        if (error) throw error;
        patient = data;
      } else {
        // Create new patient
        const { data, error } = await supabaseClient
          .from("patients")
          .insert({
            mrn: mrn,
            full_name: fullName,
            birth_date: birthDate,
            gender: gender,
            phone: phone,
            email: email,
          })
          .select()
          .single();

        if (error) throw error;
        patient = data;
      }

      // Log audit trail
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: existingPatient ? "SYNC_FHIR_UPDATE" : "SYNC_FHIR_CREATE",
        resource_type: "patient",
        resource_id: patient.id,
        new_values: { fhir_id: body.fhir_patient_id, fhir_server: body.fhir_server_url },
      });

      return new Response(
        JSON.stringify({ patient, synced: true }),
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
