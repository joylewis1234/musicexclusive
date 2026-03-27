import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SignupIntent = "fan" | "artist-signup" | "artist-setup";
type SignupFlow = "invite" | "superfan" | null;

interface StartSignupVerificationRequest {
  intent?: SignupIntent;
  email?: string;
  password?: string;
  displayName?: string;
  applicationId?: string;
  inviteToken?: string;
  inviteType?: string;
  flow?: SignupFlow;
  next?: string;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveSiteOrigin(req: Request) {
  const fallback = Deno.env.get("SITE_URL") || "https://www.musicexclusive.co";
  const candidate = req.headers.get("referer") || req.headers.get("origin") || fallback;

  try {
    const origin = new URL(candidate).origin;
    if (origin === "http://localhost:8080" || origin === "http://127.0.0.1:8080") {
      return origin;
    }
  } catch {
    // Ignore malformed request origins and fall back to the live app URL.
  }

  return fallback;
}

function isInternalNextPath(value: string | undefined) {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < perPage) return null;

    page += 1;
  }
}

function buildRedirectTo(
  siteOrigin: string,
  body: StartSignupVerificationRequest,
  email: string,
) {
  const redirectUrl = new URL("/auth/confirm", siteOrigin);
  redirectUrl.searchParams.set("intent", body.intent!);
  redirectUrl.searchParams.set("email", email);

  if (body.displayName?.trim()) {
    redirectUrl.searchParams.set("display_name", body.displayName.trim());
  }

  if (body.applicationId?.trim()) {
    redirectUrl.searchParams.set("application_id", body.applicationId.trim());
  }

  if (body.flow) {
    redirectUrl.searchParams.set("flow", body.flow);
  }

  if (body.inviteToken?.trim()) {
    redirectUrl.searchParams.set("invite_token", body.inviteToken.trim());
  }

  if (body.inviteType?.trim()) {
    redirectUrl.searchParams.set("invite_type", body.inviteType.trim());
  }

  if (isInternalNextPath(body.next)) {
    redirectUrl.searchParams.set("next", body.next!);
  }

  return redirectUrl.toString();
}

function getEmailCopy(intent: SignupIntent, status: "verification_sent" | "verification_resent") {
  if (intent === "artist-setup") {
    return {
      subject: status === "verification_resent"
        ? "Verify your email to finish artist setup"
        : "Finish setting up your artist account",
      heading: "Finish Your Artist Setup",
      intro: "Verify your email address to finish connecting your approved artist access.",
      cta: "Verify & Finish Setup",
    };
  }

  if (intent === "artist-signup") {
    return {
      subject: status === "verification_resent"
        ? "Verify your Music Exclusive artist account"
        : "Confirm your Music Exclusive artist account",
      heading: "Confirm Your Artist Account",
      intro: "Verify your email address to activate your Music Exclusive artist account.",
      cta: "Verify Artist Account",
    };
  }

  return {
    subject: status === "verification_resent"
      ? "Verify your Music Exclusive account"
      : "Confirm your Music Exclusive account",
    heading: "Confirm Your Account",
    intro: "Verify your email address to activate your Music Exclusive account.",
    cta: "Verify My Account",
  };
}

