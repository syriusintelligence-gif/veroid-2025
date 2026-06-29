-- =============================================================================
-- admin_users_date_filter.sql
--
-- RPCs para o card "Usuários Cadastrados" com filtro por data.
--
-- Adiciona:
--   1. admin_users_stats(p_from, p_to)         → contagem com filtro de
--      período + comparação com o período anterior + breakdown por dia.
--   2. admin_list_users_by_period(...)         → lista paginada de usuários
--      criados em determinado período (drilldown).
--
-- Critério: filtra por `users.created_at` no intervalo [p_from, p_to).
--   - Se ambos forem NULL → conta TODOS os usuários cadastrados.
--   - Se apenas p_from for informado → conta a partir dessa data até agora.
--   - Se apenas p_to for informado → conta de sempre até essa data.
--
-- Segurança: SECURITY DEFINER + checagem de admin via _admin_only().
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) admin_users_stats(p_from, p_to)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_users_stats(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_all          int;
  v_total_filtered     int;
  v_total_previous     int;
  v_growth_pct         numeric;
  v_daily              jsonb;
  v_prev_from          timestamptz;
  v_prev_to            timestamptz;
  v_period_seconds     numeric;
BEGIN
  PERFORM public._admin_only();

  -- Total geral (sem filtro), útil como referência para o card
  SELECT COUNT(*) INTO v_total_all FROM public.users;

  -- Total filtrado pelo período
  SELECT COUNT(*)
    INTO v_total_filtered
    FROM public.users u
   WHERE (p_from IS NULL OR u.created_at >= p_from)
     AND (p_to   IS NULL OR u.created_at <  p_to);

  -- Período anterior (para comparação de crescimento)
  -- Só calcula se tivermos os dois lados do intervalo.
  IF p_from IS NOT NULL AND p_to IS NOT NULL THEN
    v_period_seconds := EXTRACT(EPOCH FROM (p_to - p_from));
    v_prev_to   := p_from;
    v_prev_from := p_from - make_interval(secs => v_period_seconds);

    SELECT COUNT(*)
      INTO v_total_previous
      FROM public.users u
     WHERE u.created_at >= v_prev_from
       AND u.created_at <  v_prev_to;

    IF v_total_previous = 0 THEN
      -- Evita divisão por zero: se anterior=0 e atual>0 → 100% de "crescimento"
      v_growth_pct := CASE WHEN v_total_filtered > 0 THEN 100 ELSE 0 END;
    ELSE
      v_growth_pct := ROUND(
        ((v_total_filtered - v_total_previous)::numeric / v_total_previous::numeric) * 100,
        2
      );
    END IF;
  ELSE
    v_total_previous := NULL;
    v_growth_pct     := NULL;
  END IF;

  -- Breakdown diário (só faz sentido com p_from e p_to definidos e <= 366 dias)
  IF p_from IS NOT NULL AND p_to IS NOT NULL
     AND (p_to - p_from) <= INTERVAL '366 days' THEN
    WITH days AS (
      SELECT generate_series(
               (p_from AT TIME ZONE 'UTC')::date,
               ((p_to - INTERVAL '1 second') AT TIME ZONE 'UTC')::date,
               '1 day'::interval
             )::date AS d
    ),
    agg AS (
      SELECT (created_at AT TIME ZONE 'UTC')::date AS d,
             COUNT(*) AS qtd
        FROM public.users
       WHERE created_at >= p_from
         AND created_at <  p_to
       GROUP BY 1
    )
    SELECT COALESCE(jsonb_agg(
             jsonb_build_object(
               'date', to_char(days.d, 'YYYY-MM-DD'),
               'qtd',  COALESCE(agg.qtd, 0)
             )
             ORDER BY days.d
           ), '[]'::jsonb)
      INTO v_daily
      FROM days
      LEFT JOIN agg ON agg.d = days.d;
  ELSE
    v_daily := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'total_all',       v_total_all,
    'total_filtered',  v_total_filtered,
    'total_previous',  v_total_previous,
    'growth_pct',      v_growth_pct,
    'daily',           v_daily,
    'from',            p_from,
    'to',              p_to
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_users_stats(timestamptz, timestamptz) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) admin_list_users_by_period(p_from, p_to, p_search, p_limit, p_offset)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users_by_period(
  p_from   timestamptz DEFAULT NULL,
  p_to     timestamptz DEFAULT NULL,
  p_search text        DEFAULT NULL,
  p_limit  int         DEFAULT 25,
  p_offset int         DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total  int;
  v_items  jsonb;
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
BEGIN
  PERFORM public._admin_only();

  WITH active_subs AS (
    SELECT DISTINCT ON (s.user_id)
           s.user_id,
           s.plan_type,
           s.status
      FROM public.subscriptions s
     WHERE s.status IN ('trialing','active','past_due')
     ORDER BY s.user_id, s.created_at DESC
  ),
  filtered AS (
    SELECT u.*,
           COALESCE(a.plan_type, 'free') AS plan_type,
           a.status                       AS subscription_status
      FROM public.users u
      LEFT JOIN active_subs a ON a.user_id = u.id
     WHERE (p_from IS NULL OR u.created_at >= p_from)
       AND (p_to   IS NULL OR u.created_at <  p_to)
       AND (
         v_search IS NULL
         OR u.nome_completo ILIKE '%' || v_search || '%'
         OR u.nome_publico  ILIKE '%' || v_search || '%'
         OR u.email         ILIKE '%' || v_search || '%'
         OR u.cpf_cnpj      ILIKE '%' || v_search || '%'
       )
  )
  SELECT
    (SELECT COUNT(*) FROM filtered),
    COALESCE(
      jsonb_agg(jsonb_build_object(
        'id',                  f.id,
        'nome_completo',       f.nome_completo,
        'nome_publico',        f.nome_publico,
        'email',               f.email,
        'cpf_cnpj',            f.cpf_cnpj,
        'telefone',            f.telefone,
        'selfie_url',          f.selfie_url,
        'verified',            f.verified,
        'is_admin',            f.is_admin,
        'blocked',             f.blocked,
        'created_at',          f.created_at,
        'plan_type',           f.plan_type,
        'subscription_status', f.subscription_status
      ) ORDER BY f.created_at DESC), '[]'::jsonb
    )
  INTO v_total, v_items
  FROM (
    SELECT *
      FROM filtered
     ORDER BY created_at DESC
     LIMIT  GREATEST(p_limit, 1)
     OFFSET GREATEST(p_offset, 0)
  ) f;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'from',  p_from,
    'to',    p_to
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users_by_period(timestamptz, timestamptz, text, int, int) TO authenticated;

COMMIT;