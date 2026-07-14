/**
 * admin-stats.ts
 *
 * Helpers para consumo das RPCs otimizadas do painel administrativo
 * (definidas em supabase/sql/admin_dashboard_optimization.sql).
 *
 * IMPORTANTE:
 *   - Estes helpers NÃO substituem nenhuma função existente
 *     (getAllSignedContents, getUsers, getAuditLogs continuam intactos).
 *   - São apenas APIs adicionais usadas pelas páginas /admin/*.
 *   - Em caso de erro de RPC, retornam estruturas vazias para que a UI
 *     possa exibir mensagem amigável e o app não quebre.
 */

import { supabase } from './supabase';

/* ----------------------------- Types ----------------------------- */

export interface AdminTimelinePoint {
  date: string;          // YYYY-MM-DD
  assinaturas: number;
  verificacoes: number;
}

export interface AdminTopUser {
  user_id: string;
  nome: string;
  assinaturas: number;
  verificacoes: number;
}

export interface AdminPlatformPoint {
  name: string;
  value: number;
}

export interface AdminDashboardStats {
  total_contents: number;
  total_verifications: number;
  total_users: number;
  timeline: AdminTimelinePoint[];
  top_users: AdminTopUser[];
  platforms: AdminPlatformPoint[];
}

export interface AdminSignedContentRow {
  id: string;
  user_id: string;
  content: string;
  verification_code: string;
  public_key: string;
  platforms: string[] | null;
  folder_id: string | null;
  created_at: string;
  verification_count: number;
  thumbnail: string | null;
  creator_name: string | null;
  creator_social_links: Record<string, string> | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_bucket: string | null;
  carousel_metadata: unknown;
  total_images: number | null;
}

export interface AdminListSignedContentsResult {
  items: AdminSignedContentRow[];
  total: number;
  /**
   * Quando true, a RPC devolveu um conjunto de "preview" (top 5 mais
   * verificados + top 5 mais recentes) por não haver nenhum filtro
   * aplicado. O front exibe um aviso para o admin.
   */
  preview?: boolean;
}

export interface AdminUserRow {
  id: string;
  nome_completo: string;
  nome_publico: string;
  email: string;
  cpf_cnpj: string;
  telefone: string;
  documento_url: string;
  selfie_url: string;
  created_at: string;
  verified: boolean;
  is_admin: boolean;
  blocked: boolean;
}

export interface AdminListUsersResult {
  items: AdminUserRow[];
  total: number;
  verified_count: number;
  admin_count: number;
  today_count: number;
}

export interface AdminAuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminListAuditLogsResult {
  items: AdminAuditLogRow[];
  total: number;
}

export interface AdminUserOption {
  id: string;
  nome_completo: string;
}

/* ----- Plan distribution types ----- */

export type CanonicalPlanType = 'free' | 'creator' | 'creator_pro' | 'creator_elite';

export interface AdminPlanDistributionItem {
  plan_type: string;
  total: number;
}

export interface AdminPlanDistributionResult {
  items: AdminPlanDistributionItem[];
  total_users: number;
}

export interface AdminUserByPlanRow {
  id: string;
  nome_completo: string;
  nome_publico: string;
  email: string;
  cpf_cnpj: string;
  telefone: string;
  selfie_url: string;
  verified: boolean;
  is_admin: boolean;
  blocked: boolean;
  created_at: string;
  plan_type: string;
  subscription_status: string | null;
  subscription_period_end: string | null;
}

export interface AdminListUsersByPlanResult {
  items: AdminUserByPlanRow[];
  total: number;
  plan_type: string;
}

/* ----- Users stats by date (for "Usuários Cadastrados" card) ----- */

export interface AdminUsersStatsDailyPoint {
  date: string; // YYYY-MM-DD
  qtd: number;
}

export interface AdminUsersStatsResult {
  total_all: number;
  total_filtered: number;
  total_previous: number | null;
  growth_pct: number | null;
  daily: AdminUsersStatsDailyPoint[];
  from: string | null;
  to: string | null;
}

export interface AdminUserByPeriodRow {
  id: string;
  nome_completo: string;
  nome_publico: string;
  email: string;
  cpf_cnpj: string;
  telefone: string;
  selfie_url: string;
  verified: boolean;
  is_admin: boolean;
  blocked: boolean;
  created_at: string;
  plan_type: string;
  subscription_status: string | null;
}

