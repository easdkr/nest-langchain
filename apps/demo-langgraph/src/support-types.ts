export type CustomerTier = 'free' | 'pro' | 'enterprise';
export type SupportIntent =
  | 'billing'
  | 'delivery'
  | 'technical'
  | 'refund'
  | 'general';
export type SupportPriority = 'low' | 'medium' | 'high' | 'critical';
export type ReviewArea =
  | 'account'
  | 'engineering'
  | 'incident'
  | 'logistics'
  | 'policy';
export type DraftProviderName = 'openai' | 'openai-compatible' | 'fallback';

export interface SupportIntakeInput {
  message: string;
  customerTier: CustomerTier;
  channel: string;
  approvalRequired: boolean;
}

export interface SupportPolicyInput {
  intent: SupportIntent;
  priority: SupportPriority;
  routingKey: string;
  customerTier: CustomerTier;
}

export interface SupportPolicyResult {
  queue: string;
  summary: string;
  requiredReviews: ReviewArea[];
}

export interface ApprovalDecision {
  approved: boolean;
  reviewer: string;
  note?: string;
}

export interface ApprovalInterruptPayload {
  action: 'approve_support_response';
  message: string;
  routingKey: string;
  priority: SupportPriority;
  policySummary: string;
  reviewNotes: string[];
}

export interface DraftRequest {
  message: string;
  routingKey: string;
  priority: SupportPriority;
  policySummary: string;
  reviewNotes: string[];
  approvalNote?: string;
}

export interface DraftResult {
  provider: DraftProviderName;
  response: string;
}
