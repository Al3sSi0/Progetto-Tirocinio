/**
 * Applica le regole di sicurezza alle collection PocketBase.
 *
 * Uso:
 *   node scripts/apply-security-rules.js <admin-email> <admin-password>
 *
 * Regole applicate:
 *   - Solo utenti autenticati possono accedere
 *   - Ogni utente vede/modifica solo i propri record (owner = utente corrente)
 */

const PB_URL = 'http://127.0.0.1:8090';

const COLLECTIONS = ['Question', 'Document', 'Test'];

// Regole owner-based per collection con campo `owner`
const OWNER_RULES = {
  listRule:   '@request.auth.id != "" && owner = @request.auth.id',
  viewRule:   '@request.auth.id != "" && owner = @request.auth.id',
  createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
  updateRule: '@request.auth.id != "" && owner = @request.auth.id',
  deleteRule: '@request.auth.id != "" && owner = @request.auth.id',
};

async function main() {
  const [,, adminEmail, adminPassword] = process.argv;

  if (!adminEmail || !adminPassword) {
    console.error('Uso: node scripts/apply-security-rules.js <admin-email> <admin-password>');
    process.exit(1);
  }

  // 1. Autenticazione admin
  console.log('Autenticazione admin...');
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
  });

  if (!authRes.ok) {
    const err = await authRes.json().catch(() => ({}));
    console.error('Autenticazione fallita:', err.message ?? authRes.statusText);
    process.exit(1);
  }

  const { token } = await authRes.json();
  console.log('Autenticato.\n');

  // 2. Recupera lista collection
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  });
  const { items: allCollections } = await listRes.json();

  // 3. Applica regole a ciascuna collection target
  for (const name of COLLECTIONS) {
    const col = allCollections.find(c => c.name === name);
    if (!col) {
      console.warn(`⚠️  Collection "${name}" non trovata — saltata.`);
      continue;
    }

    const patchRes = await fetch(`${PB_URL}/api/collections/${col.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(OWNER_RULES),
    });

    if (patchRes.ok) {
      console.log(`✓  ${name}: regole applicate`);
      console.log(`   list/view  → owner = utente corrente`);
      console.log(`   create     → owner nel payload = utente corrente`);
      console.log(`   update/delete → owner = utente corrente\n`);
    } else {
      const err = await patchRes.json().catch(() => ({}));
      console.error(`✗  ${name}: errore — ${JSON.stringify(err)}`);
    }
  }

  console.log('Fatto.');
}

main().catch(err => { console.error(err); process.exit(1); });