export interface AdminListUsersByPeriodResult {
  items: AdminUserByPeriodRow[];
  total: number;
  from: string | null;
  to: string | null;
}

/* --------------------------- Empty fallbacks --------------------------- */

const EMPTY_STATS: AdminDashboardStats = {
  total_contents: 0,
  total_verifications: 0,
  total_users: 0,
  timeline: [],
  top_users: [],
  platforms: [],
};

/* ----------------------------- API ----------------------------- */

/**
 * Retorna todas as estatísticas agregadas do AdminDashboard num único request.
 * Chamada para os 4 cards superiores + 3 gráficos.
 */
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  console.log('📊 [admin-stats] fetchAdminDashboardStats()');
  const { data, error } = await supabase.rpc('admin_dashboard_stats');

  if (error) {
    console.error('❌ [admin-stats] admin_dashboard_stats falhou:', error);
    return EMPTY_STATS;
  }

  // O Postgres retorna jsonb -> o cliente entrega objeto JS direto.
  const payload = (data ?? {}) as Partial<AdminDashboardStats>;

  return {
    total_contents: Number(payload.total_contents ?? 0),
    total_verifications: Number(payload.total_verifications ?? 0),
    total_users: Number(payload.total_users ?? 0),
    timeline: Array.isArray(payload.timeline) ? payload.timeline : [],
    top_users: Array.isArray(payload.top_users) ? payload.top_users : [],
    platforms: Array.isArray(payload.platforms) ? payload.platforms : [],
  };
}

export interface AdminListContentsFilters {
  search?: string;
  userId?: string | null;
  platform?: string | null;
  days?: number | null;      // 0/null = sem filtro
  sort?: 'recent' | 'most-verified' | 'least-verified' | 'alphabetical';
  limit?: number;
  offset?: number;
}

/**
 * Lista paginada de conteúdos assinados para o AdminDashboard.
 */
export async function fetchAdminSignedContents(
  filters: AdminListContentsFilters = {}
): Promise<AdminListSignedContentsResult> {
  const params = {
    p_search:   filters.search   && filters.search.trim().length > 0 ? filters.search.trim() : null,
    p_user_id:  filters.userId   && filters.userId !== 'all'         ? filters.userId        : null,
    p_platform: filters.platform && filters.platform !== 'all'       ? filters.platform      : null,
    p_days:     typeof filters.days === 'number' ? filters.days : null,
    p_sort:     filters.sort ?? 'recent',
    p_limit:    filters.limit ?? 24,
    p_offset:   filters.offset ?? 0,
  };

  console.log('📊 [admin-stats] fetchAdminSignedContents()', params);
  const { data, error } = await supabase.rpc('admin_list_signed_contents', params);

  if (error) {
    console.error('❌ [admin-stats] admin_list_signed_contents falhou:', error);
    return { items: [], total: 0 };
  }

  const payload = (data ?? {}) as Partial<AdminListSignedContentsResult>;
  return {
    items:   Array.isArray(payload.items) ? payload.items : [],
    total:   Number(payload.total ?? 0),
    preview: Boolean(payload.preview ?? false),
  };
}

export interface AdminListUsersFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lista paginada de usuários + agregados (verified/admin/today) num único call.
 */
export async function fetchAdminUsers(
  filters: AdminListUsersFilters = {}
): Promise<AdminListUsersResult> {
  const params = {
    p_search: filters.search && filters.search.trim().length > 0 ? filters.search.trim() : null,
    p_limit:  filters.limit ?? 25,
    p_offset: filters.offset ?? 0,
  };

  console.log('📊 [admin-stats] fetchAdminUsers()', params);
  const { data, error } = await supabase.rpc('admin_list_users', params);

  if (error) {
    console.error('❌ [admin-stats] admin_list_users falhou:', error);
    return {
      items: [],
      total: 0,
      verified_count: 0,
      admin_count: 0,
      today_count: 0,
    };
  }

  const payload = (data ?? {}) as Partial<AdminListUsersResult>;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
    verified_count: Number(payload.verified_count ?? 0),
    admin_count: Number(payload.admin_count ?? 0),
    today_count: Number(payload.today_count ?? 0),
  };
}

