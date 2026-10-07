import * as pdfjsLib from 'pdfjs-dist';
// Importer le worker directement via Vite en URL locale (aucun appel CDN externe)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ExtractedFileSmsItem } from '../types';
import { parseDateTimeString } from './parser';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

/**
 * Extraction de secours basée sur le décodage direct des flux de texte PDF
 */
export function extractTextFromPdfStreamFallback(binaryString: string): string {
  const textChunks: string[] = [];

  // 1. Recherche des blocs de texte BT ... ET
  const btBlocks = binaryString.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btBlocks) {
    const matches = block.matchAll(/\(([^)]+)\)\s*(?:Tj|'|")/g);
    for (const m of matches) {
      if (m[1]) {
        const decoded = m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\([()\\])/g, '$1');
        textChunks.push(decoded);
      }
    }
  }

  // 2. Recherche générale de chaînes ressemblant à des SMS MVola ou Airtel
  if (textChunks.length === 0) {
    const rawMatches = binaryString.matchAll(/(?:CI|CO|MO|MB)\d{6}\.\d{4}\.[A-Za-z0-9]+[^<>\r\n]+/g);
    for (const rm of rawMatches) {
      textChunks.push(rm[0]);
    }
  }

  return textChunks.join('\n');
}

/**
 * Extrait le texte brut de toutes les pages d'un fichier PDF
 */
export async function extractRawPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);

      fullText += pageStrings.join('\n') + '\n';
    }

    if (fullText.trim().length > 0) {
      return fullText;
    }
  } catch (pdfErr) {
    console.warn('Extraction pdfjs standard a échoué, tentative binaire...', pdfErr);
  }

  const decoder = new TextDecoder('latin1');
  const binaryString = decoder.decode(arrayBuffer);
  const fallbackResult = extractTextFromPdfStreamFallback(binaryString);

  if (fallbackResult.trim().length > 0) {
    return fallbackResult;
  }

  throw new Error('Impossible d\'extraire le texte de ce document PDF.');
}

/**
 * Extrait le texte brut d'un fichier CSV ou TXT
 */
export async function extractRawTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve((e.target?.result as string) || '');
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * 11.A) TRAITEMENT DU STRUCTURE EXCLUSIF CSV :
 * - Le fichier est structuré en colonnes : "Type","Date","Nom / Numéro","Expéditeur","Contenu"
 * - Chaque ligne commence par "Reçu" et se termine par un identifiant unique (l'ID ou la Référence du SMS).
 * - Le corps du SMS à analyser se trouve exclusivement dans la 5ème colonne, c'est-à-dire l'intégralité
 *   du texte situé entre les deux derniers guillemets doubles de la ligne. Ne mélange jamais le contenu d'une ligne avec une autre.
 * 11.C) Attribution chronologique de secours : Date et Heure extraites de la colonne "Date" ou de la ligne supérieure.
 */
export function parseExclusiveCsv(csvContent: string): ExtractedFileSmsItem[] {
  const items: ExtractedFileSmsItem[] = [];
  const lines = csvContent.split(/\r?\n/);

  let lastKnownDateInfo: { dateStr: string; timeStr: string; timestamp: number } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Ignorer l'entête : "Type","Date","Nom / Numéro","Expéditeur","Contenu"
    if (/^"?Type"?\s*,\s*"?Date"?/i.test(line)) continue;

    // Règle 11.A : Chaque ligne commence obligatoirement par "Reçu"
    if (!/^"?(?:Reçu|Recu)/i.test(line)) continue;

    // Extraction de la Date / Heure dans la 2ème colonne
    let rowDateInfo: { dateStr: string; timeStr: string; timestamp: number } | null = null;
    const col2Match = line.match(/^"?(?:Reçu|Recu)"?\s*,\s*"([^"]+)"/i);
    if (col2Match && col2Match[1]) {
      const parsed = parseDateTimeString(col2Match[1]);
      if (parsed) {
        rowDateInfo = parsed;
        lastKnownDateInfo = parsed;
      }
    }

    // Si la colonne 2 est absente, hériter de la ligne supérieure du CSV (Règle 11.C)
    const effectiveDateInfo = rowDateInfo || lastKnownDateInfo;

    // Règle 11.A : Le corps du SMS se trouve exclusivement dans la 5ème colonne
    // (texte situé entre les deux derniers guillemets doubles de la ligne)
    const lastQuote = line.lastIndexOf('"');
    const secondLastQuote = line.lastIndexOf('"', lastQuote - 1);
    let smsContent = '';

    if (lastQuote > secondLastQuote && secondLastQuote !== -1) {
      smsContent = line.slice(secondLastQuote + 1, lastQuote).replace(/""/g, '"').trim();
    } else {
      const parts = line.split(',');
      if (parts.length >= 5) {
        smsContent = parts.slice(4).join(',').replace(/^"|"$/g, '').trim();
      }
    }

    if (smsContent) {
      items.push({
        smsText: smsContent,
        associatedDateStr: effectiveDateInfo?.dateStr,
        associatedTimeStr: effectiveDateInfo?.timeStr,
        associatedTimestamp: effectiveDateInfo?.timestamp,
      });
    }
  }

  return items;
}

