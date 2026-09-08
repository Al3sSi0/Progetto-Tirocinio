const PB_URL = 'http://127.0.0.1:8090';
const OWNER  = 'chmzino5e3lqgca';

async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'whatnico007@gmail.com', password: 'Pocketbasemerda1' }),
  });
  return (await res.json()).token;
}

async function main() {
  const token = await getAdminToken();
  const res = await fetch(`${PB_URL}/api/collections/Question/records?filter=owner%3D"${OWNER}"&perPage=500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { items } = await res.json();
  console.log(`Found ${items.length} questions to delete...`);
  let ok = 0;
  for (const item of items) {
    const r = await fetch(`${PB_URL}/api/collections/Question/records/${item.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) ok++;
  }
  console.log(`Deleted ${ok}/${items.length}`);
}
main().catch(console.error);
