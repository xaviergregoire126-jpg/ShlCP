export const SAMPLE_SMS_REALTIME = [
  {
    title: 'Règle A - Depot de Ar[Montant] pour...',
    sms: 'CI261004.0850.C43625 Depot de Ar20000 pour Meltine. Commission 208 Ar. Solde: 480208 Ar.',
    description: 'Règle A : Capture "20000" après "Depot de Ar" et avant "pour". Nettoyage strict en entier.',
  },
  {
    title: 'Règle A (100k) - Depot de Ar100000 pour...',
    sms: 'CI261004.0930.C43626 Depot de Ar100000 pour RAHARINJANAHARY. Commission 450 Ar. Solde: 378658 Ar.',
    description: 'Règle A : Extrait 100000. Solde théorique ≠ SMS -> Détection 2 000 Ar de frais cachés (Transfert) !',
  },
  {
    title: 'Règle B - Recharge de [Montant] Ar',
    sms: 'MO261004.1010.B99281 Recharge de 500 Ar envoyee au 0331122334. Solde: 378158 Ar.',
    description: 'Règle B : Extrait 500 situé après "Recharge de " et avant " Ar".',
  },
  {
    title: 'Règle C - Vous avez recu [Montant] Ar',
    sms: 'CO261004.1105.A10293 Vous avez recu 5000 Ar de *36040857 avec commission 50 Ar. Solde: 383208 Ar.',
    description: 'Règle C : Extrait 5000 situé après "Vous avez recu " et avant " Ar".',
  },
  {
    title: 'Section 18 - Airtel Marchand/Offre MB (500 Ar)',
    sms: 'MB261005.0708.D16623 Vous avez paye Ar 500 a AIRTELMLAY. Solde Ar 241772.',
    description: 'Catégorisé en "crédit", Cash +500 Ar, Flotte = 241772 Ar, Commission calculée par inversion de solde.',
  },
  {
    title: 'Règle D - Vous avez paye Ar [Montant]',
    sms: 'MB261004.1243.C08790 Vous avez paye Ar 500 a AIRTELMLAY. Solde Ar 382708.',
    description: 'Règle D : Extrait 500 situé après "Vous avez paye Ar " et avant la lettre "a".',
  },
  {
    title: 'MVola - Retrait avec Bonus (Commission 1000)',
    sms: '79 700 Ar recu de MELINE le 04/10/26 a 09:15. Bonus:1 000 Ar. Ref: 8945231. Solde MVola : 579 700 Ar.',
    description: 'Capture commission MVola après "Bonus:" : "1 000" nettoyé en 1000 Ar de commission.',
  },
  {
    title: 'MVola - Dépôt avec Bonus (Commission 292)',
    sms: 'Vous avez credite germaine (0382330305) de 40 000 Ar le 04/10/26 a 10:14. Bonus:292 Ar. Ref: 789123. Solde MVola : 539 700 Ar.',
    description: 'Capture commission MVola après "Bonus:" : "292" nettoyé en 292 Ar de commission.',
  },
  {
    title: 'MVola - Retrait 210 000 Ar (Règle B)',
    sms: '210 000 Ar recu de 038 11 222 33 le 04/10/26 a 09:15. Ref: 8945231. Solde MVola : 710 000 Ar.',
    description: 'Règle B : Chaine capturée "210 000" avant " Ar recu de". Nettoyage strict = 210000 Ar.',
  },
  {
    title: 'MVola - Transfert 31 300 Ar (Règle C + Frais)',
    sms: 'Vous avez credite Iarilalaina (0382330305) de 31 300 Ar le 04/10/26 a 10:14. Frais: 1 200 Ar. Ref: 789123. Solde MVola : 677 500 Ar.',
    description: 'Règle C : Chaine "31 300" après " de " et avant " Ar le". Nettoyage = 31300 Ar + 1 200 Ar Frais.',
  },
  {
    title: 'MVola - Dépôt 105 000 Ar (Règle C sans Frais)',
    sms: 'Vous avez credite JAMES (0384176524) de 105 000 Ar le 04/10/26 a 10:30. Ref: 456789. Solde MVola : 572 500 Ar.',
    description: 'Règle C : Chaine "105 000" après " de " et avant " Ar le". Nettoyage = 105000 Ar.',
  },
  {
    title: 'Section 19 - MVola YAS Sans Heure (Ref: 8380274284)',
    sms: 'Achat de credit YAS reussi: 1 000 Ar pour 0341234567. Ref: 8380274284. Nouveau Solde MVola: 538 700 Ar.',
    description: 'Aucune heure dans le SMS. Intercalé automatiquement par son numéro de référence.',
  },
  {
    title: 'MVola - Achat Crédit YAS 1 000 Ar (Règle A)',
    sms: 'Achat de credit YAS reussi: 1 000 Ar pour 0341234567. Ref: 104523992. Nouveau Solde MVola: 571 500 Ar.',
    description: 'Règle A : Chaine "1 000" après ":" et avant " Ar pour". Nettoyage = 1000 Ar.',
  },
  {
    title: 'Section 21.A - Airtel Approvisionnement Reçu PP',
    sms: 'PP261006.0839 Vous avez recu Ar 100000 de 0331234567. Votre solde est Ar 350000.',
    description: 'Type "transfert", +Flotte Airtel (100k), -Caisse Cash (100k), Solde: 350000 Ar, 08:39.',
  },
  {
    title: 'Section 21.A - Airtel Cession Transféré PP',
    sms: 'PP261006.0915 Vous avez transfere Ar 50000 a 0339876543. Nouveau solde Ar 300000.',
    description: 'Type "transfert", -Flotte Airtel (50k), +Caisse Cash (50k), Solde: 300000 Ar, 09:15.',
  },
  {
    title: 'Section 21.B - MVola Échange Flotte Sortant (Envoyé)',
    sms: '50 000 Ar envoye a 0341234567 le 06/10/26 a 08:39. Raison: Approvisionnement. Solde: 438 700 . Ref: 8479123456',
    description: 'Cas 1 Sortant: Type "transfert", -Flotte MVola (50k), +Caisse Cash (50k), Commission 0 Ar, Solde: 438700 Ar.',
  },
  {
    title: 'Section 21.B - MVola Échange Flotte Entrant (Reçu)',
    sms: '100 000 Ar recu de 0349876543 le 30/09/26 a 09:06. Raison: Echange liquidites. Solde : 538 700 Ar. Ref: 8480112233',
    description: 'Cas 2 Entrant: Type "transfert", +Flotte MVola (100k), -Caisse Cash (100k), Commission 0 Ar, Solde: 538700 Ar.',
  },
  {
    title: 'SMS Inconnu (Test Sécurité)',
    sms: 'Bonjour cher ami, rendez-vous à Analakely à 14h pour le déjeuner.',
    description: 'Doit bloquer l\'insertion et déclencher la modale "SMS non reconnu".',
  },
];

