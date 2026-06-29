-- =====================================================================
-- ADMIN ENGAGEMENT METRICS — 3 novas RPCs SOMENTE-LEITURA
-- =====================================================================
-- Propósito:
--   Adicionar ao painel administrativo 3 novas métricas, sem alterar
--   nenhuma tabela, RLS ou função existente:
--
--   01) admin_trial_cycle_stats     → "Dia do Ciclo" (em que dia do
--       teste cada lead está).
--   02) admin_activation_funnel     → Funil: Cadastrados → Logaram →
--       Ativaram (1º conteúdo) → Engajaram (3+ conteúdos).
--   03) admin_churn_metrics         → Taxa de Abandono — 3 visões:
--       trial / pós-trial / inatividade.
--
--   Bônus (lista paginada para drilldown):
--   - admin_list_users_in_trial_day(p_day_of_cycle, p_search, p_limit,
--     p_offset)  → lista usuários no dia X do trial.
--
-- Características:
--   - 100% idempotente (CREATE OR REPLACE).
--   - SECURITY DEFINER + checagem `is_admin` no caller (mesmo padrão
--     das RPCs já existentes em admin_dashboard_optimization.sql).
--   - NÃO altera nenhum objeto pré-existente.
--   - NÃO insere, atualiza ou deleta dados.
--
-- Como aplicar:
--   1) Abrir o SQL Editor do Supabase do projeto Vero iD.
--   2) Colar este arquivo e rodar.
--
-- Como reverter:
--   Ver bloco "ROLLBACK" no final.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helpers internos (privados a este arquivo)
-- ---------------------------------------------------------------------

-- Verifica se o caller atual é admin. Retorna boolean.
-- Reaproveita o critério já usado pelas demais RPCs (`public.users.is_admin`).
CREATE OR REPLACE FUNCTION public._admin_engagement_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.is_admin FROM public.users u WHERE u.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public._admin_engagement_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._admin_engagement_is_admin() TO authenticated;


-- =====================================================================
-- 01) admin_trial_cycle_stats
-- ---------------------------------------------------------------------
--   Mostra a distribuição dos leads pelo dia do ciclo de trial.
--
--   Critério de "lead em trial":
--     - Possui uma row em public.subscriptions com:
--         status = 'trialing'
--         trial_start IS NOT NULL
--         trial_end   IS NOT NULL
--         (trial_end > NOW())            ← trial ativo
--     - Pega a MAIS RECENTE por user_id (no caso de várias rows).
--
--   Saída (jsonb):
--     {
--       "total_in_trial": 42,
--       "buckets": [
--         { "label": "Dia 1",    "day": 1,   "qtd": 5,  "color": "green"  },
--         ...
--         { "label": "Dia 7+",   "day": 7,   "qtd": 12, "color": "red"    }
--       ],
--       "by_day": [ {"day_of_cycle": 1, "qtd": 5}, {"day_of_cycle": 2, ...} ]
--     }
--
--   day_of_cycle = floor( (NOW() - trial_start) / 1 day ) + 1   (clamped >=1)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_trial_cycle_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public._admin_engagement_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem chamar admin_trial_cycle_stats';
  END IF;

  WITH latest_trial AS (
    -- 1 row por user: a subscription mais recente em trialing ativo.
    SELECT DISTINCT ON (s.user_id)
           s.user_id,
           s.trial_start,
           s.trial_end,
           s.status
      FROM public.subscriptions s
     WHERE s.status = 'trialing'
       AND s.trial_start IS NOT NULL
       AND s.trial_end   IS NOT NULL
       AND s.trial_end   > NOW()
     ORDER BY s.user_id, s.created_at DESC
  ),
  per_user AS (
    SELECT
      user_id,
      trial_start,
      trial_end,
      GREATEST(
        1,
        (FLOOR(EXTRACT(EPOCH FROM (NOW() - trial_start)) / 86400)::int + 1)
      ) AS day_of_cycle,
      GREATEST(
        0,
        CEIL(EXTRACT(EPOCH FROM (trial_end - NOW())) / 86400)::int
      ) AS days_remaining,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (trial_end - trial_start)) / 86400)::int
      ) AS trial_total_days
    FROM latest_trial
  ),
  buckets AS (
    SELECT
      jsonb_build_array(
        jsonb_build_object('label', 'Dia 1',  'day', 1,
          'qtd', (SELECT COUNT(*) FROM per_user WHERE day_of_cycle = 1),
          'color', 'green'),
        jsonb_build_object('label', 'Dia 2',  'day', 2,
          'qtd', (SELECT COUNT(*) FROM per_user WHERE day_of_cycle = 2),
          'color', 'green'),
        jsonb_build_object('label', 'Dia 3',  'day', 3,
          'qtd', (SELECT COUNT(*) FROM per_user WHERE day_of_cycle = 3),
          'color', 'yellow'),
        jsonb_build_object('label', 'Dia 4',  'day', 4,
          'qtd', (SELECT COUNT(*) FROM per_user WHERE day_of_cycle = 4),
          'color', 'yellow'),
        jsonb_build_object('label', 'Dia 5',  'day', 5,
          'qtd', (SELECT COUNT(*) FROM per_user WHERE day_of_cycle = 5),
          'color', 'orange'),
        jsonb_build_object('label', 'Dia 6',  'day', 6,
          'qtd', (SELECT COUNT(*) FROM per_user WHERE day_of_cycle = 6),
          'color', 'orange'),
        jsonb_build_object('label', 'Dia 7+', 'day', 7,
          'qtd', (SELECT COUNT(*) FROM per_user WHERE day_of_cycle >= 7),
          'color', 'red')
      ) AS arr
  ),
  by_day AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('day_of_cycle', day_of_cycle, 'qtd', qtd)
        ORDER BY day_of_cycle
      ),
      '[]'::jsonb
    ) AS arr
    FROM (
      SELECT day_of_cycle, COUNT(*)::int AS qtd
        FROM per_user
        GROUP BY day_of_cycle
    ) t
  )
  SELECT jsonb_build_object(
           'total_in_trial', (SELECT COUNT(*) FROM per_user),
           'buckets',        (SELECT arr FROM buckets),
           'by_day',         (SELECT arr FROM by_day)
         )
    INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_trial_cycle_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_trial_cycle_stats() TO authenticated;


