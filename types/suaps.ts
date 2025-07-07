export interface CreneauAPI {
  horaireDebut: string;
  horaireFin: string;
  jour: string;
}

export interface ActiviteAPI {
  nom: string;
  creneaux: CreneauAPI[];
}

export interface Creneau {
  activité: string;
  jour: string;
  début: string;
  fin: string;
}

export interface ActiviteOption {
  nom: string;
  displayName: string;
  creneaux: Creneau[];
}

export interface Combinaison {
  activites: Creneau[];
  compatible: boolean;
} 