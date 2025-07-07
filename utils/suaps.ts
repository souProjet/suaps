import { ActiviteAPI, Creneau, ActiviteOption } from '@/types/suaps';

/**
 * Transforme les données de l'API en créneaux formatés
 */
export function extractCreneaux(data: ActiviteAPI[]): Creneau[] {
  const creneaux: Creneau[] = [];
  
  for (const act of data) {
    if (!act || !act.nom) continue;
    
    const nom = act.nom.toLowerCase();
    const creneauxList = act.creneaux;
    
    if (!creneauxList) continue;
    
    for (const c of creneauxList) {
      if (!c.horaireDebut || !c.horaireFin || !c.jour) continue;
      
      creneaux.push({
        activité: nom,
        jour: c.jour.charAt(0).toUpperCase() + c.jour.slice(1).toLowerCase(),
        début: c.horaireDebut,
        fin: c.horaireFin
      });
    }
  }
  
  return creneaux;
}

/**
 * Convertit une heure au format HH:MM en minutes depuis minuit
 */
export function heureToMin(heure: string): number {
  const [heures, minutes] = heure.split(':').map(Number);
  return heures * 60 + minutes;
}

/**
 * Vérifie s'il y a conflit entre deux créneaux
 */
export function conflitEntreDeux(creneau1: Creneau, creneau2: Creneau): boolean {
  if (creneau1.jour !== creneau2.jour) return false;
  
  const d1 = heureToMin(creneau1.début);
  const f1 = heureToMin(creneau1.fin);
  const d2 = heureToMin(creneau2.début);
  const f2 = heureToMin(creneau2.fin);
  
  // Conflit si les créneaux se chevauchent
  return !(f1 <= d2 || f2 <= d1);
}

/**
 * Vérifie s'il n'y a pas de conflit dans une combinaison de créneaux
 */
export function pasDeConflit(creneaux: Creneau[]): boolean {
  for (let i = 0; i < creneaux.length; i++) {
    for (let j = i + 1; j < creneaux.length; j++) {
      if (conflitEntreDeux(creneaux[i], creneaux[j])) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Filtre les créneaux par activité
 */
export function filtrerParActivite(creneaux: Creneau[], nomActivite: string): Creneau[] {
  return creneaux.filter(c => 
    c.activité.toLowerCase().includes(nomActivite.toLowerCase())
  );
}

/**
 * Génère toutes les combinaisons possibles de créneaux
 */
export function genererCombinaisons(activitesSelectionnees: ActiviteOption[]): Creneau[][] {
  if (activitesSelectionnees.length === 0) return [];
  
  const result: Creneau[][] = [];
  
  function backtrack(index: number, combinaisonActuelle: Creneau[]) {
    if (index === activitesSelectionnees.length) {
      result.push([...combinaisonActuelle]);
      return;
    }
    
    const activite = activitesSelectionnees[index];
    for (const creneau of activite.creneaux) {
      combinaisonActuelle.push(creneau);
      backtrack(index + 1, combinaisonActuelle);
      combinaisonActuelle.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

/**
 * Trouve toutes les combinaisons compatibles
 */
export function trouverCombinaisons(activitesSelectionnees: ActiviteOption[]): {
  compatibles: Creneau[][];
  totalCombinaisons: number;
} {
  const toutesCombinaisons = genererCombinaisons(activitesSelectionnees);
  const compatibles = toutesCombinaisons.filter(pasDeConflit);
  
  return {
    compatibles,
    totalCombinaisons: toutesCombinaisons.length
  };
}

/**
 * Obtient la liste des activités disponibles avec leurs créneaux
 */
export function getActivitesDisponibles(creneaux: Creneau[]): ActiviteOption[] {
  const activitesMap = new Map<string, Creneau[]>();
  
  // Grouper les créneaux par activité
  for (const creneau of creneaux) {
    const nom = creneau.activité;
    if (!activitesMap.has(nom)) {
      activitesMap.set(nom, []);
    }
    activitesMap.get(nom)!.push(creneau);
  }
  
  // Convertir en array d'options avec noms d'affichage
  return Array.from(activitesMap.entries()).map(([nom, creneauxActivite]) => ({
    nom,
    displayName: nom.charAt(0).toUpperCase() + nom.slice(1),
    creneaux: creneauxActivite
  })).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Formate une heure pour l'affichage
 */
export function formaterHeure(heure: string): string {
  return heure;
}

/**
 * Formate un jour pour l'affichage
 */
export function formaterJour(jour: string): string {
  return jour;
} 