async function sendVerificationEmail(
  resendKey: string,
  email: string,
  actionLink: string,
  intent: SignupIntent,
  status: "verification_sent" | "verification_resent",
) {
  const copy = getEmailCopy(intent, status);
  const safeLink = escapeHtml(actionLink);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;border:1px solid rgba(139,92,246,0.3);">
                <tr>
                  <td style="padding:40px;">
                    <h1 style="margin:0 0 16px 0;color:#ffffff;font-size:28px;text-align:center;">Music Exclusive</h1>
                    <p style="margin:0 0 28px 0;color:#a78bfa;font-size:14px;text-align:center;text-transform:uppercase;letter-spacing:0.08em;">Email Verification</p>
                    <h2 style="margin:0 0 18px 0;color:#ffffff;font-size:24px;text-align:center;">${copy.heading}</h2>
                    <p style="margin:0 0 28px 0;color:#e5e7eb;font-size:16px;line-height:1.6;text-align:center;">
                      ${copy.intro}
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding:12px 0 24px 0;">
                          <a href="${safeLink}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#a855f7 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:600;">
                            ${copy.cta}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 10px 0;color:#9ca3af;font-size:14px;line-height:1.6;">
                      This link will expire automatically. If it stops working, return to the signup screen and request a fresh verification email.
                    </p>
                    <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;word-break:break-all;">
                      ${safeLink}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `${copy.heading}

${copy.intro}

${copy.cta}: ${actionLink}

This link will expire automatically. If it stops working, return to the signup screen and request a fresh verification email.`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Music Exclusive <support@musicexclusive.co>",
      reply_to: "support@musicexclusive.co",
      to: [email],
      subject: copy.subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Resend failed: ${JSON.stringify(errorData)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: StartSignupVerificationRequest = await req.json();
    const intent = body.intent;
    const email = body.email ? normalizeEmail(body.email) : "";
    const password = body.password ?? "";
    const displayName = body.displayName?.trim() || email.split("@")[0];

    if (!intent || !["fan", "artist-signup", "artist-setup"].includes(intent)) {
      return new Response(
        JSON.stringify({ success: false, error: "A valid signup intent is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const minPasswordLength = 8;
    if (password.length < minPasswordLength) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Password must be at least ${minPasswordLength} characters.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (intent === "artist-setup") {
      const applicationId = body.applicationId?.trim();
      if (!applicationId) {
        return new Response(
          JSON.stringify({ success: false, error: "Approved artist setup requires an application ID." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: application, error: applicationError } = await supabaseAdmin
        .from("artist_applications")
        .select("id, contact_email, auth_user_id, status")
        .eq("id", applicationId)
        .maybeSingle();

      if (applicationError) throw applicationError;

      if (!application) {
        return new Response(
          JSON.stringify({ success: false, error: "No approved application found.", error_code: "NOT_FOUND" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (normalizeEmail(application.contact_email) !== email) {
        return new Response(
          JSON.stringify({ success: false, error: "Application email does not match.", error_code: "EMAIL_MISMATCH" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!["approved", "approved_pending_setup", "active"].includes(application.status)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Application status is "${application.status}". Only approved applications can create artist accounts.`,
            error_code: "NOT_APPROVED",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (application.auth_user_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This application is already linked to an account. Please sign in instead.",
            error_code: "ALREADY_LINKED",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const existingUser = await findAuthUserByEmail(supabaseAdmin, email);
    const siteOrigin = resolveSiteOrigin(req);
    const redirectTo = buildRedirectTo(siteOrigin, body, email);
    const verificationMode = existingUser ? "magiclink" : "signup";
    let linkStatus: "verification_sent" | "verification_resent" = existingUser ? "verification_resent" : "verification_sent";

    if (existingUser && intent === "fan" && existingUser.email_confirmed_at) {
      return new Response(
        JSON.stringify({
          success: true,
          status: "account_exists",
          message: "An account with this email already exists. Sign in or reset your password.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (existingUser && !existingUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: {
          ...(existingUser.user_metadata ?? {}),
          display_name: displayName,
        },
      });
    }

    if (existingUser && intent === "artist-signup" && displayName) {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...(existingUser.user_metadata ?? {}),
          display_name: displayName,
        },
      });
    }

    const linkPayload =
      verificationMode === "signup"
        ? {
            type: "signup" as const,
            email,
            password,
            options: { redirectTo },
          }
        : {
            type: "magiclink" as const,
            email,
            options: { redirectTo },
          };

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink(linkPayload);
    if (linkError) {
      console.error("[start-signup-verification] generateLink failed:", linkError);
      return new Response(
        JSON.stringify({ success: false, error: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return new Response(
        JSON.stringify({ success: false, error: "Verification link could not be generated." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await sendVerificationEmail(resendKey, email, actionLink, intent, linkStatus);

    return new Response(
      JSON.stringify({
        success: true,
        status: linkStatus,
        message: "Verification email sent.",
        redirectTo,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[start-signup-verification] unexpected error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
