import os from 'os'
import path from 'path'

/**
 * Where `pnpm db:refresh:setup` saves the live read-only login, and the
 * variable it uses. DB_REFRESH_VAULT_FILE points both scripts elsewhere, for
 * rehearsing against a scratch database instead of live.
 */
export const VAULT_FILE =
  process.env.DB_REFRESH_VAULT_FILE || path.join(os.homedir(), '.questura-vault', 'local-refresh.env')
export const SOURCE_VARIABLE = 'QUESTURA_LOCAL_REFRESH_DATABASE_URL'
