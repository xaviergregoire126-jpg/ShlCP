import { ParseResult, RawParsedSms } from '../types';

/**
 * Nettoie une chaîne de montant malgache en supprimant impérativement tous les espaces,
 * caractères "Ar", "Ar.", "Ar " pour ne conserver qu'un type "Nombre/Integer" pur.
 */
export function cleanAmount(amountStr: string | undefined | null): number {
  if (!amountStr) return 0;
  // CONTRÔLE STRICT DE NETTOYAGE :
  // Supprime impérativement tous les espaces ou caractères "Ar" / "Ar." / "Ar " pour ne conserver qu'un type Nombre/Integer
  const cleaned = amountStr.replace(/Ar\.?/gi, '').replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * LOGIQUE D'EXTRACTION DU MONTANT TRANSACTIONNEL AIRTEL MONEY (STRICT REGEX & RULES)
 * Règle A : Format "Depot de Ar[Montant]" -> immédiatement après "Depot de Ar" et avant "pour"
 * Règle B : Format "Recharge de [Montant] Ar" -> immédiatement après "Recharge de " et avant " Ar"
 * Règle C : Format "Vous avez recu [Montant] Ar" -> immédiatement après "Vous avez recu " et avant " Ar"
 * Règle D : Format "Vous avez paye Ar [Montant]" -> immédiatement après "Vous avez paye Ar " et avant "a"
 */
export function extractAirtelTransactionAmount(
  text: string,
  commission?: number,
  reportedBalance?: number
): number {
  // RÈGLE A : Format "Depot de Ar[Montant]"
  // Syntaxe : "Depot de Ar11000 pour..." ou "Depot de Ar100000 pour..."
  // Logique : Extrais la valeur numérique située immédiatement après "Depot de Ar" et avant le mot "pour".
  const matchRegleA = text.match(/Depot\s+de\s+Ar\s*([\d\s]+?)\s+pour/i);
  if (matchRegleA && matchRegleA[1]) {
    const parsed = cleanAmount(matchRegleA[1]);
    if (parsed > 0) return parsed;
  }

  // RÈGLE B : Format "Recharge de [Montant] Ar"
  // Syntaxe : "Recharge de 500 Ar envoyee au..."
  // Logique : Extrais la valeur numérique située immédiatement après le mot "Recharge de " et avant les caractères " Ar".
  const matchRegleB = text.match(/Recharge\s+de\s+([\d\s]+?)\s*Ar\b/i);
  if (matchRegleB && matchRegleB[1]) {
    const parsed = cleanAmount(matchRegleB[1]);
    if (parsed > 0) return parsed;
  }

  // RÈGLE C : Format "Vous avez recu [Montant] Ar"
  // Syntaxe : "Vous avez recu 5000 Ar de..."
  // Logique : Extrais la valeur numérique située immédiatement après le texte "Vous avez recu " et avant les caractères " Ar".
  const matchRegleC = text.match(/Vous\s+avez\s+recu\s+([\d\s]+?)\s*Ar\b/i);
  if (matchRegleC && matchRegleC[1]) {
    const parsed = cleanAmount(matchRegleC[1]);
    if (parsed > 0) return parsed;
  }

  // RÈGLE D : Format "Vous avez paye Ar [Montant]"
  // Syntaxe : "Vous avez paye Ar 500 a AIRTELMLAY..."
  // Logique : Extrais la valeur numérique située immédiatement après les caractères "Vous avez paye Ar " et avant la lettre "a".
  const matchRegleD = text.match(/Vous\s+avez\s+paye\s+Ar\s*([\d\s]+?)\s+a\b/i);
  if (matchRegleD && matchRegleD[1]) {
    const parsed = cleanAmount(matchRegleD[1]);
    if (parsed > 0) return parsed;
  }

  // 21.A : Cas PP "Vous avez recu Ar [Montant]"
  const matchPpRecu = text.match(/Vous\s+avez\s+recu\s+Ar\s*([\d\s]+?)(?:\s+(?:de|depuis|par)|Ar|\.|\b)/i)
    || text.match(/Vous\s+avez\s+recu\s+Ar\s*([\d\s]+)/i);
  if (matchPpRecu && matchPpRecu[1]) {
    const parsed = cleanAmount(matchPpRecu[1]);
    if (parsed > 0) return parsed;
  }

  // 21.A : Cas PP "Vous avez transfere Ar [Montant]"
  const matchPpTransfere = text.match(/Vous\s+avez\s+transf[eé]r[eé]\s+(?:Ar\s*)?([\d\s]+?)(?:\s+(?:a|à|pour|vers)|Ar|\.|\b)/i)
    || text.match(/Vous\s+avez\s+transf[eé]r[eé]\s+Ar\s*([\d\s]+)/i);
  if (matchPpTransfere && matchPpTransfere[1]) {
    const parsed = cleanAmount(matchPpTransfere[1]);
    if (parsed > 0) return parsed;
  }

  // Variantes supplémentaires robustes (ex: Retrait de [Montant] Ar, Depot de [Montant] Ar)
  const matchRetrait = text.match(/Retrait\s+de\s+(?:Ar\s*)?([\d\s]+?)\s*(?:Ar\b|effectue|par)/i);
  if (matchRetrait && matchRetrait[1]) {
    const parsed = cleanAmount(matchRetrait[1]);
    if (parsed > 0) return parsed;
  }

  const matchDepotSimple = text.match(/Depot\s+de\s+([\d\s]+?)\s*Ar\b/i);
  if (matchDepotSimple && matchDepotSimple[1]) {
    const parsed = cleanAmount(matchDepotSimple[1]);
    if (parsed > 0) return parsed;
  }

  const matchPaiement = text.match(/Paiement\s+de\s+(?:Ar\s*)?([\d\s]+?)\s*(?:Ar\b|au)/i);
  if (matchPaiement && matchPaiement[1]) {
    const parsed = cleanAmount(matchPaiement[1]);
    if (parsed > 0) return parsed;
  }

  // Recherche résiduelle avec discrimination de commission et solde
  const allArMatches = [...text.matchAll(/([\d\s]+)\s*Ar\b/gi)];
  for (const m of allArMatches) {
    const val = cleanAmount(m[1]);
    if (val > 0 && val !== commission && val !== reportedBalance) {
      return val;
    }
  }

  return 0;
}

/**
 * 17. LOGIQUE STRICTE D'EXTRACTION DU "SOLDE APRÈS" MVOLA (FIN DE MESSAGE)
 * A) POUR MVOLA (2 Formats distincts détectés) :
 * - Format 1 (Avec mention MVola) : "Solde MVola : [Solde avec espaces] Ar."
 *   Logique de capture : Extrais la chaîne de chiffres située entre "Solde MVola : " et " Ar".
 *   Exemple : "...Solde MVola : 1 177 349 Ar. Ref..." -> Solde Capturé = 1177349
 * - Format 2 (Standard court) : "Solde: [Solde avec espaces] Ar." ou "Solde : [Solde avec espaces] Ar."
 *   Logique de capture : Extrais la chaîne de chiffres située immédiatement après "Solde:" ou "Solde : "
 *   et qui s'arrête avant " Ar" ou le point ". Ref".
 *   Exemple : "...Bonus:58 Ar. Solde: 1 178 301 Ar. Ref..." -> Solde Capturé = 1178301
 * ⚠️ DIRECTIVE COMMUNE MVOLA : Supprime obligatoirement les espaces internes des milliers.
 */
export function extractMvolaReportedBalance(text: string): number | undefined {
  // 21.B Cas 1 : Échange Sortant -> après "Solde: " et avant " . Ref" (ou ". Ref")
  const matchSoldeDotRef = text.match(/Solde\s*:\s*([\d\s]+?)\s+\.\s*Ref\b/i)
    || text.match(/Solde\s*:\s*([\d\s]+?)\s*\.\s*Ref\b/i);
  if (matchSoldeDotRef && matchSoldeDotRef[1]) {
    const val = cleanAmount(matchSoldeDotRef[1]);
    if (val > 0) return val;
  }

  // 21.B Cas 2 : Échange Entrant -> après "Solde : " et avant " Ar. Ref"
  const matchSoldeArRef = text.match(/Solde\s*:\s*([\d\s]+?)\s*Ar\s*\.\s*Ref\b/i)
    || text.match(/Solde\s*:\s*([\d\s]+?)\s*Ar\b.*?\bRef\b/i);
  if (matchSoldeArRef && matchSoldeArRef[1]) {
    const val = cleanAmount(matchSoldeArRef[1]);
    if (val > 0) return val;
  }

  // Format 1 (Avec mention MVola) : "Solde MVola : [Solde avec espaces] Ar."
  const matchFmt1 = text.match(/Solde\s+MVola\s*:\s*([\d\s]+?)\s*Ar(?:\.|\b)/i);
  if (matchFmt1 && matchFmt1[1]) {
    const val = cleanAmount(matchFmt1[1]);
    if (val > 0) return val;
  }

  // Format 2 (Standard court) : "Solde: [Solde avec espaces] Ar." ou "Solde : [Solde avec espaces] Ar."
  const matchFmt2 = text.match(/Solde\s*:\s*([\d\s]+?)\s*(?:Ar(?:\.|\b)|\.\s*Ref\b)/i);
  if (matchFmt2 && matchFmt2[1]) {
    const val = cleanAmount(matchFmt2[1]);
    if (val > 0) return val;
  }

  // Format générique de secours
  const matchGeneric = text.match(/(?:(?:Nouveau\s+)?Solde(?:\s+MVola)?(?:\s*:)?)\s*([\d\s]+?)\s*Ar/i);
  if (matchGeneric && matchGeneric[1]) {
    const val = cleanAmount(matchGeneric[1]);
    if (val > 0) return val;
  }

  return undefined;
}

/**
 * 17. LOGIQUE STRICTE D'EXTRACTION DU "SOLDE APRÈS" AIRTEL MONEY (FIN DE MESSAGE)
 * B) POUR AIRTEL MONEY :
 * - Format Unique standard : "Solde Ar[Solde]" ou "Solde est [Solde] Ar."
 *   Exemples : "...Frais: Ar 0. Trans. ID... Solde Ar242372." -> 242372
 *              "...Solde Ar266724 ID:CI..." -> 266724
 *              "...Solde est 290508 Ar. ID..." -> 290508
 * - EXTRACTEUR SOLDE AIRTEL "MB" (Insensible aux espaces et à la casse) :
 *   Le solde y est écrit sous la forme "Solde Ar 20000", "Solde ar [Valeur]", "Solde Ar 241772. Frais:..."
 *   Logique : Extrais la valeur numérique pure située immédiatement après "Solde Ar ", "Solde ar ", "Solde Ar" ou "Solde ar"
 *   (en ignorant l'espace) et s'arrêtant avant le point ou le mot suivant.
 * - SECTION 21.A :
 *   - Cas "Vous avez recu Ar" -> "Votre solde est Ar [Solde]"
 *   - Cas "Vous avez transfere Ar" -> "Nouveau solde Ar [Solde]"
 */
export function extractAirtelReportedBalance(text: string): number | undefined {
  // 21.A : Cas PP "Vous avez recu Ar" -> Capturer le Solde Après situé après la chaîne "Votre solde est Ar "
  const matchVotreSolde = text.match(/Votre\s+solde\s+est\s+Ar\s*([\d\s]+?)(?:\.|\b)/i);
  if (matchVotreSolde && matchVotreSolde[1]) {
    const val = cleanAmount(matchVotreSolde[1]);
    if (val > 0) return val;
  }

  // 21.A : Cas PP "Vous avez transfere Ar" -> Capturer le Solde Après situé après la chaîne "Nouveau solde Ar "
  const matchNouveauSolde = text.match(/Nouveau\s+solde\s+Ar\s*([\d\s]+?)(?:\.|\b)/i);
  if (matchNouveauSolde && matchNouveauSolde[1]) {
    const val = cleanAmount(matchNouveauSolde[1]);
    if (val > 0) return val;
  }

  // 18.B : Cherche les caractères "Solde Ar ". Capture l'intégralité du bloc numérique qui suit immédiatement cet espace
  // et s'arrête juste avant le point "." (Résultat sur message réel : "Solde Ar 241772." -> Solde après = 241772)
  const matchMbExclusive = text.match(/Solde\s+Ar\s+(\d+)\./i);
  if (matchMbExclusive && matchMbExclusive[1]) {
    const val = parseInt(matchMbExclusive[1], 10);
    if (!isNaN(val)) return val;
  }

  // Format "Solde Ar [Solde]" ou "Solde ar [Solde]" ou "Solde Ar[Solde]" ou "Solde ar[Solde]"
  // (insensible à la casse, avec ou sans espace après Ar/ar)
  const matchSoldeAr = text.match(/Solde\s*ar\s*(\d+)/i);
  if (matchSoldeAr && matchSoldeAr[1]) {
    const val = parseInt(matchSoldeAr[1], 10);
    if (!isNaN(val)) return val;
  }

  // Format "Solde est [Solde] Ar."
  const matchSoldeEst = text.match(/Solde\s+est\s+([\d\s]+?)\s*Ar/i);
  if (matchSoldeEst && matchSoldeEst[1]) {
    const val = cleanAmount(matchSoldeEst[1]);
    if (val > 0) return val;
  }

  // Format générique de secours
  const matchGeneric = text.match(/(?:(?:Nouveau\s+)?Solde(?:\s*:|\s+est)?)\s*(?:Ar\s*)?([\d\s]+?)(?:\s*Ar|\.|\bID:)/i);
  if (matchGeneric && matchGeneric[1]) {
    const val = cleanAmount(matchGeneric[1]);
    if (val > 0) return val;
  }

  return undefined;
}

/**
 * C) CAPTURE DES COMMISSIONS MVOLA (LE PIÈGE DU MOT "BONUS")
 * Dans tous les SMS MVola utiles (Dépôt, Retrait, Transfert, Crédit), la commission de l'agent est textuellement écrite après le mot "Bonus:".
 * Logique : Extrais la valeur numérique immédiatement après "Bonus:" ou "Bonus: " et avant "Ar" ou "Ar."
 * Nettoyage : Supprime les espaces des milliers (ex: "1 000" -> 1000).
 */
export function extractMvolaCommission(text: string): number {
  const match = text.match(/Bonus\s*:\s*([\d\s]+?)\s*Ar(?:\.|\b)/i)
    || text.match(/Bonus\s*:\s*([\d\s]+)/i)
    || text.match(/Bonus\s*:?\s*([\d\s]+?)\s*Ar(?:\.|\b)/i);
  if (match && match[1]) {
    return cleanAmount(match[1]);
  }
  return 0;
}

/**
 * LOGIQUE D'EXTRACTION DU MONTANT TRANSACTIONNEL MVOLA (GESTION DES ESPACES DES MILLIERS)
 * Règle A : Format CREDIT (Achat de crédit YAS)
 *   Syntaxe : "Achat de credit YAS reussi: [Montant avec espaces] Ar pour..."
 *   Logique : Extrais la chaîne numérique immédiatement après ":" et avant " Ar pour".
 * Règle B : Format RETRAIT (Argent reçu)
 *   Syntaxe : "[Montant avec espaces] Ar recu de..."
 *   Logique : Extrais la chaîne numérique située tout au début du SMS, juste avant " Ar recu de".
 * Règle C : Format DEPOT ou TRANSFERT (Vous avez crédité)
 *   Syntaxe : "Vous avez credite [Nom/Numéro] de [Montant avec espaces] Ar le..."
 *   Logique : Extrais la chaîne numérique située immédiatement après " de " et juste avant " Ar le".
 * ⚠️ DIRECTIVE DE NETTOYAGE IMPÉRATIVE : Suppression impérative de tous les espaces internes vides.
 */
export function extractMvolaTransactionAmount(text: string): { amount: number; recipient?: string } {
  // RÈGLE A : Format CREDIT (Achat de crédit YAS)
  if (/Achat\s+de\s+credit\s+YAS\s+reussi\s*:/i.test(text)) {
    const matchA = text.match(/Achat\s+de\s+credit\s+YAS\s+reussi\s*:\s*([\d\s]+?)\s*Ar\s+pour/i)
      || text.match(/Achat\s+de\s+credit\s+YAS\s+reussi\s*:\s*([\d\s]+?)\s*Ar\b/i);
    if (matchA && matchA[1]) {
      return { amount: cleanAmount(matchA[1]) };
    }
  }

  // RÈGLE B : Format RETRAIT (Argent reçu)
  if (/Ar\s+recu\s+de/i.test(text)) {
    // Extrais la chaîne numérique située tout au début du SMS, juste avant " Ar recu de"
    const matchB = text.match(/^[\s\r\n]*([\d\s]+?)\s*Ar\s+recu\s+de/i)
      || text.match(/([\d\s]+?)\s*Ar\s+recu\s+de/i);
    if (matchB && matchB[1]) {
      return { amount: cleanAmount(matchB[1]) };
    }
  }

  // RÈGLE C : Format DEPOT ou TRANSFERT (Vous avez crédité)
  if (/Vous\s+avez\s+credite/i.test(text)) {
    // Syntaxe officielle : "Vous avez credite [Nom/Numéro] de [Montant avec espaces] Ar le..."
    const matchCWithDe = text.match(/Vous\s+avez\s+credite\s+(.+?)\s+de\s+([\d\s]+?)\s*Ar\s+le/i);
    if (matchCWithDe && matchCWithDe[2]) {
      const recipient = matchCWithDe[1].trim();
      return {
        amount: cleanAmount(matchCWithDe[2]),
        recipient,
      };
    }

    // Variantes alternatives sans "le" ou sans nom intermédiaire
    const matchCGeneric = text.match(/Vous\s+avez\s+credite\s+(?:.+?\s+de\s+)?([\d\s]+?)\s*Ar/i);
    if (matchCGeneric && matchCGeneric[1]) {
      return { amount: cleanAmount(matchCGeneric[1]) };
    }
  }

  // 21.B : Format "envoye a" suivi de "Raison:" (Échange / Approvisionnement)
  // Syntaxe : commence par un montant, ex: "100 000 Ar envoye a ..."
  if (/envoye\s+a/i.test(text) && /Raison\s*:/i.test(text)) {
    const matchEnvoye = text.match(/^[\s\r\n]*([\d\s]+?)\s*Ar\s+envoye\s+a/i)
      || text.match(/([\d\s]+?)\s*Ar\s+envoye\s+a/i);
    if (matchEnvoye && matchEnvoye[1]) {
      return { amount: cleanAmount(matchEnvoye[1]) };
    }
  }

  return { amount: 0 };
}

/**
 * Variable 4 : Numéro de téléphone du client ou de la cible.
 * Si aucun numéro n'est mentionné dans le SMS, inscrire obligatoirement la chaîne "-".
 */
export function extractPhoneNumber(text: string): string {
  // 1. Numéro entre parenthèses : ex: (0382330305) ou (0341234567)
  const matchParentheses = text.match(/\((03[2348][\d\s]{7,12}|\*?\d{6,12})\)/);
  if (matchParentheses) {
    const cleaned = matchParentheses[1].replace(/\s+/g, '');
    if (cleaned.length >= 6) return cleaned;
  }

  // 2. Numéro avec étoile (ex: *36040857)
  const matchStar = text.match(/(\*\d{6,12})/);
  if (matchStar) {
    return matchStar[1].replace(/\s+/g, '');
  }

  // 3. Numéro préfixé par pour / au / de / par / vers
  const matchPrefix = text.match(/(?:pour|au|vers|de|par)\s+(\*?\d{6,12}|03[2348][\d\s]{7,11})/i);
  if (matchPrefix) {
    const cleaned = matchPrefix[1].replace(/\s+/g, '');
    if (cleaned.length >= 6) return cleaned;
  }

  // 4. Format standard Madagascar : 032, 033, 034, 038
  const matchStandard = text.match(/\b(03[2348][\d\s]{7,11})\b/);
  if (matchStandard) {
    const cleaned = matchStandard[1].replace(/\s+/g, '');
    if (cleaned.length >= 9 && cleaned.length <= 11) {
      return cleaned;
    }
  }

  return '-';
}

/**
 * Règle 11.C : Analyse et extraction générique d'une Date et Heure
 * Supporte : "04/10/2026 10:14", "04/10/26 10:14", "2026-10-04 10:14:00", "10:14", etc.
 */
export function parseDateTimeString(
  str: string,
  fallbackDateStr?: string
): { timestamp: number; dateStr: string; timeStr: string } | null {
  if (!str) return null;
  const trimmed = str.trim();
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Format 1: dd/mm/yyyy hh:mm(:ss) ou dd/mm/yy hh:mm(:ss)
  const dmyMatch = trimmed.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(?:a|à)?\s*(\d{1,2})[:h](\d{2})(?::\d{2})?/i
  );
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const hour = parseInt(dmyMatch[4], 10);
    const minute = parseInt(dmyMatch[5], 10);

    const dateObj = new Date(year, month - 1, day, hour, minute, 0);
    return {
      timestamp: dateObj.getTime(),
      dateStr: `${pad(day)}/${pad(month)}/${year}`,
      timeStr: `${pad(hour)}:${pad(minute)}`,
    };
  }

  // Format 2: yyyy-mm-dd hh:mm(:ss)
  const ymdMatch = trimmed.match(
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(?:a|à)?\s*(\d{1,2})[:h](\d{2})(?::\d{2})?/i
  );
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const hour = parseInt(ymdMatch[4], 10);
    const minute = parseInt(ymdMatch[5], 10);

    const dateObj = new Date(year, month - 1, day, hour, minute, 0);
    return {
      timestamp: dateObj.getTime(),
      dateStr: `${pad(day)}/${pad(month)}/${year}`,
      timeStr: `${pad(hour)}:${pad(minute)}`,
    };
  }

  // Format 3: hh:mm seul (ex: "10:14" ou "10h14")
  const timeOnlyMatch = trimmed.match(/\b(\d{1,2})[:h](\d{2})\b/);
  if (timeOnlyMatch) {
    const hour = parseInt(timeOnlyMatch[1], 10);
    const minute = parseInt(timeOnlyMatch[2], 10);
    let year = 2026;
    let month = 10;
    let day = 4;

    if (fallbackDateStr) {
      const parts = fallbackDateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
      }
    }

    const dateObj = new Date(year, month - 1, day, hour, minute, 0);
    return {
      timestamp: dateObj.getTime(),
      dateStr: `${pad(day)}/${pad(month)}/${year}`,
      timeStr: `${pad(hour)}:${pad(minute)}`,
    };
  }

  return null;
}