export interface AdminListAuditLogsFilters {
  userId?: string | null;
  action?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  limit?: number;
  offset?: number;
}

/**
 * Lista paginada de audit logs com filtros.
 */
export async function fetchAdminAuditLogs(
  filters: AdminListAuditLogsFilters = {}
): Promise<AdminListAuditLogsResult> {
  const params = {
    p_user_id:    filters.userId  && filters.userId  !== 'all' ? filters.userId  : null,
    p_action:     filters.action  && filters.action  !== 'all' ? filters.action  : null,
    p_start_date: filters.startDate ? filters.startDate.toISOString() : null,
    p_end_date:   filters.endDate   ? filters.endDate.toISOString()   : null,
    p_limit:      filters.limit  ?? 50,
    p_offset:     filters.offset ?? 0,
  };

  console.log('📊 [admin-stats] fetchAdminAuditLogs()', params);
  const { data, error } = await supabase.rpc('admin_list_audit_logs', params);

  if (error) {
    console.error('❌ [admin-stats] admin_list_audit_logs falhou:', error);
    return { items: [], total: 0 };
  }

  const payload = (data ?? {}) as Partial<AdminListAuditLogsResult>;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
  };
}

/**
 * Lista enxuta de usuários que aparecem como autores em signed_contents.
 * Usada pelo seletor "Usuário" do filtro do AdminDashboard.
 */
export async function fetchAdminUserOptions(): Promise<AdminUserOption[]> {
  console.log('📊 [admin-stats] fetchAdminUserOptions()');
  const { data, error } = await supabase.rpc('admin_list_user_ids_with_content');

  if (error) {
    console.error('❌ [admin-stats] admin_list_user_ids_with_content falhou:', error);
    return [];
  }

  return Array.isArray(data) ? (data as AdminUserOption[]) : [];
}

/**
 * Distribuição de usuários por tipo de plano (free, creator, creator_pro,
 * creator_elite). Inclui sempre os 4 planos canônicos, mesmo que com total = 0.
 */
export async function fetchAdminPlanDistribution(): Promise<AdminPlanDistributionResult> {
  console.log('📊 [admin-stats] fetchAdminPlanDistribution()');
  const { data, error } = await supabase.rpc('admin_plan_distribution');

  if (error) {
    console.error('❌ [admin-stats] admin_plan_distribution falhou:', error);
    return { items: [], total_users: 0 };
  }

  const payload = (data ?? {}) as Partial<AdminPlanDistributionResult>;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total_users: Number(payload.total_users ?? 0),
  };
}

export interface AdminListUsersByPlanFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Estatísticas do card "Usuários Cadastrados" com filtro de data.
 * - from / to: timestamps ISO (inclusivo no from, exclusivo no to).
 * - Sem from/to → conta total de usuários.
 */
export async function fetchAdminUsersStats(
  from?: string | null,
  to?: string | null
): Promise<AdminUsersStatsResult> {
  console.log('📊 [admin-stats] fetchAdminUsersStats()', { from, to });
  const { data, error } = await supabase.rpc('admin_users_stats', {
    p_from: from ?? null,
    p_to:   to   ?? null,
  });

  if (error) {
    console.error('❌ [admin-stats] admin_users_stats falhou:', error);
    return {
      total_all: 0,
      total_filtered: 0,
      total_previous: null,
      growth_pct: null,
      daily: [],
      from: from ?? null,
      to: to ?? null,
    };
  }

  const payload = (data ?? {}) as Partial<AdminUsersStatsResult>;
  return {
    total_all:       Number(payload.total_all ?? 0),
    total_filtered:  Number(payload.total_filtered ?? 0),
    total_previous:  payload.total_previous ?? null,
    growth_pct:      payload.growth_pct ?? null,
    daily:           Array.isArray(payload.daily) ? payload.daily : [],
    from:            payload.from ?? from ?? null,
    to:              payload.to   ?? to   ?? null,
  };
}

export interface AdminListUsersByPeriodFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lista paginada de usuários criados em determinado período.
 * Drilldown do card "Usuários Cadastrados" com filtro de data.
 */
