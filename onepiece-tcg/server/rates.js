// Taux de change dollar → euro : référence quotidienne de la Banque centrale européenne,
// mise en cache 12 h ; taux de secours si la BCE est injoignable.
import { fetchText } from './http.js';

const TTL_MS = 12 * 60 * 60 * 1000;
export const FALLBACK_USD_EUR = 0.9;

// Le fichier BCE donne les devises pour 1 € (ex. USD 1.0850) : 1 $ = 1 / 1.0850 €.
export function parseEcbUsd(xml) {
  const m = String(xml).match(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/i);
  const perEur = m ? parseFloat(m[1]) : NaN;
  const date = String(xml).match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1] || null;
  return perEur > 0 ? { usdEur: Math.round((1 / perEur) * 10000) / 10000, date } : null;
}

let cached = null;
export async function usdToEur() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
  try {
    const { text } = await fetchText('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { timeoutMs: 8000 });
    const r = parseEcbUsd(text);
    if (r) {
      cached = { ...r, source: 'BCE', at: Date.now() };
      return cached;
    }
  } catch {
    /* taux de secours */
  }
  return { usdEur: FALLBACK_USD_EUR, date: null, source: 'secours', at: Date.now() };
}
