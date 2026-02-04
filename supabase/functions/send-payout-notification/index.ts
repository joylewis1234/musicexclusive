import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const PRIMARY_FROM = "Music Exclusive <noreply@themusicisexclusive.com>";
const REPLY_TO = "support@musicexclusive.co";
const COMPANY_EMAIL = "support@musicexclusive.co";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYOUT-NOTIFICATION] ${step}${detailsStr}`);
};

type ResendErrorPayload = {
  message?: string;
  error?: string;
};

async function sendResendEmail(args: {
  resendKey: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true; data?: unknown } | { ok: false; status: number; message: string }> {
  const emailResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      reply_to: args.replyTo,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });

  if (emailResponse.ok) {
    try {
      const data = await emailResponse.json();
      return { ok: true, data };
    } catch {
      return { ok: true };
    }
  }

  const contentType = emailResponse.headers.get("content-type") || "";
  let message = `Resend API error: ${emailResponse.status}`;
  try {
    if (contentType.includes("application/json")) {
      const data = (await emailResponse.json()) as ResendErrorPayload;
      message = data.message || data.error || message;
    } else {
      const text = await emailResponse.text();
      message = text || message;
    }
  } catch {
    // ignore parsing error
  }

  return { ok: false, status: emailResponse.status, message };
}

async function sendEmail(
  resendKey: string,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const result = await sendResendEmail({
    resendKey,
    from: PRIMARY_FROM,
    replyTo: REPLY_TO,
    to,
    subject,
    html,
  });

  if (result.ok) {
    return { success: true };
  }

  return { success: false, error: result.message };
}

// Email Templates
function artistPayoutPaidEmail(artistName: string, amount: string, weekStart: string, weekEnd: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1)); border-radius: 16px; border: 1px solid rgba(34, 197, 94, 0.3); padding: 40px;">
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <img src="https://www.themusicisexclusive.com/favicon.png" alt="Music Exclusive" width="48" height="48" style="display: block; margin: 0 auto; border-radius: 10px;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <span style="font-size: 48px;">💰</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Your Payout is On the Way!</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <p style="margin: 0; color: #22c55e; font-size: 18px;">Hey ${artistName}!</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                Great news! Your weekly earnings have been processed and sent to your connected bank account.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <div style="background: rgba(34, 197, 94, 0.15); border: 2px solid rgba(34, 197, 94, 0.5); border-radius: 12px; padding: 20px 40px;">
                <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Amount Paid</p>
                <span style="font-size: 36px; font-weight: bold; color: #22c55e;">${amount}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <p style="margin: 0; color: #606060; font-size: 14px;">
                For streams from ${weekStart} to ${weekEnd}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 20px; border-top: 1px solid rgba(34, 197, 94, 0.2);">
              <p style="margin: 0; color: #606060; font-size: 12px;">
                Funds typically arrive in 2-3 business days. Keep creating amazing music! 🎵
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
}

function artistPayoutFailedEmail(artistName: string, reason: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1)); border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3); padding: 40px;">
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <img src="https://www.themusicisexclusive.com/favicon.png" alt="Music Exclusive" width="48" height="48" style="display: block; margin: 0 auto; border-radius: 10px;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <span style="font-size: 48px;">⚠️</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Action Needed: Complete Payout Setup</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <p style="margin: 0; color: #ef4444; font-size: 18px;">Hey ${artistName},</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                We tried to process your weekly payout but encountered an issue. Please complete your payout setup to receive your earnings.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 12px; padding: 20px;">
                <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Issue</p>
                <p style="margin: 0; color: #ef4444; font-size: 14px;">${reason}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                Log in to your Artist Dashboard and go to the Earnings tab to complete your payout setup. Your earnings are safe and will be paid once setup is complete.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 20px; border-top: 1px solid rgba(239, 68, 68, 0.2);">
              <p style="margin: 0; color: #606060; font-size: 12px;">
                Need help? Contact us at support@musicexclusive.co
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
}

function companyBatchCreatedEmail(
  weekStart: string, 
  weekEnd: string, 
  artistCount: number, 
  totalGross: string, 
  totalArtistNet: string,
  applicationsApproved?: number,
  applicationsDenied?: number,
  invitationsGenerated?: number,
  invitationsSent?: number,
  invitationsApplied?: number,
  invitedArtists?: Array<{ artist_name: string; contact: string; platform: string; status: string }>
): string {
  const hasApplicationStats = applicationsApproved !== undefined || applicationsDenied !== undefined;
  const approvedCount = applicationsApproved ?? 0;
  const deniedCount = applicationsDenied ?? 0;

  const hasInvitationStats = invitationsGenerated !== undefined && invitationsGenerated > 0;
  const generatedCount = invitationsGenerated ?? 0;
  const sentCount = invitationsSent ?? 0;
  const appliedCount = invitationsApplied ?? 0;
  
  const invitedArtistRows = (invitedArtists ?? []).map(a => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e0e0e0;">${a.artist_name}</td>
      <td style="padding: 8px; border: 1px solid #e0e0e0;">${a.contact}</td>
      <td style="padding: 8px; border: 1px solid #e0e0e0;">${a.platform === 'email' ? 'Email' : 'DM'}</td>
      <td style="padding: 8px; border: 1px solid #e0e0e0;">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</td>
    </tr>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e0e0e0;">
    <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">📊 Weekly Payout Batch Created</h1>
    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">A new payout batch has been created and is awaiting admin approval.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px; background: #f9f9f9; border: 1px solid #e0e0e0; font-weight: bold; width: 40%;">Week Period</td>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">${weekStart} - ${weekEnd}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #f9f9f9; border: 1px solid #e0e0e0; font-weight: bold;">Artists with Earnings</td>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">${artistCount}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #f9f9f9; border: 1px solid #e0e0e0; font-weight: bold;">Total Gross</td>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">${totalGross}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #f9f9f9; border: 1px solid #e0e0e0; font-weight: bold;">Total Artist Payouts</td>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">${totalArtistNet}</td>
      </tr>
    </table>
    
    ${hasApplicationStats ? `
    <h2 style="margin: 20px 0 15px 0; color: #1a1a1a; font-size: 18px;">🎤 Artist Applications This Week</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; font-weight: bold; width: 40%;">✅ Approved</td>
        <td style="padding: 12px; border: 1px solid #c3e6cb; color: #155724; font-weight: bold;">${approvedCount}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #f8d7da; border: 1px solid #f5c6cb; font-weight: bold;">❌ Denied</td>
        <td style="padding: 12px; border: 1px solid #f5c6cb; color: #721c24; font-weight: bold;">${deniedCount}</td>
      </tr>
    </table>
    ` : ''}

    ${hasInvitationStats ? `
    <h2 style="margin: 20px 0 15px 0; color: #1a1a1a; font-size: 18px;">📧 Artist Invitations Summary</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px; background: #e8f4fd; border: 1px solid #b8daff; font-weight: bold; width: 40%;">📝 Generated</td>
        <td style="padding: 12px; border: 1px solid #b8daff; color: #004085; font-weight: bold;">${generatedCount}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #fff3cd; border: 1px solid #ffc107; font-weight: bold;">📤 Sent</td>
        <td style="padding: 12px; border: 1px solid #ffc107; color: #856404; font-weight: bold;">${sentCount}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; font-weight: bold;">✅ Applied</td>
        <td style="padding: 12px; border: 1px solid #c3e6cb; color: #155724; font-weight: bold;">${appliedCount}</td>
      </tr>
    </table>

    ${invitedArtistRows.length > 0 ? `
    <h3 style="margin: 15px 0 10px 0; color: #1a1a1a; font-size: 16px;">Artists Invited This Week</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <tr style="background: #f9f9f9;">
        <th style="padding: 8px; border: 1px solid #e0e0e0; text-align: left;">Artist</th>
        <th style="padding: 8px; border: 1px solid #e0e0e0; text-align: left;">Contact</th>
        <th style="padding: 8px; border: 1px solid #e0e0e0; text-align: left;">Platform</th>
        <th style="padding: 8px; border: 1px solid #e0e0e0; text-align: left;">Status</th>
      </tr>
      ${invitedArtistRows}
    </table>
    ` : ''}
    ` : ''}
    
    <p style="color: #666; font-size: 14px;">
      <strong>Next Step:</strong> Review and approve the batch in the Admin Dashboard → Payouts.
    </p>
  </div>
</body>
</html>
`;
}