export async function fetchAdminUsersByPeriod(
  from: string | null,
  to: string | null,
  filters: AdminListUsersByPeriodFilters = {}
): Promise<AdminListUsersByPeriodResult> {
  const params = {
    p_from:   from ?? null,
    p_to:     to   ?? null,
    p_search: filters.search && filters.search.trim().length > 0 ? filters.search.trim() : null,
    p_limit:  filters.limit  ?? 25,
    p_offset: filters.offset ?? 0,
  };

  console.log('📊 [admin-stats] fetchAdminUsersByPeriod()', params);
  const { data, error } = await supabase.rpc('admin_list_users_by_period', params);

  if (error) {
    console.error('❌ [admin-stats] admin_list_users_by_period falhou:', error);
    return { items: [], total: 0, from, to };
  }

  const payload = (data ?? {}) as Partial<AdminListUsersByPeriodResult>;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
    from:  payload.from ?? from,
    to:    payload.to   ?? to,
  };
}

/* ----- Engagement metrics types (Trial Cycle / Activation / Churn) ----- */

export interface AdminTrialCycleBucket {
  label: string;
  day: number;
  qtd: number;
  color: 'green' | 'yellow' | 'orange' | 'red';
}

export interface AdminTrialCycleByDay {
  day_of_cycle: number;
  qtd: number;
}

export interface AdminTrialCycleStatsResult {
  total_in_trial: number;
  buckets: AdminTrialCycleBucket[];
  by_day: AdminTrialCycleByDay[];
}

export interface AdminTrialUserRow {
  id: string;
  nome_completo: string;
  nome_publico: string;
  // 🆕 Opt-in WhatsApp (LGPD). Opcionais para preservar compatibilidade
  //    caso a RPC não retorne os campos (ambientes sem a migração aplicada).
  whatsapp_optin?: boolean;
  whatsapp_optin_at?: string | null;
  email: string;
  cpf_cnpj: string;
  telefone: string;
  selfie_url: string;
  verified: boolean;
  is_admin: boolean;
  blocked: boolean;
  created_at: string;
  plan_type: string;
  trial_start: string;
  trial_end: string;
  day_of_cycle: number;
  days_remaining: number;
}

export interface AdminListUsersInTrialDayResult {
  items: AdminTrialUserRow[];
  total: number;
  day_of_cycle: number;
}

export interface AdminActivationFunnelResult {
  registered: number;
  logged_in: number;
  activated: number;
  engaged: number;
  rate_logged_in: number;
  rate_activated: number;
  rate_engaged: number;
  avg_days_to_activate: number | null;
  from: string | null;
  to: string | null;
}

/* ----- Funnel step drilldown types ----- */

export type AdminFunnelStep = 'registered' | 'logged_in' | 'activated' | 'engaged';

export interface AdminFunnelUserRow {
  id: string;
  nome_completo: string;
  nome_publico: string;
  email: string;
  cpf_cnpj: string;
  telefone: string;
  selfie_url: string;
  verified: boolean;
  is_admin: boolean;
  blocked: boolean;
  created_at: string;
  // 🆕 Opt-in WhatsApp (LGPD). Opcionais para preservar compatibilidade.
  whatsapp_optin?: boolean;
  whatsapp_optin_at?: string | null;
  // Métricas úteis para cada etapa do funil
  login_count: number;
  signed_content_count: number;
  first_signed_at: string | null;
  last_login_at: string | null;
}

export interface AdminListUsersInFunnelStepResult {
  items: AdminFunnelUserRow[];
  total: number;
  step: AdminFunnelStep;
  from: string | null;
  to: string | null;
}

export interface AdminChurnBucketResult {
  qtd: number;
  base: number;
  rate: number;
}

export interface AdminChurnInactiveResult extends AdminChurnBucketResult {
  threshold_days: number;
}

export interface AdminChurnMetricsResult {
  total_users: number;
  trial_abandoned: AdminChurnBucketResult;
  post_trial_churn: AdminChurnBucketResult;
  inactive: AdminChurnInactiveResult;
}

/**
 * 01) Distribuição dos leads pelo dia do ciclo de trial.
 */
