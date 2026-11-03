// Attend que l'API réponde sur /health avant de lancer le site (npm run dev).
// Évite les erreurs ECONNREFUSED du relais /api pendant la compilation de Nest.
// Si l'API ne répond pas dans le délai, on lance quand même le site.
const url = process.argv[2] ?? "http://localhost:3001/health";
const timeoutMs = 120_000;
const intervalMs = 500;
const start = Date.now();

async function isUp() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

console.log(`En attente de l'API (${url})…`);
let ready = false;
// Pas de process.exit() : sous Windows il peut planter (code 127) et casser le `&&`.
while (!ready && Date.now() - start < timeoutMs) {
  ready = await isUp();
  if (!ready) await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
if (ready) console.log("API prête, lancement du site.");
else console.warn("API toujours injoignable après 120 s : lancement du site quand même.");