/**
 * 11.B) TRAITEMENT DU STRUCTURE EXCLUSIF PDF :
 * - Chaque nouveau message commence obligatoirement par le mot-clé "Reçu" (ou "Reçu [Date]").
 * - Tout le texte qui suit le mot "Reçu" jusqu'au PROCHAIN mot-clé "Reçu" (ou jusqu'à la fin de la page) appartient au même et unique SMS.
 * - Si le texte d'un SMS s'étale sur 2 ou 3 lignes physiques (comme le cas des achats de crédit YAS), tu dois fusionner ces lignes pour recréer le corps du SMS complet avant d'appliquer le parsing.
 * 11.C) Dans le PDF, le SMS Crédit YAS n'a pas d'heure écrite dans son texte. Extrais la Date et l'Heure situées dans les colonnes précédentes du tableau.
 */
export function parseExclusivePdf(pdfText: string): ExtractedFileSmsItem[] {
  const items: ExtractedFileSmsItem[] = [];

  // Découpage par le mot-clé "Reçu" ou "Recu"
  // Recherche de toutes les occurrences de "Reçu" en début de ligne ou de mot
  const recuMatches = [...pdfText.matchAll(/(?:^|[\r\n\s])(?:Reçu|Recu)\b/gi)];

  if (recuMatches.length === 0) {
    // Si pas de mot "Reçu" explicite, découpage ligne par ligne classique
    return parseGenericText(pdfText);
  }

  let lastKnownDateInfo: { dateStr: string; timeStr: string; timestamp: number } | null = null;

  for (let i = 0; i < recuMatches.length; i++) {
    const currentMatch = recuMatches[i];
    const startIndex = (currentMatch.index || 0) + currentMatch[0].length;
    const nextMatch = recuMatches[i + 1];
    const endIndex = nextMatch ? (nextMatch.index || pdfText.length) : pdfText.length;

    const rawBlock = pdfText.slice(startIndex, endIndex).trim();
    if (!rawBlock) continue;

    // 1. Extraction Date et Heure dans les colonnes précédentes du tableau (début du bloc)
    // Ex: "04/10/2026 10:14 JAMES 0384176524 Achat de credit YAS..."
    let blockDateInfo: { dateStr: string; timeStr: string; timestamp: number } | null = null;
    const headerPrefix = rawBlock.slice(0, 100);
    const dateMatch = headerPrefix.match(/(?:le\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:a|à)?\s*(\d{1,2}[:h]\d{2}(?::\d{2})?)/i)
      || headerPrefix.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(\d{1,2}[:h]\d{2}(?::\d{2})?)/i);

    if (dateMatch) {
      const parsed = parseDateTimeString(dateMatch[0]);
      if (parsed) {
        blockDateInfo = parsed;
        lastKnownDateInfo = parsed;
      }
    }

    const effectiveDateInfo = blockDateInfo || lastKnownDateInfo;

    // 2. Localisation du début du SMS proprement dit
    // Triggers Airtel et MVola
    const triggers = [
      /\b(?:CI|CO|MO|MB)\d{6}\.\d{4}\.[A-Za-z0-9]+/i,
      /Achat\s+de\s+credit\s+YAS\s+reussi\s*:/i,
      /[\d\s]+Ar\s+recu\s+de/i,
      /Vous\s+avez\s+credite/i,
      /Depot\s+de\s+Ar/i,
      /Recharge\s+de\s+[\d\s]+Ar/i,
      /Vous\s+avez\s+recu/i,
      /Vous\s+avez\s+paye\s+Ar/i,
    ];

    let bestTriggerIndex = -1;
    for (const regex of triggers) {
      const m = rawBlock.match(regex);
      if (m && m.index !== undefined) {
        if (bestTriggerIndex === -1 || m.index < bestTriggerIndex) {
          bestTriggerIndex = m.index;
        }
      }
    }

    let smsBody = '';
    if (bestTriggerIndex !== -1) {
      smsBody = rawBlock.slice(bestTriggerIndex);
    } else {
      smsBody = rawBlock;
    }

    // 3. Fusion des lignes physiques (Règle 11.B : Si le SMS s'étale sur 2 ou 3 lignes physiques, fusionner)
    const mergedSms = smsBody
      .replace(/\s*\r?\n\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (mergedSms) {
      items.push({
        smsText: mergedSms,
        associatedDateStr: effectiveDateInfo?.dateStr,
        associatedTimeStr: effectiveDateInfo?.timeStr,
        associatedTimestamp: effectiveDateInfo?.timestamp,
      });
    }
  }

  return items;
}

/**
 * Découpe un texte générique en lignes de SMS
 */
export function parseGenericText(text: string): ExtractedFileSmsItem[] {
  const items: ExtractedFileSmsItem[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    items.push({
      smsText: line,
    });
  }

  return items;
}

/**
 * Traite un fichier importé selon la règle 11-A (EXCLUSIVEMENT format .CSV)
 */
export async function extractAndDelimitFile(file: File): Promise<ExtractedFileSmsItem[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    throw new Error("Le format PDF n'est plus pris en charge. Veuillez importer exclusivement un fichier au format .CSV.");
  }

  if (!fileName.endsWith('.csv')) {
    throw new Error("Format de fichier non reconnu. L'application accepte exclusivement les fichiers au format .CSV.");
  }

  const rawText = await extractRawTextFromFile(file);

  // Règle 11-A inchangée : la lecture du CSV se fait uniquement sur la 5ème colonne pour extraire le texte brut du SMS entre les derniers guillemets
  return parseExclusiveCsv(rawText);
}