export async function fetchAdminTrialCycleStats(): Promise<AdminTrialCycleStatsResult> {
  console.log('📊 [admin-stats] fetchAdminTrialCycleStats()');
  const { data, error } = await supabase.rpc('admin_trial_cycle_stats');

  if (error) {
    console.error('❌ [admin-stats] admin_trial_cycle_stats falhou:', error);
    return { total_in_trial: 0, buckets: [], by_day: [] };
  }

  const payload = (data ?? {}) as Partial<AdminTrialCycleStatsResult>;
  return {
    total_in_trial: Number(payload.total_in_trial ?? 0),
    buckets:        Array.isArray(payload.buckets) ? payload.buckets : [],
    by_day:         Array.isArray(payload.by_day) ? payload.by_day : [],
  };
}

/**
 * Drilldown: lista paginada de usuários no dia X do trial.
 *  - dayOfCycle = 0  → todos em trial
 *  - dayOfCycle 1..6 → exato
 *  - dayOfCycle 7    → dia 7+
 */
export async function fetchAdminUsersInTrialDay(
  dayOfCycle: number,
  filters: { search?: string; limit?: number; offset?: number } = {}
): Promise<AdminListUsersInTrialDayResult> {
  const params = {
    p_day_of_cycle: dayOfCycle,
    p_search: filters.search && filters.search.trim().length > 0 ? filters.search.trim() : null,
    p_limit:  filters.limit  ?? 25,
    p_offset: filters.offset ?? 0,
  };

  console.log('📊 [admin-stats] fetchAdminUsersInTrialDay()', params);
  const { data, error } = await supabase.rpc('admin_list_users_in_trial_day', params);

  if (error) {
    console.error('❌ [admin-stats] admin_list_users_in_trial_day falhou:', error);
    return { items: [], total: 0, day_of_cycle: dayOfCycle };
  }

  const payload = (data ?? {}) as Partial<AdminListUsersInTrialDayResult>;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
    day_of_cycle: Number(payload.day_of_cycle ?? dayOfCycle),
  };
}

/**
 * 02) Funil: Cadastrados → Logaram → Ativaram (1º conteúdo) → Engajaram (3+).
 */
export async function fetchAdminActivationFunnel(
  from?: string | null,
  to?: string | null
): Promise<AdminActivationFunnelResult> {
  console.log('📊 [admin-stats] fetchAdminActivationFunnel()', { from, to });
  const { data, error } = await supabase.rpc('admin_activation_funnel', {
    p_from: from ?? null,
    p_to:   to   ?? null,
  });

  if (error) {
    console.error('❌ [admin-stats] admin_activation_funnel falhou:', error);
    return {
      registered: 0,
      logged_in: 0,
      activated: 0,
      engaged: 0,
      rate_logged_in: 0,
      rate_activated: 0,
      rate_engaged: 0,
      avg_days_to_activate: null,
      from: from ?? null,
      to: to ?? null,
    };
  }

  const payload = (data ?? {}) as Partial<AdminActivationFunnelResult>;
  return {
    registered:           Number(payload.registered ?? 0),
    logged_in:            Number(payload.logged_in ?? 0),
    activated:            Number(payload.activated ?? 0),
    engaged:              Number(payload.engaged ?? 0),
    rate_logged_in:       Number(payload.rate_logged_in ?? 0),
    rate_activated:       Number(payload.rate_activated ?? 0),
    rate_engaged:         Number(payload.rate_engaged ?? 0),
    avg_days_to_activate: payload.avg_days_to_activate ?? null,
    from:                 payload.from ?? from ?? null,
    to:                   payload.to   ?? to   ?? null,
  };
}

/**
 * Drilldown: lista paginada de usuários em uma etapa do funil de ativação.
 * step ∈ 'registered' | 'logged_in' | 'activated' | 'engaged'.
 * from/to = mesmo range aplicado ao card do funil.
 */
