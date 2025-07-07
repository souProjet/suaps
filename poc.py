import requests
from itertools import product

# --- Chargement catalogue depuis l'API ---
url = "https://u-sport.univ-nantes.fr/api/extended/activites/periode"
params = {
    "idPeriode": "4dc2c931-12c4-4cac-8709-c9bbb2513e16",
    "idCatalogue": "8a757ad7-fac6-4cad-b48b-a2a11ef7efa4",
    "inscriptionsOuvertes": "false"
}
headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json"
}

try:
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()  # Lève une exception si le statut n'est pas 2xx
    data = response.json()
    
    if not isinstance(data, list):
        raise ValueError("Format de données inattendu : la réponse n'est pas une liste")
        
except requests.RequestException as e:
    print(f"❌ Erreur lors de la requête API : {e}")
    exit(1)
except ValueError as e:
    print(f"❌ Erreur lors du traitement des données : {e}")
    print(f"Données reçues : {response.text[:200]}...")  # Affiche le début de la réponse
    exit(1)

# --- Transformation des créneaux ---
def extract_creneaux(data):
    creneaux = []
    for act in data:
        if not act:  # Vérifie si l'activité est None
            continue
        nom = act.get("nom", "").lower()  # Utilise get() avec valeur par défaut
        creneaux_list = act.get("creneaux")
        if creneaux_list is None:
            continue
        for c in creneaux_list:
            if not c["horaireDebut"] or not c["horaireFin"] or not c["jour"]:
                continue
            creneaux.append({
                "activité": nom,
                "jour": c["jour"].capitalize(),
                "début": c["horaireDebut"],
                "fin": c["horaireFin"]
            })
    return creneaux

# --- Fonctions de filtrage et vérif de conflit ---
def heure_to_min(h): return int(h[:2]) * 60 + int(h[3:])

def pas_de_conflit(trio):
    for i in range(3):
        for j in range(i + 1, 3):
            if trio[i]['jour'] == trio[j]['jour']:
                d1, f1 = heure_to_min(trio[i]['début']), heure_to_min(trio[i]['fin'])
                d2, f2 = heure_to_min(trio[j]['début']), heure_to_min(trio[j]['fin'])
                if not (f1 <= d2 or f2 <= d1): return False
    return True

# --- Exécution ---
creneaux = extract_creneaux(data)
basket = [c for c in creneaux if "basket" in c["activité"]]
ultimate = [c for c in creneaux if "ultimate" in c["activité"]]
gym = [c for c in creneaux if "gymnastique" in c["activité"]]

combinaisons = list(product(basket, ultimate, gym))
compatibles = [combo for combo in combinaisons if pas_de_conflit(combo)]

# --- Affichage ---
if not compatibles:
    print("❌ Aucun créneau compatible trouvé.")
else:
    print("✅ Créneaux compatibles trouvés :\n")
    for act in compatibles[0]:
        print(f"- {act['activité'].capitalize()} : {act['jour']} {act['début']} - {act['fin']}")
