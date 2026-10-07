import {
  AnchorBalances,
  BatchAuditSummary,
  ExtractedFileSmsItem,
  NormalizedOperationType,
  RawParsedSms,
  Transaction,
  TransactionType,
} from '../types';
import { parseSingleSms, splitBulkSmsText } from './parser';

export function extractNumericReference(ref: string): number {
  if (!ref) return 0;
  const digits = ref.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/**
 * 19. ALGORITHME D'INTERCALATION DYNAMIQUE (INDEXATION PAR REF) POUR LES SMS MVOLA SANS HEURE
 * Pour les SMS MVola (notamment l'Achat de crédit YAS) qui ne contiennent aucune date ni heure dans leur texte brut :
 * A) SÉPARATION ET ABANDON DE L'HEURE SYSTÈME :
 *    - N'utilise JAMAIS l'heure actuelle de la machine ou l'heure de collage pour positionner un SMS MVola sans heure.
 *    - La case "Heure" est laissée vide ou remplacée par un tiret "-", la colonne "Référence" est le repère d'alignement.
 * B) ALGORITHME D'INTERCALATION DYNAMIQUE (INDEXATION PAR REF) :
 *    - Compare le numéro de référence du nouveau SMS avec les références existantes :
 *    - Insère automatiquement le nouveau SMS juste APRÈS la transaction qui possède une référence immédiatement inférieure,
 *      et juste AVANT celle qui possède une référence immédiatement supérieure.
 *    - Le message trouve ainsi sa place chronologique exacte dans le passé, peu importe l'heure à laquelle il a été collé.
 * C) RECALCUL RÉTROACTIF EN CASCADE :
 *    - Relance instantanément le calcul des soldes flottes pour cette transaction et toutes les ultérieures.
 */
export function insertMvolaTransactionByReference(
  newRaw: RawParsedSms,
  existingList: RawParsedSms[]
): {
  updatedList: RawParsedSms[];
  wasIntercalated: boolean;
  predecessorRef?: string;
  successorRef?: string;
} {
  const newRefNum = extractNumericReference(newRaw.reference);

  // Si ce n'est pas un SMS MVola ou si la référence ne contient pas de chiffres, insérer à la fin
  if (newRaw.operator !== 'MVOLA' || !newRefNum) {
    return {
      updatedList: [...existingList, newRaw],
      wasIntercalated: false,
    };
  }

  // Filtrer les entrées MVola existantes avec référence numérique
  const mvolaEntries = existingList
    .map((item, index) => ({ item, index, refNum: extractNumericReference(item.reference) }))
    .filter((entry) => entry.item.operator === 'MVOLA' && entry.refNum > 0);

  if (mvolaEntries.length === 0) {
    return {
      updatedList: [...existingList, newRaw],
      wasIntercalated: false,
    };
  }

  // Trouver le prédécesseur immédiat (référence immédiatement inférieure)
  // et le successeur immédiat (référence immédiatement supérieure)
  let predecessor: { item: RawParsedSms; index: number; refNum: number } | null = null;
  let successor: { item: RawParsedSms; index: number; refNum: number } | null = null;

  for (const entry of mvolaEntries) {
    if (entry.refNum < newRefNum) {
      if (!predecessor || entry.refNum > predecessor.refNum) {
        predecessor = entry;
      }
    } else if (entry.refNum > newRefNum) {
      if (!successor || entry.refNum < successor.refNum) {
        successor = entry;
      }
    }
  }

  const preparedRaw: RawParsedSms = { ...newRaw };

  // A) Abandon de l'heure système : pour les SMS sans heure explicite, heure = '-'
  if (preparedRaw.timeStr === '-' || !preparedRaw.timeStr || preparedRaw.isDateEstimated) {
    preparedRaw.timeStr = '-';
    if (predecessor) {
      preparedRaw.dateStr = predecessor.item.dateStr;
      preparedRaw.timestamp = predecessor.item.timestamp + 1;
    } else if (successor) {
      preparedRaw.dateStr = successor.item.dateStr;
      preparedRaw.timestamp = Math.max(0, successor.item.timestamp - 1);
    }
  }

  // B) Déterminer la position d'intercalation
  let insertIndex = existingList.length;
  let wasIntercalated = false;

  if (predecessor && successor) {
    // Intercalé exactement entre prédécesseur et successeur !
    insertIndex = predecessor.index + 1;
    wasIntercalated = true;
  } else if (predecessor) {
    // Inséré après le prédécesseur
    insertIndex = predecessor.index + 1;
  } else if (successor) {
    // Inséré avant le successeur
    insertIndex = successor.index;
    wasIntercalated = true;
  }

  const result = [...existingList];
  result.splice(insertIndex, 0, preparedRaw);

  return {
    updatedList: result,
    wasIntercalated,
    predecessorRef: predecessor?.item.reference,
    successorRef: successor?.item.reference,
  };
}

/**
 * Re-calcule en cascade l'intégralité des transactions depuis le point zéro (ancrage initial).
 * Garantit l'exactitude mathématique absolue par tri chronologique strict et détection des frais cachés.
 */
export function recalculateAllTransactions(
  rawTransactions: RawParsedSms[],
  anchor: AnchorBalances,
  arbitratedReferences: string[] = []
): Transaction[] {
  // 1. RECLASSEMENT CHRONOLOGIQUE STRICT
  // RÈGLE DE TRI RECTIFIÉE : Pour reclasser les SMS MVola du plus ancien au plus récent
  // dans le traitement de fichier ou de groupe, utilise exclusivement le numéro de "Référence" (Ref: 83xxxx)
  // qui se suit de manière strictement linéaire. Classe-les par ordre croissant des Références.
  const sorted = [...rawTransactions].sort((a, b) => {
    // Si les deux transactions sont MVola, utiliser exclusivement le numéro de Référence croissant
    if (a.operator === 'MVOLA' && b.operator === 'MVOLA') {
      const refA = extractNumericReference(a.reference);
      const refB = extractNumericReference(b.reference);
      if (refA && refB && refA !== refB) {
        return refA - refB;
      }
      return a.id.localeCompare(b.id);
    }

    // Tri chronologique standard par timestamp
    if (a.timestamp !== b.timestamp && a.timestamp !== 0 && b.timestamp !== 0) {
      return a.timestamp - b.timestamp;
    }
    return a.id.localeCompare(b.id);
  });

  // Application des inversions réseau arbitrées
  if (arbitratedReferences.length > 0) {
    for (const arbKey of arbitratedReferences) {
      const isNext = arbKey.endsWith(':next');
      const cleanRef = isNext ? arbKey.replace(':next', '') : arbKey;
      const idx = sorted.findIndex(
        (t) => (t.reference === cleanRef || t.id === cleanRef) && t.operator === 'MVOLA'
      );
      if (idx !== -1) {
        if (isNext && idx < sorted.length - 1) {
          const temp = sorted[idx];
          sorted[idx] = sorted[idx + 1];
          sorted[idx + 1] = temp;
        } else if (!isNext && idx > 0) {
          const temp = sorted[idx];
          sorted[idx] = sorted[idx - 1];
          sorted[idx - 1] = temp;
        } else if (idx === 0 && sorted.length > 1) {
          const temp = sorted[0];
          sorted[0] = sorted[1];
          sorted[1] = temp;
        }
      }
    }
  }

  let runningCash = anchor.cash;
  let runningMvola = anchor.mvola;
  let runningAirtel = anchor.airtel;
  let mvolaTxCount = 0;
  let airtelTxCount = 0;

  const result: Transaction[] = [];

  for (const raw of sorted) {
    if (raw.operator === 'MVOLA') {
      mvolaTxCount++;
      const previousMvola = runningMvola;
      let type: TransactionType = 'DEPOT';
      let typeLabel = 'Dépôt Client';
      let typeOperation: NormalizedOperationType = 'dépôt';
      let calculatedFee = 0;
      // 1. CAPTURE COMMUNE DU BONUS (COMMISSION) :
      // Extrais la valeur numérique immédiatement après le terme "Bonus:" ou "Bonus: ".
      // Stocke cette valeur dans la variable "Bonus_MVola" et affiche-la dans la colonne "Commission".
      let bonusMvola = raw.commission || 0;
      let balanceMismatch = false;
      let balanceGap = 0;
      let explanation = '';

      // 2. ALGORITHMES DE CALCUL DE LA CASCADE EN ARRIÈRE-PLAN (TRIÉ PAR REF CROISSANT) :
      if (raw.rawTypeCandidate === 'CREDIT') {
        // - Si TYPE "CREDIT" (Achat YAS) :
        //   Solde_Théorique = Solde_Précédent - Montant_Brut + Bonus_MVola;
        type = 'CREDIT';
        typeLabel = 'Achat Crédit YAS';
        typeOperation = 'crédit';
        runningCash += raw.amount;

        if (bonusMvola === 0 && raw.reportedBalance !== undefined) {
          const expectedWithoutBonus = previousMvola - raw.amount;
          if (raw.reportedBalance > expectedWithoutBonus) {
            bonusMvola = raw.reportedBalance - expectedWithoutBonus;
          }
        }
        runningMvola = previousMvola - raw.amount + bonusMvola;
        explanation = `Encaissement Cash (+${raw.amount.toLocaleString('fr-FR')} Ar), Débit Flotte MVola (-${raw.amount.toLocaleString('fr-FR')} Ar)${bonusMvola > 0 ? ` + Bonus YAS (+${bonusMvola.toLocaleString('fr-FR')} Ar)` : ''}`;
      } else if (raw.rawTypeCandidate === 'RETRAIT') {
        // - Si TYPE "RETRAIT" (Ar recu de) :
        //   Solde_Théorique = Solde_Précédent + Montant_Brut + Bonus_MVola;
        type = 'RETRAIT';
        typeLabel = 'Retrait MVola';
        typeOperation = 'retrait';
        runningCash -= raw.amount;
        runningMvola = previousMvola + raw.amount + bonusMvola;
        explanation = `Sortie Caisse (-${raw.amount.toLocaleString('fr-FR')} Ar), Crédit Flotte (+${raw.amount.toLocaleString('fr-FR')} Ar) + Bonus (+${bonusMvola.toLocaleString('fr-FR')} Ar)`;
      } else if (raw.rawTypeCandidate === 'ECHANGE' || (raw.rawTypeCandidate === 'TRANSFERT' && /Raison\s*:/i.test(raw.rawText)) || /Raison\s*:/i.test(raw.rawText)) {
        // - Si TYPE "ECHANGE" (SMS contenant "Raison:") :
        //   * Cas Sortant (envoye a) : Solde_Théorique = Solde_Précédent - Montant_Brut; (Bonus = 0)
        //   * Cas Entrant (recu de) : Solde_Théorique = Solde_Précédent + Montant_Brut; (Bonus = 0)
        type = 'ECHANGE';
        typeOperation = 'echange';
        bonusMvola = 0; // Bonus = 0
        calculatedFee = 0;

        const isSortant = /envoye\s+a/i.test(raw.rawText);
        const isEntrant = /recu\s+de/i.test(raw.rawText);

        if (isSortant) {
          typeLabel = 'Échange Sortant';
          runningMvola = previousMvola - raw.amount;
          runningCash += raw.amount;
          explanation = `Échange MVola (Sortant): Débit Flotte (-${raw.amount.toLocaleString('fr-FR')} Ar), Entrée Caisse Cash (+${raw.amount.toLocaleString('fr-FR')} Ar)`;
        } else if (isEntrant) {
          typeLabel = 'Échange Entrant';
          runningMvola = previousMvola + raw.amount;
          runningCash -= raw.amount;
          explanation = `Échange MVola (Entrant): Crédit Flotte (+${raw.amount.toLocaleString('fr-FR')} Ar), Sortie Caisse Cash (-${raw.amount.toLocaleString('fr-FR')} Ar)`;
        } else {
          typeLabel = 'Échange Flotte';
          runningMvola = previousMvola - raw.amount;
          runningCash += raw.amount;
          explanation = `Échange MVola: Montant ${raw.amount.toLocaleString('fr-FR')} Ar`;
        }
      } else if (raw.rawTypeCandidate === 'TRANSFERT') {
        // - Si TYPE "TRANSFERT" (Vous avez credite AVEC Frais) :
        //   Solde_Théorique = Solde_Précédent - Montant_Brut - Frais_MVola + Bonus_MVola;
        type = 'TRANSFERT';
        typeLabel = 'Transfert avec Frais';
        typeOperation = 'transfert';
        calculatedFee = raw.statedFee;
        const total = raw.amount + calculatedFee;
        runningCash += total;
        runningMvola = previousMvola - raw.amount - calculatedFee + bonusMvola;
        explanation = `Encaissement Client (+${total.toLocaleString('fr-FR')} Ar = ${raw.amount.toLocaleString('fr-FR')} + ${calculatedFee.toLocaleString('fr-FR')} Frais), Débit Flotte (-${(raw.amount + calculatedFee).toLocaleString('fr-FR')} Ar)${bonusMvola > 0 ? ` + Bonus (+${bonusMvola.toLocaleString('fr-FR')} Ar)` : ''}`;
      } else {
        // - Si TYPE "DÉPÔT CLIENT" (Vous avez credite SANS Frais) :
        //   Solde_Théorique = Solde_Précédent - Montant_Brut + Bonus_MVola;
        type = 'DEPOT';
        typeLabel = 'Dépôt Client';
        typeOperation = 'dépôt';
        calculatedFee = 0;
        runningCash += raw.amount;
        runningMvola = previousMvola - raw.amount + bonusMvola;
        explanation = `Encaissement Client (+${raw.amount.toLocaleString('fr-FR')} Ar), Débit Flotte (-${raw.amount.toLocaleString('fr-FR')} Ar)${bonusMvola > 0 ? ` + Bonus (+${bonusMvola.toLocaleString('fr-FR')} Ar)` : ''}`;
      }

      // 3. SÉCURITÉ ALERTE ÉCART :
      // Lors de la soumission du tout premier SMS (ou de la première ligne d'un fichier),
      // l'application ne doit PAS effectuer de comparaison mathématique avec le solde d'ancrage de départ pour lever une alerte.
      // Elle doit automatiquement initialiser et écraser le solde de la flotte avec la valeur réelle écrite dans ce premier SMS.
      // L'alerte d'écart ne s'enclenchera qu'à partir du DEUXIÈME SMS de la chaîne.
      const theoreticalOperatorBalance = runningMvola;

      if (mvolaTxCount === 1) {
        balanceMismatch = false;
        balanceGap = 0;
        if (raw.reportedBalance !== undefined) {
          runningMvola = raw.reportedBalance;
        }
      } else {
        // À partir du deuxième SMS : si Solde_Théorique !== Solde_Réel_SMS, affiche l'alerte
        if (raw.reportedBalance !== undefined) {
          if (raw.reportedBalance !== theoreticalOperatorBalance) {
            balanceMismatch = true;
            balanceGap = theoreticalOperatorBalance - raw.reportedBalance;
          }
          runningMvola = raw.reportedBalance;
        }
      }

      // 17. Contrainte majeure : Si un SMS ne contient aucune chaîne de solde,
      // la variable "Solde apres" conserve par défaut la valeur du solde précédent de la flotte
      const soldeApres = raw.reportedBalance !== undefined ? raw.reportedBalance : previousMvola;

      result.push({
        // --- 9 VARIABLES DU REGISTRE DE CAISSE (SECTION 9) ---
        heure: raw.timeStr,
        operateur: 'MVola',
        typeOperation,
        numero: raw.phoneNumber,
        montant: raw.amount,
        commission: bonusMvola, // Variable Bonus_MVola affichée dans la colonne Commission
        frais: calculatedFee,
        soldeApres,
        reference: raw.reference,

        // Attributs techniques complémentaires
        id: raw.id,
        operator: 'MVOLA',
        type,
        typeLabel,
        timestamp: raw.timestamp,
        dateStr: raw.dateStr,
        timeStr: raw.timeStr,
        rawText: raw.rawText,
        amount: raw.amount,
        calculatedFee,
        recipientOrSender: raw.phoneNumber !== '-' ? raw.phoneNumber : undefined,
        flotteBalanceAfter: runningMvola,
        cashBalanceAfter: runningCash,
        runningMvolaAfter: runningMvola,
        runningAirtelAfter: runningAirtel,
        smsReportedBalance: raw.reportedBalance,
        theoreticalOperatorBalance,
        balanceMismatch,
        balanceGap,
        isSpecialAirtel: false,
        explanation,
      });
    } else {
      // -------------------------------------------------------------
      // 2. LOGIQUE ET ENQUÊTE MATHÉMATIQUE AIRTEL MONEY
      // -------------------------------------------------------------
      airtelTxCount++;
      const prefix = (raw.rawTypeCandidate || '').toUpperCase();
      let type: TransactionType = 'DEPOT';
      let typeLabel = 'Dépôt Airtel';
      let typeOperation: NormalizedOperationType = 'dépôt';
      let commission = raw.commission;
      let calculatedFee = 0;
      let isSpecialAirtel = false;
      let airtelVerdict: Transaction['airtelVerdict'] = 'STANDARD';
      let explanation = '';
      let theoreticalOperatorBalance = runningAirtel;
      let balanceMismatch = false;
      let balanceGap = 0;
      const previousAirtel = runningAirtel;

      if (prefix === 'MO') {
        // CRÉDIT / Recharge de crédit
        type = 'CREDIT';
        typeLabel = 'Recharge Crédit';
        typeOperation = 'crédit';
        runningCash += raw.amount;
        // Solde théorique = Solde précédent - Montant + Commission
        theoreticalOperatorBalance = previousAirtel - raw.amount + commission;
        runningAirtel = theoreticalOperatorBalance;
        explanation = `Encaissement Cash (+${raw.amount.toLocaleString('fr-FR')} Ar), Débit Flotte Airtel (-${raw.amount.toLocaleString('fr-FR')} Ar)${commission > 0 ? ` + Com (+${commission.toLocaleString('fr-FR')} Ar)` : ''}`;
      } else if (prefix === 'CO') {
        // RETRAIT
        type = 'RETRAIT';
        typeLabel = 'Retrait Airtel';
        typeOperation = 'retrait';
        runningCash -= raw.amount;
        // Solde théorique = Solde précédent + Montant + Commission
        theoreticalOperatorBalance = previousAirtel + raw.amount + commission;
        runningAirtel = theoreticalOperatorBalance;
        explanation = `Sortie Caisse (-${raw.amount.toLocaleString('fr-FR')} Ar), Crédit Flotte (+${raw.amount.toLocaleString('fr-FR')} Ar) + Com (+${commission.toLocaleString('fr-FR')} Ar)`;
      } else if (prefix === 'MB') {
        // 18. LOGIQUE EXCLUSIVE POUR LES SMS AIRTEL MONEY "PAIEMENT MARCHAND / OFFRE" (ID COMMENÇANT PAR "MB")
        type = 'CREDIT';
        typeLabel = 'Achat Offre / Crédit (MB)';
        typeOperation = 'crédit';
        isSpecialAirtel = true;
        airtelVerdict = 'MARCHAND_MB';
        runningCash += raw.amount;

        if (raw.reportedBalance !== undefined) {
          const expectedBalanceWithoutCommission = previousAirtel - raw.amount;
          if (raw.commission > 0) {
            commission = raw.commission;
          } else {
            commission = Math.max(0, raw.reportedBalance - expectedBalanceWithoutCommission);
          }
          theoreticalOperatorBalance = previousAirtel - raw.amount + commission;
          runningAirtel = theoreticalOperatorBalance;
        } else {
          theoreticalOperatorBalance = previousAirtel - raw.amount + commission;
          runningAirtel = theoreticalOperatorBalance;
        }

        explanation = `Achat Offre / Crédit MB: Encaissement Cash +${raw.amount.toLocaleString('fr-FR')} Ar. Flotte Airtel = ${runningAirtel.toLocaleString('fr-FR')} Ar. Commission calculée = +${commission.toLocaleString('fr-FR')} Ar (${raw.reportedBalance?.toLocaleString('fr-FR')} - (${previousAirtel.toLocaleString('fr-FR')} - ${raw.amount.toLocaleString('fr-FR')})).`;
      } else if (prefix === 'PP') {
        // A) POUR AIRTEL MONEY : Tout SMS dont l'ID commence par les lettres "PP" doit être catégorisé sous le type strict : "Echange"
        type = 'ECHANGE';
        typeOperation = 'echange';
        isSpecialAirtel = true;
        airtelVerdict = 'ECHANGE_PP';
        commission = 0;
        calculatedFee = 0;

        const isRecu = /Vous\s+avez\s+recu/i.test(raw.rawText);
        const isTransfere = /Vous\s+avez\s+transf[eé]r[eé]/i.test(raw.rawText);

        if (isRecu) {
          // Échange Entrant : + Flotte Airtel et - Caisse Cash
          typeLabel = 'Échange Entrant';
          runningCash -= raw.amount;
          theoreticalOperatorBalance = previousAirtel + raw.amount;
          runningAirtel = theoreticalOperatorBalance;
          explanation = `Échange Airtel (Entrant): Crédit Flotte (+${raw.amount.toLocaleString('fr-FR')} Ar), Sortie Caisse Cash (-${raw.amount.toLocaleString('fr-FR')} Ar)`;
        } else if (isTransfere) {
          // Échange Sortant : - Flotte Airtel et + Caisse Cash
          typeLabel = 'Échange Sortant';
          runningCash += raw.amount;
          theoreticalOperatorBalance = previousAirtel - raw.amount;
          runningAirtel = theoreticalOperatorBalance;
          explanation = `Échange Airtel (Sortant): Débit Flotte (-${raw.amount.toLocaleString('fr-FR')} Ar), Entrée Caisse Cash (+${raw.amount.toLocaleString('fr-FR')} Ar)`;
        } else {
          typeLabel = 'Échange Flotte';
          runningCash += raw.amount;
          theoreticalOperatorBalance = previousAirtel - raw.amount;
          runningAirtel = theoreticalOperatorBalance;
          explanation = `Échange Airtel PP: Montant ${raw.amount.toLocaleString('fr-FR')} Ar`;
        }
      } else {
        // 22. Cas du TYPE "CI" (L'enquête mathématique stricte d'arbitrage) :
        // Applique obligatoirement l'équation :
        // [Solde Airtel du SMS précédent en mémoire] - [Montant actuel] + [Commission actuelle] = [Solde Après Théorique]
        const soldeApresTheorique = previousAirtel - raw.amount + commission;
        theoreticalOperatorBalance = soldeApresTheorique;
        const realSmsBalance = raw.reportedBalance;

        if (realSmsBalance !== undefined) {
          // Écart = [Solde Après Théorique] - [Solde réel écrit dans le SMS]
          const ecart = soldeApresTheorique - realSmsBalance;

          if (ecart === 0) {
            // VERDICT 1 (Aucun frais caché) : Qualifiée de "dépôt"
            type = 'DEPOT';
            typeLabel = 'Dépôt Client';
            typeOperation = 'dépôt';
            airtelVerdict = 'DEPOT_NORMAL';
            calculatedFee = 0;

            runningCash += raw.amount;
            runningAirtel = realSmsBalance;
            explanation = `Dépôt Client validé: Théorique (${soldeApresTheorique.toLocaleString('fr-FR')} Ar) = SMS. Encaissement Cash +${raw.amount.toLocaleString('fr-FR')} Ar, Com: ${commission.toLocaleString('fr-FR')} Ar`;
          } else {
            // VERDICT 2 (Présence de frais cachés) : Qualifiée de "transfert"
            type = 'TRANSFERT';
            typeLabel = 'Transfert (Frais cachés)';
            typeOperation = 'transfert';
            isSpecialAirtel = true;
            airtelVerdict = 'TRANSFERT_FRAIS_CACHES';
            calculatedFee = ecart;

            runningCash += raw.amount + ecart;
            runningAirtel = realSmsBalance;
            explanation = `Détection Frais Cachés: Théorique (${soldeApresTheorique.toLocaleString('fr-FR')} Ar) ≠ SMS (${realSmsBalance.toLocaleString('fr-FR')} Ar) -> Frais cachés: ${ecart.toLocaleString('fr-FR')} Ar encaissés en Cash`;
          }
        } else {
          type = 'DEPOT';
          typeLabel = 'Dépôt Client';
          typeOperation = 'dépôt';
          airtelVerdict = 'DEPOT_NORMAL';
          calculatedFee = 0;

          runningCash += raw.amount;
          runningAirtel = soldeApresTheorique;
          explanation = `Dépôt Client validé: Encaissement Cash +${raw.amount.toLocaleString('fr-FR')} Ar, Com: ${commission.toLocaleString('fr-FR')} Ar`;
        }
      }

      // 22. PROTOCOLE DE VÉRIFICATION ET D'ALERTE D'ÉCART POUR AIRTEL MONEY (ANTI-FRAUDE) :
      // A) À partir de la deuxième transaction de la chaîne (après le message d'ancrage initial),
      // le moteur comptable compare le solde théorique calculé en arrière-plan avec le solde réel officiel extrait du corps du SMS.
      if (airtelTxCount === 1) {
        // Premier SMS Airtel de la chaîne : initialisation automatique sans alerte
        balanceMismatch = false;
        balanceGap = 0;
      } else {
        // À partir du 2ème SMS : vérification d'intégrité anti-fraude
        if (prefix !== 'CI') {
          // Pour les types MO / CO / MB / PP : La cascade calcule son solde théorique.
          // Si le solde après théorique diffère (ne serait-ce que de 1 Ar) du solde réel du SMS :
          if (raw.reportedBalance !== undefined && raw.reportedBalance !== theoreticalOperatorBalance) {
            balanceMismatch = true;
            balanceGap = theoreticalOperatorBalance - raw.reportedBalance;
          }
        } else {
          // Pour le type CI : Si l'écart est anormalement négatif (solde SMS supérieur au théorique),
          // lever un drapeau d'alerte car des fonds ne peuvent pas apparaître spontanément
          if (raw.reportedBalance !== undefined && theoreticalOperatorBalance < raw.reportedBalance) {
            balanceMismatch = true;
            balanceGap = theoreticalOperatorBalance - raw.reportedBalance;
          }
        }
      }

      // 2. RECONSTRUCTION DU SOLDE RELAIS (CONTINUITÉ DE LA CASCADE) :
      // Dès qu'une ligne Airtel Money (Dépôt, Transfert, MB, PP ou Crédit) est traitée,
      // l'application doit obligatoirement enregistrer le "Solde réel écrit dans le SMS" (ex: 71 831 Ar)
      // comme le nouveau "Solde Précédent" pour la transaction suivante.
      // L'enquête mathématique ne sert qu'à identifier le type (Dépôt vs Transfert) et à calculer les frais cachés
      // de la ligne actuelle, elle ne doit pas bloquer ni fausser le point de départ du SMS suivant.
      if (raw.reportedBalance !== undefined) {
        runningAirtel = raw.reportedBalance;
      }

      // 17. Contrainte majeure : Si un SMS ne contient aucune chaîne de solde,
      // la variable "Solde apres" conserve par défaut la valeur du solde précédent de la flotte
      const soldeApres = raw.reportedBalance !== undefined ? raw.reportedBalance : previousAirtel;

      result.push({
        // --- 9 VARIABLES DU REGISTRE DE CAISSE (SECTION 9) ---
        heure: raw.timeStr,
        operateur: 'Airtel Money',
        typeOperation,
        numero: raw.phoneNumber,
        montant: raw.amount,
        commission,
        frais: calculatedFee,
        soldeApres,
        reference: raw.reference,

        // Attributs techniques complémentaires
        id: raw.id,
        operator: 'AIRTEL',
        type,
        typeLabel,
        timestamp: raw.timestamp,
        dateStr: raw.dateStr,
        timeStr: raw.timeStr,
        rawText: raw.rawText,
        amount: raw.amount,
        calculatedFee,
        recipientOrSender: raw.phoneNumber !== '-' ? raw.phoneNumber : undefined,
        flotteBalanceAfter: runningAirtel,
        cashBalanceAfter: runningCash,
        runningAirtelAfter: runningAirtel,
        runningMvolaAfter: runningMvola,
        smsReportedBalance: raw.reportedBalance,
        theoreticalOperatorBalance,
        balanceMismatch,
        balanceGap,
        isSpecialAirtel,
        airtelVerdict,
        explanation,
      });
    }
  }

  return result;
}

/**
 * Traitement d'un bloc de SMS ou d'un fichier (PDF / CSV) pour l'audit de masse (Onglet 2)
 * Applique strictement les délimitations Section 11 et l'attribution chronologique (Règle 11.C)
 */
export function processBatchAudit(
  bulkInput: string | ExtractedFileSmsItem[],
  existingRawTransactions: RawParsedSms[],
  anchor: AnchorBalances
): {
  updatedRawTransactions: RawParsedSms[];
  summary: BatchAuditSummary;
} {
  const items: ExtractedFileSmsItem[] = Array.isArray(bulkInput)
    ? bulkInput
    : splitBulkSmsText(bulkInput).map((s) => ({ smsText: s }));

  const existingIdSet = new Set(existingRawTransactions.map((t) => t.id));

  const duplicateIds: string[] = [];
  const unrecognizedLines: string[] = [];
  const newValidRaw: RawParsedSms[] = [];

  // Timestamp de référence pour les SMS sans horodatage explicite
  let lastKnownTimestamp = Date.now();

  for (const item of items) {
    const timeInfo = item.associatedTimestamp
      ? {
          dateStr: item.associatedDateStr || '',
          timeStr: item.associatedTimeStr || '',
          timestamp: item.associatedTimestamp,
        }
      : undefined;

    const parseResult = parseSingleSms(item.smsText, lastKnownTimestamp, timeInfo);
    if (!parseResult.success || !parseResult.data) {
      unrecognizedLines.push(item.smsText);
      continue;
    }

    const raw = parseResult.data;
    if (!raw.isDateEstimated) {
      lastKnownTimestamp = raw.timestamp;
    }

    // Détection anti-doublon par ID ou Ref
    if (existingIdSet.has(raw.id)) {
      duplicateIds.push(raw.id);
    } else {
      existingIdSet.add(raw.id);
      newValidRaw.push(raw);
    }
  }

  const combined = [...existingRawTransactions, ...newValidRaw];

  // Exécution du calcul pour déterminer les totaux de frais et commissions apportés
  const calculated = recalculateAllTransactions(combined, anchor);
  const newlyCalculated = calculated.filter((t) =>
    newValidRaw.some((n) => n.id === t.id)
  );

  const hiddenFeesTotal = newlyCalculated.reduce(
    (sum, t) => sum + (t.calculatedFee || 0),
    0
  );
  const commissionsTotal = newlyCalculated.reduce(
    (sum, t) => sum + (t.commission || 0),
    0
  );

  return {
    updatedRawTransactions: combined,
    summary: {
      totalExtracted: items.length,
      addedCount: newValidRaw.length,
      duplicatesSkipped: duplicateIds.length,
      unrecognizedCount: unrecognizedLines.length,
      duplicateIds,
      unrecognizedLines,
      hiddenFeesTotal,
      commissionsTotal,
    },
  };
}

/**
 * Teste si l'arbitrage d'inversion réseau résout mathématiquement l'écart de solde.
 * Si une inversion avec le voisin précédent ou suivant rétablit l'égalité stricte des soldes (écart = 0 Ar, aucun trou financier),
 * l'inversion est validée comme authentique.
 */
export function testNetworkInversionArbitration(
  rawTransactions: RawParsedSms[],
  anchor: AnchorBalances,
  reference: string,
  currentArbitrated: string[] = []
): { isValid: boolean; arbitratedList: string[] } {
  // 1. Essai avec swap précédent
  const candidate1 = currentArbitrated.includes(reference)
    ? currentArbitrated
    : [...currentArbitrated, reference];

  const txs1 = recalculateAllTransactions(rawTransactions, anchor, candidate1);
  const target1 = txs1.find((t) => t.reference === reference || t.id === reference);
  const mismatches1 = txs1.filter((t) => t.operator === 'MVOLA' && t.balanceMismatch);

  if (target1 && !target1.balanceMismatch && mismatches1.length === 0) {
    return { isValid: true, arbitratedList: candidate1 };
  }

  // 2. Si non résolu, essai avec swap successeur (en taguant avec suffixe ':next')
  const candidate2 = currentArbitrated.includes(reference + ':next')
    ? currentArbitrated
    : [...currentArbitrated, reference + ':next'];

  const txs2 = recalculateAllTransactions(rawTransactions, anchor, candidate2);
  const target2 = txs2.find((t) => t.reference === reference || t.id === reference);
  const mismatches2 = txs2.filter((t) => t.operator === 'MVOLA' && t.balanceMismatch);

  if (target2 && !target2.balanceMismatch && mismatches2.length === 0) {
    return { isValid: true, arbitratedList: candidate2 };
  }

  // Si aucun swap ne résout parfaitement l'anomalie sans trou financier : échec
  return { isValid: false, arbitratedList: currentArbitrated };
}