export async function fetchAdminUsersInFunnelStep(
  step: AdminFunnelStep,
  from: string | null,
  to: string | null,
  filters: { search?: string; limit?: number; offset?: number } = {}
): Promise<AdminListUsersInFunnelStepResult> {
  const params = {
    p_step:   step,
    p_from:   from ?? null,
    p_to:     to   ?? null,
    p_search: filters.search && filters.search.trim().length > 0 ? filters.search.trim() : null,
    p_limit:  filters.limit  ?? 25,
    p_offset: filters.offset ?? 0,
  };

  console.log('📊 [admin-stats] fetchAdminUsersInFunnelStep()', params);
  const { data, error } = await supabase.rpc('admin_list_users_in_funnel_step', params);

  if (error) {
    console.error('❌ [admin-stats] admin_list_users_in_funnel_step falhou:', error);
    return { items: [], total: 0, step, from, to };
  }

  const payload = (data ?? {}) as Partial<AdminListUsersInFunnelStepResult>;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
    step:  (payload.step as AdminFunnelStep) ?? step,
    from:  payload.from ?? from,
    to:    payload.to   ?? to,
  };
}

/**
 * 04) Métricas de abandono: trial / pós-trial / inatividade.
 */
export async function fetchAdminChurnMetrics(
  inactiveDaysThreshold = 30
): Promise<AdminChurnMetricsResult> {
  console.log('📊 [admin-stats] fetchAdminChurnMetrics()', { inactiveDaysThreshold });
  const { data, error } = await supabase.rpc('admin_churn_metrics', {
    p_inactive_days_threshold: inactiveDaysThreshold,
  });

  if (error) {
    console.error('❌ [admin-stats] admin_churn_metrics falhou:', error);
    return {
      total_users: 0,
      trial_abandoned:  { qtd: 0, base: 0, rate: 0 },
      post_trial_churn: { qtd: 0, base: 0, rate: 0 },
      inactive:         { qtd: 0, base: 0, rate: 0, threshold_days: inactiveDaysThreshold },
    };
  }

  const payload = (data ?? {}) as Partial<AdminChurnMetricsResult>;
  return {
    total_users: Number(payload.total_users ?? 0),
    trial_abandoned: {
      qtd:  Number(payload.trial_abandoned?.qtd  ?? 0),
      base: Number(payload.trial_abandoned?.base ?? 0),
      rate: Number(payload.trial_abandoned?.rate ?? 0),
    },
    post_trial_churn: {
      qtd:  Number(payload.post_trial_churn?.qtd  ?? 0),
      base: Number(payload.post_trial_churn?.base ?? 0),
      rate: Number(payload.post_trial_churn?.rate ?? 0),
    },
    inactive: {
      qtd:            Number(payload.inactive?.qtd  ?? 0),
      base:           Number(payload.inactive?.base ?? 0),
      rate:           Number(payload.inactive?.rate ?? 0),
      threshold_days: Number(payload.inactive?.threshold_days ?? inactiveDaysThreshold),
    },
  };
}

/**
 * Lista paginada de usuários de um plano específico.
 * Usada pelo drilldown ao clicar num plano da distribuição.
 */
export async function fetchAdminUsersByPlan(
  planType: string,
  filters: AdminListUsersByPlanFilters = {}
): Promise<AdminListUsersByPlanResult> {
  const params = {
    p_plan_type: planType,
    p_search: filters.search && filters.search.trim().length > 0 ? filters.search.trim() : null,
    p_limit:  filters.limit  ?? 25,
    p_offset: filters.offset ?? 0,
  };

  console.log('📊 [admin-stats] fetchAdminUsersByPlan()', params);
  const { data, error } = await supabase.rpc('admin_list_users_by_plan', params);

  if (error) {
    console.error('❌ [admin-stats] admin_list_users_by_plan falhou:', error);
    return { items: [], total: 0, plan_type: planType };
  }

  const payload = (data ?? {}) as Partial<AdminListUsersByPlanResult>;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
    plan_type: payload.plan_type ?? planType,
  };
}

/* --------------------------- Adapters --------------------------- */

/**
 * Converte uma linha do payload da RPC `admin_list_signed_contents`
 * (snake_case) para o formato `SignedContent` (camelCase) usado pelo
 * componente `ContentCard` e pelo resto do app.
 *
 * IMPORTANTE: esta conversão é apenas de FORMATO. Não altera regras
 * de negócio nem fluxo de assinatura/verificação. A página AdminDashboard
 * exibe a lista somente em modo leitura via ContentCard, então não há
 * necessidade dos campos `contentHash` e `signature` (omitidos pela RPC
 * para reduzir tráfego). Os tipos opcionais já cobrem isso.
 */
