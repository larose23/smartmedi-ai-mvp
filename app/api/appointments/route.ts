import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('[Appointments API] Starting appointment creation process');
    
    // Parse the request body
    const body = await request.json();
    console.log('[Appointments API] Received appointment data:', body);
    
    // Create the appointment
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          appointment_date: body.appointment_date,
          patient_name: body.patient_name,
          patient_email: body.patient_email,
          patient_phone: body.patient_phone,
          notes: body.notes,
          status: "scheduled", // Changed from "pending" to "scheduled" to match the UI
          patient_id: body.patient_id, // Make sure patient_id is included
          staff_id: body.staff_id || '11111111-1111-1111-1111-111111111111', // Default staff ID
          department: body.department || 'General', // Department field
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    console.log('[Appointments API] Appointment created successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
