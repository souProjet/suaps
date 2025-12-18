export interface LocalisationAPI {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
  complementAdresse?: string;
}

export interface CreneauAPI {
  id: string;
  horaireDebut: string;
  horaireFin: string;
  jour: string;
  localisation?: LocalisationAPI;
  quotaCursus?: number;
  quotaLoisir?: number;
  quotaMinimum?: number;
  niveau?: string;
  fileAttente?: boolean;
  encadrants?: any[];
  encadrantsLibelle?: string;
  fermetures?: any[];
  quota?: number;
  nbMoyenInscrits?: number;
  nbInscrits?: number;
  nbMoyenPresents?: number;
}

export interface ActiviteAPI {
  id: string;
  nom: string;
  description?: string;
  typePrestation?: string;
  tarif?: any;
  quota?: any;
  fileAttente?: boolean;
  catalogue?: any;
  famille?: any;
  annee?: any;
  maxReservationParSemaine?: number;
  inscriptionAnnuelle?: boolean;
  affichageOnly?: boolean;
  nbInscrits?: number;
  position?: number;
  statutInscription?: any;
  nbCreneaux?: number;
  inscriptionEnCours?: any;
  inscriptionAnnulable?: any;
  creneaux: CreneauAPI[];
}

export interface Localisation {
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
}

export interface Creneau {
  // IDs réels SUAPS
  activiteId: string;
  creneauId: string;
  
  // Données d'affichage
  activité: string;
  jour: string;
  début: string;
  fin: string;
  localisation?: Localisation;
  
  // Données complètes pour l'auto-réservation
  activiteData?: ActiviteAPI;
  creneauData?: CreneauAPI;
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

// Interface pour la sélection de créneaux spécifiques
export interface CreneauSelectionne {
  activite: string;
  jour: string;
  debut: string;
  fin: string;
  localisation?: Localisation;
  // Données complètes pour l'auto-réservation
  activiteId?: string;
  creneauId?: string;
  activiteData?: ActiviteAPI;
  creneauData?: CreneauAPI;
}

// Mode de sélection : par sport ou par créneaux spécifiques
export type SelectionMode = 'sports' | 'creneaux';

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

// Types pour l'authentification SUAPS
export interface AuthRequest {
  codeCarte: string;
}

export interface AuthError {
  type: string;
  title: string;
  status: number;
  detail: string;
  path: string;
  message: string;
}

export interface UserProfile {
  code: string;
  numero: string;
  type: string;
  typeExterne: string;
  civilite: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  estBoursier: boolean;
  composante: string;
  departement: string | null;
  estInscrit: boolean;
  paiementEffectue: boolean;
  casContact: string | null;
  reduction: string | null;
  etablissementOrigine: string;
  tagHexa?: string; // Optionnel - n'est plus utilisé
  majorite: string;
}

export interface AuthResult {
  success: boolean;
  accessToken?: string;
  profile?: UserProfile;
  error?: AuthError;
}

export interface StoredAuth {
  codeCarte: string;
  accessToken: string;
  profile: UserProfile;
  expiresAt: number;
  createdAt: number;
} 