export const SAMPLE_BATCH_BLOCK = `CI261004.0850.C43625 Depot de Ar20000 pour Meltine. Commission 208 Ar. Solde: 480208 Ar.
210 000 Ar recu de 038 11 222 33 le 04/10/26 a 09:15. Ref: 8945231. Solde MVola : 710 000 Ar.
CI261004.0930.C43626 Depot de Ar100000 pour RAHARINJANAHARY. Commission 450 Ar. Solde: 378658 Ar.
Vous avez credite Iarilalaina (0382330305) de 31 300 Ar le 04/10/26 a 10:14. Frais: 1 200 Ar. Ref: 789123. Solde MVola : 677 500 Ar.
MO261004.1010.B99281 Recharge de 500 Ar envoyee au 0331122334. Solde: 378158 Ar.
Vous avez credite JAMES (0384176524) de 105 000 Ar le 04/10/26 a 10:30. Ref: 456789. Solde MVola : 572 500 Ar.
CO261004.1105.A10293 Vous avez recu 5000 Ar de *36040857 avec commission 50 Ar. Solde: 383208 Ar.
Achat de credit YAS reussi: 1 000 Ar pour 0341234567. Ref: 104523992. Nouveau Solde MVola: 571 500 Ar.
MB261004.1243.C08790 Vous avez paye Ar 500 a AIRTELMLAY. Solde: 382708 Ar.`;

/**
 * Modèle officiel CSV conforme à la Section 11.A :
 * "Type","Date","Nom / Numéro","Expéditeur","Contenu"
 */
export const SAMPLE_EXCLUSIVE_CSV = `"Type","Date","Nom / Numéro","Expéditeur","Contenu"
"Reçu","04/10/2026 08:50","Meltine","Airtel","CI261004.0850.C43625 Depot de Ar20000 pour Meltine. Commission 208 Ar. Solde: 480208 Ar."
"Reçu","04/10/2026 09:15","MELINE","MVola","79 700 Ar recu de MELINE le 04/10/26 a 09:15. Bonus:1 000 Ar. Ref: 8945231. Solde MVola : 579 700 Ar."
"Reçu","04/10/2026 09:30","RAHARINJANAHARY","Airtel","CI261004.0930.C43626 Depot de Ar100000 pour RAHARINJANAHARY. Commission 450 Ar. Solde: 378658 Ar."
"Reçu","04/10/2026 10:14","Iarilalaina","MVola","Vous avez credite Iarilalaina (0382330305) de 31 300 Ar le 04/10/26 a 10:14. Frais: 1 200 Ar. Ref: 789123. Solde MVola : 677 500 Ar."
"Reçu","04/10/2026 10:14","JAMES","MVola","Achat de credit YAS reussi: 1 000 Ar pour 0341234567. Ref: 104523992. Nouveau Solde MVola: 571 500 Ar."
"Reçu","04/10/2026 10:30","JAMES","MVola","Vous avez credite JAMES (0384176524) de 105 000 Ar le 04/10/26 a 10:30. Ref: 456789. Solde MVola : 572 500 Ar."
"Reçu","04/10/2026 11:05","*36040857","Airtel","CO261004.1105.A10293 Vous avez recu 5000 Ar de *36040857 avec commission 50 Ar. Solde: 383208 Ar."`;

