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

// Basic light-themed email template to avoid dark-mode inversion issues across clients
function buildHtml({
  title,
  heading,
  intro,
  details,
  extraNote,
}: {
  title: string;
  heading: string;
  intro: string;
  details?: string;
  extraNote?: string;
}) {
  return `
  <!DOCTYPE html>
  <html lang="el">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${title}</title>
      <style>
        /* Use system fonts for deliverability */
        .container { max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(0,0,0,0.08); }
        .header { background-color: #111827; padding: 32px 36px; text-align: center; }
        .brand { margin: 0; color: #ffffff !important; font-size: 24px; font-weight: 800; letter-spacing: 0.08em; }
        .tagline { margin: 8px 0 0; color: #d1d5db !important; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; }
        .body { padding: 40px 36px; }
        .h1 { margin: 0 0 14px; color: #111827 !important; font-size: 22px; font-weight: 800; letter-spacing: -0.01em; text-align: center; }
        .p { margin: 0 0 12px; color: #374151 !important; font-size: 15px; line-height: 1.7; text-align: center; }
        .card { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px; margin: 22px 0; }
        .foot { background-color: #f9fafb; padding: 22px 36px; text-align: center; border-top: 1px solid #f1f5f9; }
        .footp { margin: 0; color: #6b7280 !important; font-size: 12px; line-height: 1.6; }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f7" style="background-color:#f4f4f7; padding: 28px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="container">
              <tr>
                <td class="header">
                  <h1 class="brand">OUTAFLOW</h1>
                  <p class="tagline">MINIMALISM IN MOTION</p>
                </td>
              </tr>
              <tr>
                <td class="body">
                  <h2 class="h1">${heading}</h2>
                  <p class="p">${intro}</p>
                  ${details ? `<div class="card"><p class="p" style="margin:0; text-align:left;">${details}</p></div>` : ""}
                  ${extraNote ? `<p class="p" style="font-style:italic; color:#6b7280 !important;">${extraNote}</p>` : ""}
                </td>
              </tr>
              <tr>
                <td class="foot">
                  <p class="footp">© ${new Date().getFullYear()} Outaflow. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SignupNotificationRequest = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log("Sending signup emails for:", normalizedEmail);

    // 1) Confirmation email to subscriber
    const confirmationHtml = buildHtml({
      title: "Ευχαριστούμε για την εγγραφή σου",
      heading: "Καλώς ήρθες στο Outaflow!",
      intro: "Ευχαριστούμε για την εγγραφή σου στη λίστα αναμονής. Θα ενημερωθείς πρώτο/η για το launch.",
      details: "Τι να περιμένεις: early access, ειδικές προσφορές και behind‑the‑scenes περιεχόμενο.",
      extraNote: '"Minimalism in Motion" – Η απλότητα είναι το απόλυτο στυλ.',
    });

    const confirmation = await resend.emails.send({
      from: "Outaflow <notifications@outaflow0.com>",
      to: [normalizedEmail],
      subject: "Ευχαριστούμε για την εγγραφή σου",
      text: "Ευχαριστούμε για την εγγραφή σου στο Outaflow. Θα σε ενημερώσουμε πρώτο/η στο launch.",
      html: confirmationHtml,
      replyTo: "notifications@outaflow0.com",
    });

    console.log("Confirmation email result:", confirmation);

    // 2) Notification email to admin
    const adminHtml = buildHtml({
      title: "Νέα εγγραφή στη λίστα αναμονής",
      heading: "Νέα Εγγραφή",
      intro: "Ένα νέο άτομο μόλις εγγράφηκε στη λίστα αναμονής.",
      details: `<strong style=\"color:#111827\">Email:</strong> ${normalizedEmail}`,
    });

    const notification = await resend.emails.send({
      from: "Outaflow <notifications@outaflow0.com>",
      to: ["outaflow0@gmail.com"],
      subject: "Νέα εγγραφή στη λίστα αναμονής",
      text: `Νέα εγγραφή στη λίστα αναμονής: ${normalizedEmail}`,
      html: adminHtml,
      replyTo: "notifications@outaflow0.com",
    });

    console.log("Admin notification result:", notification);

    return new Response(JSON.stringify({ confirmation, notification }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-signup-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