/**
 * Analyse une date/heure MVola (ex: "04/10/26", "04/10/2026" et "15:35", "15h35")
 */
export function parseMvolaTimestamp(dateStr: string, timeStr: string): { timestamp: number; formattedDate: string; formattedTime: string } {
  try {
    const dParts = dateStr.split(/[\/\-]/);
    const day = parseInt(dParts[0], 10);
    const month = parseInt(dParts[1], 10);
    let year = parseInt(dParts[2], 10);
    if (year < 100) {
      year += 2000;
    }

    const tParts = timeStr.replace('h', ':').split(':');
    const hour = parseInt(tParts[0], 10);
    const minute = parseInt(tParts[1], 10);

    const dateObj = new Date(year, month - 1, day, hour, minute, 0);
    const timestamp = dateObj.getTime();

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      timestamp: isNaN(timestamp) ? Date.now() : timestamp,
      formattedDate: `${pad(day)}/${pad(month)}/${year}`,
      formattedTime: `${pad(hour)}:${pad(minute)}`,
    };
  } catch {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      timestamp: now.getTime(),
      formattedDate: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
      formattedTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  }
}

/**
 * Analyse le code ID Airtel (ex: CI261004.0850.C43625 ou MB261004.1243.C08790)
 */
export function parseAirtelId(fullId: string): {
  prefix: string;
  timestamp: number;
  formattedDate: string;
  formattedTime: string;
} | null {
  // Format: [2 lettres][AAMMJJ].[HHMM](.[suite])?
  // Exemples: CI261004.0850.C43625 ou PP261006.0839 ou PP261006.0839.A12345
  const match = fullId.trim().match(/([A-Z]{2})(\d{2})(\d{2})(\d{2})\.(\d{2})(\d{2})(?:\.([A-Za-z0-9]+))?/i);
  if (!match) return null;

  const prefix = match[1].toUpperCase();
  const year = 2000 + parseInt(match[2], 10);
  const month = parseInt(match[3], 10);
  const day = parseInt(match[4], 10);
  const hour = parseInt(match[5], 10);
  const minute = parseInt(match[6], 10);

  const dateObj = new Date(year, month - 1, day, hour, minute, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return {
    prefix,
    timestamp: dateObj.getTime(),
    formattedDate: `${pad(day)}/${pad(month)}/${year}`,
    formattedTime: `${pad(hour)}:${pad(minute)}`,
  };
}

/**
 * Parse un SMS individuel (MVola ou Airtel Money)
 * @param rawText Le texte brut du SMS
 * @param fallbackTimestamp Timestamp de secours si non spécifié (ex: achat crédit)
 */
export function parseSingleSms(
  rawText: string,
  fallbackTimestamp?: number,
  fallbackTimeInfo?: { dateStr: string; timeStr: string; timestamp: number }
): ParseResult {
  const text = rawText.trim();
  if (!text) {
    return { success: false, errorMessage: 'Texte vide' };
  }

  // 1. DÉTECTION AIRTEL MONEY (Par décodage impératif de l'ID)
  // Recherche d'un ID de transaction Airtel : 2 lettres (MO|CO|CI|MB|PP) + 6 chiffres + . + 4 chiffres (+ . + code optionnel)
  const airtelIdMatch = text.match(/\b([A-Za-z]{2}\d{6}\.\d{4}(?:\.[A-Za-z0-9]+)?)\b/);
  
  if (airtelIdMatch) {
    const fullId = airtelIdMatch[1];
    const idData = parseAirtelId(fullId);

    if (idData) {
      const { prefix, timestamp, formattedDate, formattedTime } = idData;
      
      // Extraction commission : "Commission 208 Ar" ou "avec commission 58Ar" ou "Commission: 208 Ar"
      let commission = 0;
      const commissionMatch = text.match(/(?:avec\s+commission|Commission(?:\s*:)?)\s*([\d\s]+)\s*Ar/i);
      if (commissionMatch) {
        commission = cleanAmount(commissionMatch[1]);
      }

      // 17 & 21.A : Extraction stricte du solde après Airtel (dont MB, PP insensible à la casse et aux espaces)
      const reportedBalance = extractAirtelReportedBalance(text);

      // Extraction du montant de l'opération via les règles strictes (Règles A, B, C, D, PP)
      const amount = extractAirtelTransactionAmount(text, commission, reportedBalance);

      // Destinataire ou numéro de téléphone (Variable 4 : Numéro ou "-")
      const phoneNumber = extractPhoneNumber(text);

      const rawSms: RawParsedSms = {
        id: fullId,
        reference: fullId, // 9. Référence : ID complet pour Airtel Money
        operator: 'AIRTEL',
        operatorName: 'Airtel Money', // 2. Opérateur
        rawTypeCandidate: prefix,
        rawText: text,
        amount, // 5. Montant : valeur numérique pure
        commission, // 6. Commission : valeur numérique pure
        statedFee: 0,
        reportedBalance, // 8. Solde après : solde inscrit à la fin du SMS
        timestamp,
        dateStr: formattedDate,
        timeStr: formattedTime, // 1. Heure : strict "hh:mm" (24h)
        phoneNumber,
      };

      return { success: true, data: rawSms };
    }
  }

  // 2. DÉTECTION MVOLA (Analyse par mots-clés textuels)
  const isMvolaCredit = /Achat\s+de\s+credit\s+YAS\s+reussi\s*:/i.test(text);
  const hasRaison = /Raison\s*:/i.test(text);
  // B) POUR MVOLA (Détection par le mot-clé "Raison:")
  // Dès qu'un SMS MVola contient le mot-clé "Raison:", il s'agit d'une opération d'ÉCHANGE / APPROVISIONNEMENT.
  // Classer d'office l'opération sous le type : "transfert".
  const isMvolaEchange = hasRaison;
  const isMvolaRetrait = /Ar\s+recu\s+de/i.test(text) && !hasRaison;
  const isMvolaCredite = /Vous\s+avez\s+credite/i.test(text);

  if (isMvolaCredit || isMvolaRetrait || isMvolaCredite || isMvolaEchange) {
    // Variable 9 : Référence MVola = le numéro après "Ref:"
    let id = '';
    const refMatch = text.match(/(?:Ref(?:\s*:)?|Trans\s*ID(?:\s*:)?)\s*([A-Za-z0-9]+)/i);
    if (refMatch) {
      id = refMatch[1];
    } else {
      // Si pas de Ref explicite, générer une signature déterministe
      id = 'MV-' + Math.abs(hashCode(text)).toString(36).toUpperCase();
    }
    const reference = id;

    // 17. Variable 8 : Solde après écrit dans le SMS (Format 1 & Format 2 sans espaces de milliers)
    const reportedBalance = extractMvolaReportedBalance(text);

    // Variable 1 : Heure au format strict "hh:mm" (24h)
    // 2. CHRONOLOGIE MVOLA PAR RÉFÉRENCE (Suppression de l'heure artificielle) :
    // Pour les SMS MVola (notamment l'Achat de crédit YAS qui n'a pas d'heure), n'invente plus d'heure artificielle.
    const dateMatch = text.match(/le\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:a|à)?\s*(\d{1,2}[:h]\d{2})/i);
    let timestamp = fallbackTimestamp || 0;
    let isDateEstimated = false;
    let formattedDate = '';
    let formattedTime = '-';

    if (dateMatch) {
      const parsedTime = parseMvolaTimestamp(dateMatch[1], dateMatch[2]);
      timestamp = parsedTime.timestamp;
      formattedDate = parsedTime.formattedDate;
      formattedTime = parsedTime.formattedTime;
    } else if (fallbackTimeInfo) {
      // Règle 11.C : Attribution chronologique des Crédits YAS sans horodatage explicite
      // Utilisation directe de la Date et Heure extraites des colonnes du tableau PDF ou CSV
      timestamp = fallbackTimeInfo.timestamp;
      formattedDate = fallbackTimeInfo.dateStr;
      formattedTime = fallbackTimeInfo.timeStr;
      isDateEstimated = false;
    } else {
      isDateEstimated = true;
      const refDate = fallbackTimestamp ? new Date(fallbackTimestamp) : new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      formattedDate = `${pad(refDate.getDate())}/${pad(refDate.getMonth() + 1)}/${refDate.getFullYear()}`;
      formattedTime = '-'; // Pas d'heure artificielle !
    }

    // Variable 4 : Numéro de téléphone du client ou cible (ou "-")
    const phoneNumber = extractPhoneNumber(text);

    // C) Variable 6 : Commission MVola (après le mot-clé "Bonus:")
    const commission = extractMvolaCommission(text);

    // A) CRÉDIT YAS (Règle A)
    if (isMvolaCredit) {
      const { amount } = extractMvolaTransactionAmount(text);

      return {
        success: true,
        data: {
          id,
          reference,
          operator: 'MVOLA',
          operatorName: 'MVola',
          rawTypeCandidate: 'CREDIT',
          rawText: text,
          amount,
          commission,
          statedFee: 0,
          reportedBalance,
          timestamp,
          dateStr: formattedDate,
          timeStr: formattedTime,
          isDateEstimated,
          phoneNumber,
        },
      };
    }

    // B) RETRAIT MVOLA (Règle B)
    if (isMvolaRetrait) {
      const { amount } = extractMvolaTransactionAmount(text);

      return {
        success: true,
        data: {
          id,
          reference,
          operator: 'MVOLA',
          operatorName: 'MVola',
          rawTypeCandidate: 'RETRAIT',
          rawText: text,
          amount,
          commission,
          statedFee: 0,
          reportedBalance,
          timestamp,
          dateStr: formattedDate,
          timeStr: formattedTime,
          phoneNumber,
        },
      };
    }

    // C) TRANSFERT ou DÉPÔT CLIENT MVOLA (Règle C : "Vous avez credite")
    if (isMvolaCredite) {
      const { amount } = extractMvolaTransactionAmount(text);

      // Détection de Frais:
      const hasExplicitFees = /Frais\s*:/i.test(text);
      let statedFee = 0;
      if (hasExplicitFees) {
        const feeMatch = text.match(/Frais\s*:\s*([\d\s]+?)\s*Ar/i);
        statedFee = feeMatch ? cleanAmount(feeMatch[1]) : 0;
      }

      return {
        success: true,
        data: {
          id,
          reference,
          operator: 'MVOLA',
          operatorName: 'MVola',
          rawTypeCandidate: hasExplicitFees ? 'TRANSFERT' : 'DEPOT',
          rawText: text,
          amount,
          commission,
          statedFee,
          reportedBalance,
          timestamp,
          dateStr: formattedDate,
          timeStr: formattedTime,
          phoneNumber,
        },
      };
    }

    // 21.B : ÉCHANGE / APPROVISIONNEMENT MVOLA (Dès qu'un SMS MVola contient le mot-clé "Raison:")
    if (isMvolaEchange) {
      const { amount } = extractMvolaTransactionAmount(text);

      return {
        success: true,
        data: {
          id,
          reference,
          operator: 'MVOLA',
          operatorName: 'MVola',
          rawTypeCandidate: 'ECHANGE',
          rawText: text,
          amount,
          commission: 0, // Commission : Fixée à 0 Ar par défaut
          statedFee: 0,
          reportedBalance,
          timestamp,
          dateStr: formattedDate,
          timeStr: formattedTime,
          phoneNumber,
        },
      };
    }
  }

  // 3. NON RECONNU
  return {
    success: false,
    errorMessage: 'SMS non reconnu : le texte ne correspond à aucun format valide MVola ou Airtel Money.',
  };
}

