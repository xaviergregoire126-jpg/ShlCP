export type Operator = 'MVOLA' | 'AIRTEL';

export type NormalizedOperationType = 'crédit' | 'dépôt' | 'retrait' | 'transfert' | 'echange';

export type DisplayOperatorName = 'MVola' | 'Airtel Money';

export type TransactionType = 'DEPOT' | 'RETRAIT' | 'TRANSFERT' | 'CREDIT' | 'MARCHAND' | 'ECHANGE';

export interface AnchorBalances {
  cash: number;
  mvola: number;
  airtel: number;
  isLocked: boolean;
}

export interface ExtractedFileSmsItem {
  smsText: string;
  associatedDateStr?: string;
  associatedTimeStr?: string;
  associatedTimestamp?: number;
}

export interface RawParsedSms {
  id: string; // Numéro après "Ref:" pour MVola ou ID complet pour Airtel
  reference: string; // Variable 9 : Référence normalisée
  operator: Operator;
  operatorName: DisplayOperatorName; // Variable 2 : "MVola" ou "Airtel Money"
  rawTypeCandidate?: string;
  rawText: string;
  amount: number; // Variable 5 : Montant valeur numérique pure
  commission: number; // Variable 6 : Commission valeur numérique pure
  statedFee: number;
  reportedBalance?: number; // Variable 8 : Solde après inscrit à la fin du SMS
  timestamp: number;
  dateStr: string;
  timeStr: string; // Variable 1 : Heure au format strict "hh:mm" (24h)
  isDateEstimated?: boolean;
  phoneNumber: string; // Variable 4 : Numéro de téléphone ou "-"
}

export interface Transaction {
  // --- 9 VARIABLES DU REGISTRE DE CAISSE (SECTION 9) ---
  heure: string; // 1. Heure : Format strict "hh:mm" (24h)
  operateur: DisplayOperatorName; // 2. Opérateur : "MVola" ou "Airtel Money"
  typeOperation: NormalizedOperationType; // 3. Type d'opération : "crédit" | "dépôt" | "retrait" | "transfert"
  numero: string; // 4. Numéro : téléphone client/cible ou "-"
  montant: number; // 5. Montant : valeur numérique pure
  commission: number; // 6. Commission : valeur numérique pure
  frais: number; // 7. Frais : valeur numérique pure calculée
  soldeApres: number; // 8. Solde après : montant exact du solde inscrit à la fin du SMS
  reference: string; // 9. Référence : numéro après "Ref:" pour MVola ou ID complet pour Airtel

  // Attributs techniques complémentaires
  id: string;
  operator: Operator;
  type: TransactionType;
  typeLabel: string;
  timestamp: number;
  dateStr: string;
  timeStr: string;
  rawText: string;
  amount: number;
  calculatedFee: number;
  recipientOrSender?: string;

  // Soldes de caisse cumulés
  flotteBalanceAfter: number;
  cashBalanceAfter: number;
  runningAirtelAfter: number;
  runningMvolaAfter: number;

  // Audit et vérification
  smsReportedBalance?: number;
  theoreticalOperatorBalance?: number;
  balanceMismatch?: boolean;
  balanceGap?: number;

  // Indicateurs Airtel spéciaux
  isSpecialAirtel?: boolean;
  airtelVerdict?: 'DEPOT_NORMAL' | 'TRANSFERT_FRAIS_CACHES' | 'MARCHAND_MB' | 'TRANSFERT_PP' | 'ECHANGE_PP' | 'STANDARD';
  explanation?: string;
}

export interface ParseResult {
  success: boolean;
  data?: RawParsedSms;
  errorMessage?: string;
}

export interface BatchAuditSummary {
  totalExtracted: number;
  addedCount: number;
  duplicatesSkipped: number;
  unrecognizedCount: number;
  duplicateIds: string[];
  unrecognizedLines: string[];
  hiddenFeesTotal: number;
  commissionsTotal: number;
}

export interface NetworkInversionProof {
  id: string;
  dateStr: string;
  timestamp: number;
  reference?: string;
  smsProof1: string;
  smsProof2: string;
  operator?: Operator;
}