export function adaptAdminSignedContent(
  row: AdminSignedContentRow
): import('./supabase-crypto').SignedContent {
  // carousel_metadata pode vir como string JSON em casos legados — repete o
  // mesmo parsing que `getAllSignedContents` faz.
  let parsedCarouselMetadata: unknown = row.carousel_metadata;
  if (row.carousel_metadata && typeof row.carousel_metadata === 'string') {
    try {
      parsedCarouselMetadata = JSON.parse(row.carousel_metadata);
    } catch (err) {
      console.error('❌ [admin-stats] Falha ao parsear carousel_metadata:', err);
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    // Campos pesados não trazidos pela RPC — colocamos strings vazias para
    // satisfazer o tipo. ContentCard não exige esses valores para renderizar.
    contentHash: '',
    signature: '',
    verificationCode: row.verification_code,
    publicKey: row.public_key,
    platforms: row.platforms ?? [],
    folderId: row.folder_id ?? null,
    createdAt: row.created_at,
    verificationCount: row.verification_count ?? 0,
    thumbnail: row.thumbnail ?? undefined,
    creatorName: row.creator_name ?? undefined,
    creatorSocialLinks: row.creator_social_links ?? undefined,
    filePath: row.file_path ?? undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ?? undefined,
    mimeType: row.mime_type ?? undefined,
    storageBucket: row.storage_bucket ?? undefined,
    carouselMetadata: (parsedCarouselMetadata as Record<string, unknown>) ?? undefined,
    totalImages: row.total_images ?? undefined,
  };
}

/* ============================================================= */
/* ===== Revenue Metrics (bloco "Receita e Faturamento") ======= */
/* ============================================================= */
/**
 * Helpers para as RPCs `admin_revenue_metrics` e `admin_revenue_timeline`
 * definidas em `supabase/sql/admin_revenue_metrics.sql`.
 *
 * IMPORTANTE:
 *  - NÃO substituem nenhum helper existente.
 *  - Só leem `subscriptions` e `billing_audit` (via RPCs SECURITY DEFINER).
 *  - Em caso de erro devolvem estruturas vazias/seguras para a UI.
 */

export type AdminRevenueRange = 'this_month' | 'last_month' | 'last_90d' | 'this_year' | 'all';

export interface AdminRevenueStatusBreakdownItem {
  status: string;
  total: number;
}

export interface AdminRevenueLtvItem {
  plan_type: string;
  price_cents: number;
  avg_months: number;
  sample_size: number;
  ltv_cents: number | null;
}

export interface AdminRevenueRenewals30d {
  succeeded: number;
  failed: number;
  skipped: number;
  window_days: number;
}

export interface AdminRevenuePayments {
  processed: number;
  failed: number;
  refunded: number;
}

export interface AdminRevenuePlanChanges {
  upgrades: number;
  downgrades: number;
  lateral: number;
  scheduled_downgrades: number;
}

export interface AdminRevenueCoupons {
  total_with_coupon: number;
  total_discount_cents: number;
  has_data: boolean;
}

export interface AdminRevenueMetricsResult {
  range: AdminRevenueRange;
  from: string | null;
  to: string | null;
  now: string | null;

  mrr_cents: number;
  arr_cents: number;
  paying_users: number;
  arpu_cents: number;

  total_accum_cents: number;
  revenue_range_cents: number;
  revenue_prev_cents: number;
  variation_pct: number | null;

  status_breakdown: AdminRevenueStatusBreakdownItem[];
  ltv_by_plan: AdminRevenueLtvItem[];
  renewals_30d: AdminRevenueRenewals30d;
  payments: AdminRevenuePayments;
  plan_changes: AdminRevenuePlanChanges;
  coupons: AdminRevenueCoupons;
}

export interface AdminRevenueTimelinePoint {
  date: string;          // YYYY-MM-DD
  revenue_cents: number;
}

const EMPTY_REVENUE_METRICS: AdminRevenueMetricsResult = {
  range: 'this_month',
  from: null,
  to: null,
  now: null,

  mrr_cents: 0,
  arr_cents: 0,
  paying_users: 0,
  arpu_cents: 0,

  total_accum_cents: 0,
  revenue_range_cents: 0,
  revenue_prev_cents: 0,
  variation_pct: null,

  status_breakdown: [],
  ltv_by_plan: [],
  renewals_30d: { succeeded: 0, failed: 0, skipped: 0, window_days: 30 },
  payments: { processed: 0, failed: 0, refunded: 0 },
  plan_changes: { upgrades: 0, downgrades: 0, lateral: 0, scheduled_downgrades: 0 },
  coupons: { total_with_coupon: 0, total_discount_cents: 0, has_data: false },
};

/**
 * Métricas agregadas de receita para o AdminDashboard.
 */
export async function fetchAdminRevenueMetrics(
  range: AdminRevenueRange = 'this_month'
): Promise<AdminRevenueMetricsResult> {
  console.log('📊 [admin-stats] fetchAdminRevenueMetrics()', { range });
  const { data, error } = await supabase.rpc('admin_revenue_metrics', { p_range: range });

  if (error) {
    console.error('❌ [admin-stats] admin_revenue_metrics falhou:', error);
    return { ...EMPTY_REVENUE_METRICS, range };
  }

  const p = (data ?? {}) as Partial<AdminRevenueMetricsResult>;
  return {
    range:                (p.range as AdminRevenueRange) ?? range,
    from:                 p.from ?? null,
    to:                   p.to ?? null,
    now:                  p.now ?? null,

    mrr_cents:            Number(p.mrr_cents ?? 0),
    arr_cents:            Number(p.arr_cents ?? 0),
    paying_users:         Number(p.paying_users ?? 0),
    arpu_cents:           Number(p.arpu_cents ?? 0),

    total_accum_cents:    Number(p.total_accum_cents ?? 0),
    revenue_range_cents:  Number(p.revenue_range_cents ?? 0),
    revenue_prev_cents:   Number(p.revenue_prev_cents ?? 0),
    variation_pct:        p.variation_pct === null || p.variation_pct === undefined
                            ? null
                            : Number(p.variation_pct),

    status_breakdown:     Array.isArray(p.status_breakdown) ? p.status_breakdown : [],
    ltv_by_plan:          Array.isArray(p.ltv_by_plan) ? p.ltv_by_plan : [],
    renewals_30d: {
      succeeded:   Number(p.renewals_30d?.succeeded ?? 0),
      failed:      Number(p.renewals_30d?.failed ?? 0),
      skipped:     Number(p.renewals_30d?.skipped ?? 0),
      window_days: Number(p.renewals_30d?.window_days ?? 30),
    },
    payments: {
      processed: Number(p.payments?.processed ?? 0),
      failed:    Number(p.payments?.failed ?? 0),
      refunded:  Number(p.payments?.refunded ?? 0),
    },
    plan_changes: {
      upgrades:             Number(p.plan_changes?.upgrades ?? 0),
      downgrades:           Number(p.plan_changes?.downgrades ?? 0),
      lateral:              Number(p.plan_changes?.lateral ?? 0),
      scheduled_downgrades: Number(p.plan_changes?.scheduled_downgrades ?? 0),
    },
    coupons: {
      total_with_coupon:    Number(p.coupons?.total_with_coupon ?? 0),
      total_discount_cents: Number(p.coupons?.total_discount_cents ?? 0),
      has_data:             Boolean(p.coupons?.has_data ?? false),
    },
  };
}

/**
 * Série diária de receita (últimos N dias) para o mini-gráfico do card.
 */
export async function fetchAdminRevenueTimeline(
  days: number = 30
): Promise<AdminRevenueTimelinePoint[]> {
  console.log('📊 [admin-stats] fetchAdminRevenueTimeline()', { days });
  const { data, error } = await supabase.rpc('admin_revenue_timeline', { p_days: days });

  if (error) {
    console.error('❌ [admin-stats] admin_revenue_timeline falhou:', error);
    return [];
  }

  if (!Array.isArray(data)) return [];
  return (data as Array<Partial<AdminRevenueTimelinePoint>>).map(pt => ({
    date:          String(pt.date ?? ''),
    revenue_cents: Number(pt.revenue_cents ?? 0),
  }));
}