/**
 * Fonction de découpage robuste de plusieurs SMS collés en bloc (Tab 2)
 * Peut gérer les SMS séparés par retours à la ligne ou blocs textuels
 */
export function splitBulkSmsText(bulkText: string): string[] {
  if (!bulkText || !bulkText.trim()) return [];

  // Découpage initial par sauts de ligne
  const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const smsList: string[] = [];
  let currentAccumulator = '';

  for (const line of lines) {
    // Détecte si la ligne commence un nouveau SMS connu
    const isNewAirtel = /\b[A-Za-z]{2}\d{6}\.\d{4}\.[A-Za-z0-9]+\b/.test(line);
    const isNewMvola = /^(?:Achat\s+de\s+credit|Vous\s+avez\s+credite|[\d\s]+?Ar\s+recu\s+de)/i.test(line);

    if ((isNewAirtel || isNewMvola) && currentAccumulator.length > 0) {
      smsList.push(currentAccumulator.trim());
      currentAccumulator = line;
    } else {
      if (currentAccumulator.length > 0) {
        currentAccumulator += ' ' + line;
      } else {
        currentAccumulator = line;
      }
    }
  }

  if (currentAccumulator.trim().length > 0) {
    smsList.push(currentAccumulator.trim());
  }

  return smsList;
}

/**
 * Hash simple déterministe pour chaînes
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
