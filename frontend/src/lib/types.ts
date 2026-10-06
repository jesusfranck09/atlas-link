export type Role = 'PLATFORM_ADMIN' | 'HOSPITAL_ADMIN' | 'BILLING' | 'REVIEWER' | 'DIRECTOR' | 'INSURER_DEMO';
export type Lane = 'GREEN' | 'YELLOW' | 'RED';
export type AccountStatus = 'RECEIVED' | 'EVALUATED' | 'IN_REVIEW' | 'READY' | 'SENT' | 'RESOLVED';
export interface User { id: string; name: string; email: string; role: Role; tenantId: string | null; tenantName: string; active?: boolean; createdAt?: string }
export interface Session { token: string; expiresAt: string; user: User }
export interface DemoProfile { email: string; name: string; role: Role; tenantName: string; password: string }
export interface HistoryItem { id: string; action: string; actor: string; createdAt: string; detail: string }
export interface Account { id: string; folio: string; patientReference: string; insurer: string; insurerId: string; admissionDate: string; dischargeDate: string; total: number; lane: Lane; status: AccountStatus; anomalyCount: number; assignedTo: string | null; createdAt: string; version: number }
export interface AccountPage {items: Account[]; total: number; offset: number; limit: number}
export interface AccountReport {totalAccounts: number; totalBilled: number; greenCount: number; resolvedCount: number; byLane: Record<Lane, number>; byInsurer: {insurerId: string; name: string; count: number; total: number; green: number; pending: number}[]}
export interface EvaluationSummary {id: string; agreementId: string | null; agreementVersion: number | null; engineVersion: string; engineArtifactSha256: string | null; lane: Lane; createdAt: string; previousEvaluationId: string | null; evidenceAvailable: boolean}
export interface HistoricalEvaluation extends EvaluationSummary {
  accountId: string; billedTotal: number; excludedTotal: number; tariffAdjustment: number; deductible: number; coinsurance: number; insurerEstimate: number; patientEstimate: number; unresolvedAmount: number; findings: Finding[];
  inputSnapshot: {accountId: string; accountVersion: number; folio: string; patientReference: string; insurerId: string; policyNumber: string; diagnosisCode: string; admissionDate: string; dischargeDate: string; policy: Policy | null; lines: {id: string; code: string; description: string; category: string; quantity: number; unitPrice: number; removed: boolean; justification: string | null; serviceDate: string | null; version: number}[]} | null;
  rulesSnapshot: {schemaVersion: number; agreementId: string | null; agreementVersion: number | null; validFrom: string | null; validTo: string | null; resolvedForAdmissionDate: string; rules: {tariffs: Record<string, number>; excludedCodes: string[]; maxQuantities: Record<string, number>; highRiskThreshold: number} | null} | null;
  resultSnapshot: Record<string, unknown> | null;
}
export interface AccountLine { id: string; code: string; description: string; category: string; quantity: number; unitPrice: number; total: number; status: string; reason: string | null; justification: string | null }
export interface Finding { lineId?: string; code: string; message: string; severity: string; amount: number }
export interface Evaluation { billedTotal: number; excludedTotal: number; tariffAdjustment: number; deductible: number; coinsurance: number; insurerEstimate: number; patientEstimate: number; unresolvedAmount: number; lane: Lane; findings: Finding[]; agreementVersion: number; engineVersion: string; createdAt: string }
export interface Policy { deductible: number; coinsuranceRate: number; coinsuranceCap: number; coverageAvailable: number }
export interface AccountDetail extends Account { policyNumber: string; diagnosis: string; policy: Policy | null; lines: AccountLine[]; evaluation: Evaluation | null; history: HistoryItem[] }
export interface Insurer { id: string; name: string; code: string }
export interface Dashboard { totalAccounts: number; pendingReview: number; readyToSend: number; totalBilled: number; insurerEstimate: number; patientEstimate: number; unresolvedAmount: number; byLane: Record<Lane, number>; recentAccounts: Account[]; monthly: { label: string; total: number; count: number }[]; activity: HistoryItem[]; activeTenants?: number; activeLicenses?: number; monthlyCapacity?: number; leadsCount?: number }
export interface Agreement { id: string; name: string; insurerId: string; insurer: string; version: number; status: 'DRAFT' | 'PUBLISHED'; validFrom: string; validTo: string; rules: { tariffs: Record<string, number>; excludedCodes: string[]; maxQuantities: Record<string, number>; highRiskThreshold: number }; createdAt: string }
export interface Tenant { id: string; name: string; slug: string; status: string; createdAt: string; accountCount: number; userCount: number; provisioning?: {status: 'READY' | 'PENDING'; message?: string} }
export interface License { id: string; tenantId: string; tenantName: string; plan: string; status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'; monthlyAccountLimit: number; seatLimit: number; startsAt: string; expiresAt: string; usedAccounts: number | null; version: number }
export interface Lead { id: string; name: string; email: string; organization: string; message: string; createdAt: string }
