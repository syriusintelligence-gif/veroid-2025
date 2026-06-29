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
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
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