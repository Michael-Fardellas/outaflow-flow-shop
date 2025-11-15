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
      from: "Outaflow <notifications@outaflow0.com>",
      to: ["outaflow0@gmail.com"],
      subject: "🎯 Νέα Εγγραφή στη Λίστα Αναμονής",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    
                    <!-- Header with gradient -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #000000 0%, #2d2d2d 100%); padding: 40px 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">OUTAFLOW</h1>
                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">Minimalism in Motion</p>
                      </td>
                    </tr>
                    
                    <!-- Main content -->
                    <tr>
                      <td style="padding: 50px 40px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                          <div style="display: inline-block; background: linear-gradient(135deg, #000000 0%, #2d2d2d 100%); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                            <span style="font-size: 40px;">🎯</span>
                          </div>
                        </div>
                        
                        <h2 style="margin: 0 0 20px; color: #000000; font-size: 28px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">Νέα Εγγραφή!</h2>
                        
                        <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6; text-align: center;">
                          Ένα νέο άτομο μόλις εγγράφηκε στη λίστα αναμονής
                        </p>
                        
                        <!-- Email box -->
                        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #000000; padding: 20px 25px; border-radius: 8px; margin: 30px 0;">
                          <p style="margin: 0 0 8px; color: #666666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Email Address</p>
                          <p style="margin: 0; color: #000000; font-size: 18px; font-weight: 600; word-break: break-all;">${email}</p>
                        </div>
                        
                        <!-- Stats or info -->
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
                          <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                            Μην ξεχάσεις να ενημερώσεις τον subscriber για το επερχόμενο launch!
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0 0 10px; color: #000000; font-size: 14px; font-weight: 600;">OUTAFLOW</p>
                        <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                          Αυτό είναι ένα αυτοματοποιημένο μήνυμα από το σύστημα εγγραφών.<br>
                          © ${new Date().getFullYear()} Outaflow. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
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