function companyPayoutsCompletedEmail(batchCount: number, paidCount: number, totalPaid: string, failedCount: number): string {
  const hasFailures = failedCount > 0;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e0e0e0;">
    <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">${hasFailures ? '⚠️' : '✅'} Payout Processing Complete</h1>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px; background: #f9f9f9; border: 1px solid #e0e0e0; font-weight: bold; width: 40%;">Batches Processed</td>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">${batchCount}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; font-weight: bold;">Successfully Paid</td>
        <td style="padding: 12px; border: 1px solid #c3e6cb; color: #155724;">${paidCount} artists</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; font-weight: bold;">Total Transferred</td>
        <td style="padding: 12px; border: 1px solid #c3e6cb; color: #155724;">${totalPaid}</td>
      </tr>
      ${hasFailures ? `
      <tr>
        <td style="padding: 12px; background: #f8d7da; border: 1px solid #f5c6cb; font-weight: bold;">Failed</td>
        <td style="padding: 12px; border: 1px solid #f5c6cb; color: #721c24;">${failedCount} artists</td>
      </tr>
      ` : ''}
    </table>
    
    ${hasFailures ? `
    <p style="color: #721c24; font-size: 14px; background: #f8d7da; padding: 12px; border-radius: 4px;">
      <strong>Action Required:</strong> Some payouts failed. Review the Admin Dashboard for details and failure reasons.
    </p>
    ` : `
    <p style="color: #155724; font-size: 14px; background: #d4edda; padding: 12px; border-radius: 4px;">
      All payouts processed successfully! 🎉
    </p>
    `}
  </div>
</body>
</html>
`;
}

function companyPayoutsFailedEmail(failures: Array<{ artistName: string; reason: string }>): string {
  const failureRows = failures.map(f => `
    <tr>
      <td style="padding: 12px; border: 1px solid #f5c6cb;">${f.artistName}</td>
      <td style="padding: 12px; border: 1px solid #f5c6cb; color: #721c24;">${f.reason}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e0e0e0;">
    <h1 style="margin: 0 0 20px 0; color: #721c24; font-size: 24px;">🚨 Payout Failures Report</h1>
    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">The following payouts could not be processed:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <th style="padding: 12px; background: #f8d7da; border: 1px solid #f5c6cb; text-align: left;">Artist</th>
        <th style="padding: 12px; background: #f8d7da; border: 1px solid #f5c6cb; text-align: left;">Failure Reason</th>
      </tr>
      ${failureRows}
    </table>
    
    <p style="color: #666; font-size: 14px;">
      Artists have been notified to complete their payout setup. Failed payouts will be retried in the next batch once resolved.
    </p>
  </div>
</body>
</html>
`;
}

interface NotificationRequest {
  type: 'artist_paid' | 'artist_failed' | 'batch_created' | 'payouts_completed' | 'payouts_failed';
  // For artist notifications
  artistEmail?: string;
  artistName?: string;
  amount?: string;
  weekStart?: string;
  weekEnd?: string;
  failureReason?: string;
  // For company notifications
  artistCount?: number;
  totalGross?: string;
  totalArtistNet?: string;
  batchCount?: number;
  paidCount?: number;
  totalPaid?: string;
  failedCount?: number;
  failures?: Array<{ artistName: string; reason: string }>;
  // Artist application stats for weekly batch email
  applicationsApproved?: number;
  applicationsDenied?: number;
  // Artist invitation stats for weekly batch email
  invitationsGenerated?: number;
  invitationsSent?: number;
  invitationsApplied?: number;
  invitedArtists?: Array<{ artist_name: string; contact: string; platform: string; status: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: NotificationRequest = await req.json();
    logStep("Received notification request", { type: request.type });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    let result: { success: boolean; error?: string };

    switch (request.type) {
      case 'artist_paid': {
        if (!request.artistEmail || !request.artistName || !request.amount || !request.weekStart || !request.weekEnd) {
          throw new Error("Missing required fields for artist_paid notification");
        }
        const html = artistPayoutPaidEmail(request.artistName, request.amount, request.weekStart, request.weekEnd);
        result = await sendEmail(resendKey, request.artistEmail, "💰 Your Weekly Payout is On the Way!", html);
        logStep("Artist paid email sent", { email: request.artistEmail, success: result.success });
        break;
      }

      case 'artist_failed': {
        if (!request.artistEmail || !request.artistName || !request.failureReason) {
          throw new Error("Missing required fields for artist_failed notification");
        }
        const html = artistPayoutFailedEmail(request.artistName, request.failureReason);
        result = await sendEmail(resendKey, request.artistEmail, "⚠️ Action Needed: Complete Your Payout Setup", html);
        logStep("Artist failed email sent", { email: request.artistEmail, success: result.success });
        break;
      }

      case 'batch_created': {
        if (!request.weekStart || !request.weekEnd || request.artistCount === undefined || !request.totalGross || !request.totalArtistNet) {
          throw new Error("Missing required fields for batch_created notification");
        }
        const html = companyBatchCreatedEmail(
          request.weekStart, 
          request.weekEnd, 
          request.artistCount, 
          request.totalGross, 
          request.totalArtistNet,
          request.applicationsApproved,
          request.applicationsDenied,
          request.invitationsGenerated,
          request.invitationsSent,
          request.invitationsApplied,
          request.invitedArtists
        );
        result = await sendEmail(resendKey, COMPANY_EMAIL, "📊 Weekly Payout Batch Created - Awaiting Approval", html);
        logStep("Batch created email sent", { 
          success: result.success, 
          applicationsApproved: request.applicationsApproved, 
          applicationsDenied: request.applicationsDenied,
          invitationsGenerated: request.invitationsGenerated
        });
        break;
      }

      case 'payouts_completed': {
        if (request.batchCount === undefined || request.paidCount === undefined || !request.totalPaid || request.failedCount === undefined) {
          throw new Error("Missing required fields for payouts_completed notification");
        }
        const html = companyPayoutsCompletedEmail(request.batchCount, request.paidCount, request.totalPaid, request.failedCount);
        result = await sendEmail(resendKey, COMPANY_EMAIL, `${request.failedCount > 0 ? '⚠️' : '✅'} Payout Processing Complete`, html);
        logStep("Payouts completed email sent", { success: result.success });
        break;
      }

      case 'payouts_failed': {
        if (!request.failures || request.failures.length === 0) {
          throw new Error("Missing failures array for payouts_failed notification");
        }
        const html = companyPayoutsFailedEmail(request.failures);
        result = await sendEmail(resendKey, COMPANY_EMAIL, "🚨 Payout Failures Report", html);
        logStep("Payouts failed email sent", { success: result.success });
        break;
      }

      default:
        throw new Error(`Unknown notification type: ${request.type}`);
    }

    return new Response(
      JSON.stringify({ success: result.success, error: result.error }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
