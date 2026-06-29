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