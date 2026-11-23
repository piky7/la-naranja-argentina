-- Índices para consultas de períodos de participación en ligas.
-- No modifica membresías ni períodos existentes.
CREATE INDEX IF NOT EXISTS idx_prode_membership_periods_group_entered
  ON prode_membership_periods(group_id, entered_at);

CREATE INDEX IF NOT EXISTS idx_prode_membership_periods_active
  ON prode_membership_periods(group_id, user_id)
  WHERE exited_at IS NULL;
