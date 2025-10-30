import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupNotificationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SignupNotificationRequest = await req.json();

    console.log("Sending signup notification for:", email);

    const emailResponse = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: ["outaflow0@gmail.com"],
      subject: "Νέο άτομο εγγράφηκε στη λίστα αναμονής",
      html: `
        <h1>Νέα Εγγραφή στη Λίστα Αναμονής</h1>
        <p>Ένα νέο άτομο εγγράφηκε στη λίστα αναμονής!</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">Αυτό είναι ένα αυτοματοποιημένο μήνυμα από το σύστημα εγγραφών Outaflow.</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-signup-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
