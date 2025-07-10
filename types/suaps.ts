export interface LocalisationAPI {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
  complementAdresse?: string;
}

export interface CreneauAPI {
  horaireDebut: string;
  horaireFin: string;
  jour: string;
  localisation?: LocalisationAPI;
}

export interface ActiviteAPI {
  nom: string;
  creneaux: CreneauAPI[];
}

export interface Localisation {
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
}

export interface Creneau {
  activité: string;
  jour: string;
  début: string;
  fin: string;
  localisation?: Localisation;
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

export interface ContrainteHoraire {
  jour: string;
  heureDebut?: string;
  heureFin?: string;
  actif: boolean;
}

export interface ContraintesHoraires {
  [jour: string]: ContrainteHoraire;
}

export interface AnneeAPI {
  id: string;
  annee: number;
}

export interface CatalogueAPI {
  id: string;
  nom: string;
  description: string;
  ordreAffichage: number;
  type: string;
  annee: AnneeAPI;
  affichageHome: boolean;
}

export interface CatalogueOption {
  id: string;
  nom: string;
  ville: string;
} 