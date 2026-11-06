-- FiscAI : migration du 06/11/2026
-- À coller UNE FOIS dans Supabase > SQL Editor > Run. Script idempotent (peut être relancé sans risque).

-- 1. Relances automatiques : traçabilité du déclencheur (J-7, J-3, J+1)
ALTER TABLE relances ADD COLUMN IF NOT EXISTS declencheur TEXT;
ALTER TABLE relances ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_relances_dossier_declencheur ON relances(dossier_id, declencheur);

-- 2. Portail client en lecture seule
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portail_token TEXT UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portail_actif BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Paramètres du cabinet (automatisations)
CREATE TABLE IF NOT EXISTS parametres (
  cle        TEXT PRIMARY KEY,
  valeur     JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE parametres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parametres_select" ON parametres;
CREATE POLICY "parametres_select" ON parametres FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "parametres_admin_write" ON parametres;
CREATE POLICY "parametres_admin_write" ON parametres FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin'));
INSERT INTO parametres (cle, valeur) VALUES
  ('relances_auto', 'false'::jsonb),
  ('recap_mensuel', 'false'::jsonb),
  ('push_digest', 'true'::jsonb)
ON CONFLICT (cle) DO NOTHING;

-- 4. Notifications push (un abonnement par appareil)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_own" ON push_subscriptions;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- 5. Limitation de débit (accès service role uniquement : RLS activé, aucune policy)
CREATE TABLE IF NOT EXISTS api_usage (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL,
  route      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_api_usage_lookup ON api_usage(key, route, created_at DESC);

-- 6. Journal d'erreurs (écriture par le serveur, lecture réservée aux admins)
CREATE TABLE IF NOT EXISTS error_logs (
  id         BIGSERIAL PRIMARY KEY,
  message    TEXT NOT NULL,
  digest     TEXT,
  url        TEXT,
  stack      TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "error_logs_admin_select" ON error_logs;
CREATE POLICY "error_logs_admin_select" ON error_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "error_logs_admin_delete" ON error_logs;
CREATE POLICY "error_logs_admin_delete" ON error_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin'));
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);

-- 7. Bucket privé pour les sauvegardes hebdomadaires
INSERT INTO storage.buckets (id, name, public) VALUES ('sauvegardes', 'sauvegardes', false)
ON CONFLICT (id) DO NOTHING;

-- 8. SÉCURITÉ : empêcher l'auto-promotion en administrateur
-- Sans ce trigger, un utilisateur connecté pouvait modifier son propre rôle depuis le navigateur.
CREATE OR REPLACE FUNCTION public.proteger_role_collaborateur() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Éditeur SQL, triggers système et service role : autorisés
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.collaborateurs WHERE role = 'admin') THEN
      NEW.role := 'collaborateur';
    ELSE
      NEW.role := 'admin';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proteger_role ON collaborateurs;
CREATE TRIGGER trg_proteger_role BEFORE INSERT OR UPDATE ON collaborateurs
  FOR EACH ROW EXECUTE FUNCTION public.proteger_role_collaborateur();

-- 9. Durcissement : seuls les utilisateurs ayant un profil collaborateur peuvent écrire dans les modèles de relance.
DROP POLICY IF EXISTS "modeles_insert" ON modeles_relance;
CREATE POLICY "modeles_insert" ON modeles_relance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid()));
DROP POLICY IF EXISTS "modeles_delete" ON modeles_relance;
CREATE POLICY "modeles_delete" ON modeles_relance FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid()));