-- =====================================================================
-- admin_list_users_in_trial_day
-- ---------------------------------------------------------------------
--   Lista paginada dos usuários atualmente no dia X do trial.
--   p_day_of_cycle = 7  → todos com day_of_cycle >= 7
--   p_day_of_cycle = N  → exato (N ∈ 1..6)
--   p_day_of_cycle = 0  → todos em trial (sem filtro de dia)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_list_users_in_trial_day(
  p_day_of_cycle int  DEFAULT 0,
  p_search       text DEFAULT NULL,
  p_limit        int  DEFAULT 25,
  p_offset       int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_items jsonb;
BEGIN
  IF NOT public._admin_engagement_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem chamar admin_list_users_in_trial_day';
  END IF;

  WITH latest_trial AS (
    SELECT DISTINCT ON (s.user_id)
           s.user_id,
           s.trial_start,
           s.trial_end,
           s.status,
           s.plan_type
      FROM public.subscriptions s
     WHERE s.status = 'trialing'
       AND s.trial_start IS NOT NULL
       AND s.trial_end   IS NOT NULL
       AND s.trial_end   > NOW()
     ORDER BY s.user_id, s.created_at DESC
  ),
  per_user AS (
    SELECT
      lt.user_id,
      lt.trial_start,
      lt.trial_end,
      lt.plan_type,
      GREATEST(
        1,
        (FLOOR(EXTRACT(EPOCH FROM (NOW() - lt.trial_start)) / 86400)::int + 1)
      ) AS day_of_cycle,
      GREATEST(
        0,
        CEIL(EXTRACT(EPOCH FROM (lt.trial_end - NOW())) / 86400)::int
      ) AS days_remaining
    FROM latest_trial lt
  ),
  filtered AS (
    SELECT u.id,
           u.nome_completo,
           u.nome_publico,
           u.email,
           u.cpf_cnpj,
           u.telefone,
           u.selfie_url,
           u.verified,
           u.is_admin,
           u.blocked,
           u.created_at,
           p.trial_start,
           p.trial_end,
           p.plan_type,
           p.day_of_cycle,
           p.days_remaining
      FROM per_user p
      JOIN public.users u ON u.id = p.user_id
     WHERE
        -- filtro por dia
        (
          p_day_of_cycle = 0
          OR (p_day_of_cycle BETWEEN 1 AND 6 AND p.day_of_cycle = p_day_of_cycle)
          OR (p_day_of_cycle >= 7 AND p.day_of_cycle >= 7)
        )
        -- filtro de busca
        AND (
          p_search IS NULL
          OR u.nome_completo ILIKE '%' || p_search || '%'
          OR u.email         ILIKE '%' || p_search || '%'
          OR u.cpf_cnpj      ILIKE '%' || p_search || '%'
          OR u.nome_publico  ILIKE '%' || p_search || '%'
        )
  )
  SELECT
    COUNT(*)::int,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',              f.id,
          'nome_completo',   f.nome_completo,
          'nome_publico',    f.nome_publico,
          'email',           f.email,
          'cpf_cnpj',        f.cpf_cnpj,
          'telefone',        f.telefone,
          'selfie_url',      f.selfie_url,
          'verified',        f.verified,
          'is_admin',        f.is_admin,
          'blocked',         f.blocked,
          'created_at',      f.created_at,
          'plan_type',       f.plan_type,
          'trial_start',     f.trial_start,
          'trial_end',       f.trial_end,
          'day_of_cycle',    f.day_of_cycle,
          'days_remaining',  f.days_remaining
        )
        ORDER BY f.day_of_cycle ASC, f.created_at DESC
      ) FILTER (WHERE f.id IS NOT NULL),
      '[]'::jsonb
    )
  INTO v_total, v_items
  FROM (
    SELECT *
      FROM filtered
     ORDER BY day_of_cycle ASC, created_at DESC
     LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0)
  ) f
  CROSS JOIN (SELECT COUNT(*) FROM filtered) c(total);

  -- Recalcula total separadamente (acima ficou correto para a PAGE,
  -- mas precisamos do total geral; refaz)
  SELECT COUNT(*)::int INTO v_total FROM filtered;

  RETURN jsonb_build_object(
    'items',         v_items,
    'total',         v_total,
    'day_of_cycle',  p_day_of_cycle
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users_in_trial_day(int, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users_in_trial_day(int, text, int, int) TO authenticated;


-- =====================================================================
-- 02) admin_activation_funnel
-- ---------------------------------------------------------------------
--   Funil de ativação:
--     Cadastrados → Logaram → Ativaram (1º conteúdo) → Engajaram (3+)
--
--   Critérios:
--     - "Cadastrados" : count(public.users) no intervalo (ou geral).
--     - "Logaram"     : DISTINCT user_id em public.audit_logs
--                       WHERE action = 'LOGIN'
--                         AND user_id IN (lista do período).
--     - "Ativaram"    : DISTINCT user_id em public.signed_contents
--                       WHERE user_id IN (lista do período).
--     - "Engajaram"   : user_id em public.signed_contents com
--                       COUNT(*) >= 3, restrito ao período.
--
--   Parâmetros:
--     p_from / p_to : filtra `users.created_at` em [p_from, p_to).
--                     NULL = sem limite.
--
--   Saída:
--     {
--       "registered":     1234,
--       "logged_in":      980,
--       "activated":      620,
--       "engaged":        310,
--       "rate_logged_in": 79.4,    -- %
--       "rate_activated": 50.2,
--       "rate_engaged":   25.1,
--       "avg_days_to_activate": 2.3,   -- dias entre created_at e 1º conteúdo
--       "from": "...", "to": "..."
--     }
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_activation_funnel(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registered int := 0;
  v_logged_in  int := 0;
  v_activated  int := 0;
  v_engaged    int := 0;
  v_avg_days   numeric;
BEGIN
  IF NOT public._admin_engagement_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem chamar admin_activation_funnel';
  END IF;

  -- 1) Universo de usuários do período
  CREATE TEMP TABLE IF NOT EXISTS _funnel_users (
    user_id    uuid PRIMARY KEY,
    created_at timestamptz
  ) ON COMMIT DROP;

  -- Garante temp limpa caso já exista nesta sessão
  TRUNCATE _funnel_users;

  INSERT INTO _funnel_users (user_id, created_at)
  SELECT u.id, u.created_at
    FROM public.users u
   WHERE (p_from IS NULL OR u.created_at >= p_from)
     AND (p_to   IS NULL OR u.created_at <  p_to);

  SELECT COUNT(*) INTO v_registered FROM _funnel_users;

  IF v_registered = 0 THEN
    DROP TABLE _funnel_users;
    RETURN jsonb_build_object(
      'registered',           0,
      'logged_in',            0,
      'activated',            0,
      'engaged',              0,
      'rate_logged_in',       0,
      'rate_activated',       0,
      'rate_engaged',         0,
      'avg_days_to_activate', NULL,
      'from',                 p_from,
      'to',                   p_to
    );
  END IF;

  -- 2) Logaram: ao menos 1 evento LOGIN
  --    (a tabela audit_logs sempre tem `action` e `user_id`)
  SELECT COUNT(DISTINCT al.user_id)
    INTO v_logged_in
    FROM public.audit_logs al
    JOIN _funnel_users fu ON fu.user_id = al.user_id
   WHERE al.action = 'LOGIN';

  -- 3) Ativaram: pelo menos 1 conteúdo
  SELECT COUNT(DISTINCT sc.user_id)
    INTO v_activated
    FROM public.signed_contents sc
    JOIN _funnel_users fu ON fu.user_id = sc.user_id;

  -- 4) Engajaram: 3 ou mais conteúdos
  SELECT COUNT(*)
    INTO v_engaged
    FROM (
      SELECT sc.user_id
        FROM public.signed_contents sc
        JOIN _funnel_users fu ON fu.user_id = sc.user_id
       GROUP BY sc.user_id
      HAVING COUNT(*) >= 3
    ) t;

  -- 5) Média de dias até a 1ª ativação
  SELECT ROUND(AVG(diff)::numeric, 2)
    INTO v_avg_days
    FROM (
      SELECT EXTRACT(EPOCH FROM (MIN(sc.created_at) - fu.created_at)) / 86400.0 AS diff
        FROM public.signed_contents sc
        JOIN _funnel_users fu ON fu.user_id = sc.user_id
       GROUP BY fu.user_id, fu.created_at
    ) t
   WHERE diff IS NOT NULL AND diff >= 0;

  DROP TABLE _funnel_users;

  RETURN jsonb_build_object(
    'registered',           v_registered,
    'logged_in',            v_logged_in,
    'activated',            v_activated,
    'engaged',              v_engaged,
    'rate_logged_in',       ROUND((v_logged_in::numeric / v_registered) * 100, 1),
    'rate_activated',       ROUND((v_activated::numeric / v_registered) * 100, 1),
    'rate_engaged',         ROUND((v_engaged::numeric   / v_registered) * 100, 1),
    'avg_days_to_activate', v_avg_days,
    'from',                 p_from,
    'to',                   p_to
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_activation_funnel(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_activation_funnel(timestamptz, timestamptz) TO authenticated;


-- =====================================================================
-- 03) admin_churn_metrics
-- ---------------------------------------------------------------------
--   Taxa de abandono com 3 visões.
--
--   Trial Abandonado:
--     - Usuários que ESTIVERAM em trial (trial_start IS NOT NULL) cuja
--       subscription mais recente não está mais em trialing nem active
--       (status IN ('canceled', 'incomplete_expired', 'unpaid'))
--       E nunca tiveram subscription active.
--     - Alternativamente: trial expirado (trial_end < NOW())
--       e nenhuma sub active após.
--
--   Pós-trial (Churn pago):
--     - Usuários que JÁ tiveram subscription active mas hoje estão
--       canceled / past_due / incomplete_expired / unpaid.
--
--   Inatividade:
--     - Usuários cadastrados há > p_inactive_days_threshold dias
--       sem signed_content novo NEM LOGIN no audit_logs nos últimos
--       p_inactive_days_threshold dias.
--
--   Parâmetros:
--     p_inactive_days_threshold int (default 30)
--
--   Saída:
--     {
--       "trial_abandoned":   { "qtd": 12, "base": 50,  "rate": 24.0 },
--       "post_trial_churn":  { "qtd": 5,  "base": 100, "rate": 5.0  },
--       "inactive":          { "qtd": 38, "base": 300, "rate": 12.7,
--                              "threshold_days": 30 },
--       "total_users": 1234
--     }
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_churn_metrics(
  p_inactive_days_threshold int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users        int := 0;

  v_trial_base         int := 0;   -- usuários que já estiveram em trial
  v_trial_abandoned    int := 0;

  v_paid_base          int := 0;   -- usuários que já tiveram sub active
  v_post_trial_churn   int := 0;

  v_inactive_base      int := 0;   -- usuários elegíveis (>= threshold cad.)
  v_inactive_qtd       int := 0;

  v_threshold_days     int;
BEGIN
  IF NOT public._admin_engagement_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem chamar admin_churn_metrics';
  END IF;

  v_threshold_days := GREATEST(COALESCE(p_inactive_days_threshold, 30), 1);

  SELECT COUNT(*) INTO v_total_users FROM public.users;

  -- ============================
  -- Trial Abandonado
  -- ============================
  WITH per_user AS (
    SELECT
      user_id,
      bool_or(trial_start IS NOT NULL)                        AS had_trial,
      bool_or(status = 'active')                              AS ever_active,
      bool_or(status = 'trialing' AND trial_end > NOW())      AS still_in_trial
      FROM public.subscriptions
     GROUP BY user_id
  )
  SELECT
    COUNT(*) FILTER (WHERE had_trial)::int,
    COUNT(*) FILTER (WHERE had_trial AND NOT ever_active AND NOT still_in_trial)::int
  INTO v_trial_base, v_trial_abandoned
    FROM per_user;

  -- ============================
  -- Pós-trial (Churn pago)
  -- ============================
  WITH latest_sub AS (
    SELECT DISTINCT ON (s.user_id)
           s.user_id,
           s.status,
           s.created_at
      FROM public.subscriptions s
     ORDER BY s.user_id, s.created_at DESC
  ),
  ever_active AS (
    SELECT DISTINCT user_id
      FROM public.subscriptions
     WHERE status = 'active'
  )
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (
      WHERE ls.status IN ('canceled','past_due','incomplete_expired','unpaid')
    )::int
  INTO v_paid_base, v_post_trial_churn
    FROM ever_active ea
    JOIN latest_sub ls ON ls.user_id = ea.user_id;

  -- ============================
  -- Inatividade
  -- ============================
  WITH eligible AS (
    SELECT u.id AS user_id, u.created_at
      FROM public.users u
     WHERE u.created_at <= NOW() - (v_threshold_days || ' days')::interval
  ),
  recent_signed AS (
    SELECT DISTINCT sc.user_id
      FROM public.signed_contents sc
     WHERE sc.created_at >= NOW() - (v_threshold_days || ' days')::interval
  ),
  recent_login AS (
    SELECT DISTINCT al.user_id
      FROM public.audit_logs al
     WHERE al.action = 'LOGIN'
       AND al.created_at >= NOW() - (v_threshold_days || ' days')::interval
  )
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (
      WHERE e.user_id NOT IN (SELECT user_id FROM recent_signed)
        AND e.user_id NOT IN (SELECT user_id FROM recent_login)
    )::int
  INTO v_inactive_base, v_inactive_qtd
    FROM eligible e;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'trial_abandoned', jsonb_build_object(
      'qtd',  v_trial_abandoned,
      'base', v_trial_base,
      'rate', CASE
                WHEN v_trial_base = 0 THEN 0
                ELSE ROUND((v_trial_abandoned::numeric / v_trial_base) * 100, 1)
              END
    ),
    'post_trial_churn', jsonb_build_object(
      'qtd',  v_post_trial_churn,
      'base', v_paid_base,
      'rate', CASE
                WHEN v_paid_base = 0 THEN 0
                ELSE ROUND((v_post_trial_churn::numeric / v_paid_base) * 100, 1)
              END
    ),
    'inactive', jsonb_build_object(
      'qtd',           v_inactive_qtd,
      'base',          v_inactive_base,
      'rate',          CASE
                         WHEN v_inactive_base = 0 THEN 0
                         ELSE ROUND((v_inactive_qtd::numeric / v_inactive_base) * 100, 1)
                       END,
      'threshold_days', v_threshold_days
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_churn_metrics(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_churn_metrics(int) TO authenticated;


COMMIT;

-- =====================================================================
-- ROLLBACK (descomentar e rodar manualmente caso necessário)
-- =====================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.admin_trial_cycle_stats();
-- DROP FUNCTION IF EXISTS public.admin_list_users_in_trial_day(int, text, int, int);
-- DROP FUNCTION IF EXISTS public.admin_activation_funnel(timestamptz, timestamptz);
-- DROP FUNCTION IF EXISTS public.admin_churn_metrics(int);
-- DROP FUNCTION IF EXISTS public._admin_engagement_is_admin();
-- COMMIT;