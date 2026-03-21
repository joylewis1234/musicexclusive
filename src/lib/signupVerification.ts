import { supabase } from "@/integrations/supabase/client";

export type SignupIntent = "fan" | "artist-signup" | "artist-setup";
export type SignupFlow = "invite" | "superfan" | null;

export interface StartSignupVerificationRequest {
  intent: SignupIntent;
  email: string;
  password: string;
  displayName?: string;
  applicationId?: string;
  inviteToken?: string;
  inviteType?: string;
  flow?: SignupFlow;
  next?: string;
}

export interface StartSignupVerificationResponse {
  success: boolean;
  status?: "verification_sent" | "verification_resent" | "account_exists";
  error?: string;
  error_code?: string;
  message?: string;
}

export interface CompleteSignupVerificationRequest {
  intent: SignupIntent;
  displayName?: string;
}

export interface CompleteSignupVerificationResponse {
  success: boolean;
  email?: string;
  error?: string;
}

export async function startSignupVerification(request: StartSignupVerificationRequest) {
  const { data, error } = await supabase.functions.invoke("start-signup-verification", {
    body: request,
  });

  if (error) {
    throw error;
  }

  return (data ?? {}) as StartSignupVerificationResponse;
}

export async function completeSignupVerification(request: CompleteSignupVerificationRequest) {
  const { data, error } = await supabase.functions.invoke("complete-signup-verification", {
    body: request,
  });

  if (error) {
    throw error;
  }

  return (data ?? {}) as CompleteSignupVerificationResponse;
}
