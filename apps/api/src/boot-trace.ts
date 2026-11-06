// TEMPORAIRE (#35) : repères de démarrage pour diagnostiquer l'API sur Vercel.
// À supprimer dès que le démarrage est compris, avec ses appels dans main.ts.
export function trace(step: string): void {
  console.log(`[boot] ${step} (+${Math.round(process.uptime() * 1000)} ms)`);
}

// Premier module importé par main.ts : s'exécute avant tous les autres imports.
trace('1/4 début du chargement des modules');
