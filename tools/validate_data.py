"""Valide data/index.json et toutes les semaines.

    python tools/validate_data.py

Sort 0 si tout est bon, 1 sinon, avec la liste des problemes. Tourne aussi en
integration continue a chaque push (voir .github/workflows/validate-data.yml),
parce que les fichiers de contenu peuvent etre ecrits sans relecture humaine.
"""
import io
import json
import os
import re
import sys

DATA = "data"
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
BADGES = ("ok", "freeze")

errors = []


def err(where, message):
    errors.append(where + " : " + message)


def load(path):
    try:
        with io.open(path, encoding="utf-8") as f:
            return json.load(f)
    except ValueError as e:
        err(path, "JSON invalide — " + str(e))
    except IOError as e:
        err(path, "illisible — " + str(e))
    return None


def need(where, obj, key, kind, kind_label):
    if key not in obj:
        err(where, "champ manquant : " + key)
        return None
    if not isinstance(obj[key], kind):
        err(where, "champ " + key + " : attendu " + kind_label)
        return None
    return obj[key]


def check_week(path, entry):
    w = load(path)
    if w is None:
        return

    for key in ("id", "from", "to"):
        v = need(path, w, key, str, "une date AAAA-MM-JJ")
        if v is not None and not DATE.match(v):
            err(path, "champ " + key + " : format attendu AAAA-MM-JJ, recu " + repr(v))
        if v is not None and entry.get(key) not in (None, v):
            err(path, "champ " + key + " (" + str(v) + ") ne correspond pas a index.json ("
                + str(entry.get(key)) + ")")

    need(path, w, "title", str, "du texte")
    need(path, w, "intro", str, "du texte")
    portions = need(path, w, "portions", int, "un nombre entier")
    if portions is not None and portions <= 0:
        err(path, "champ portions : doit etre superieur a zero")

    # ---- liste d'epicerie
    sections = need(path, w, "list", list, "une liste de rayons")
    seen_ids = {}
    if sections is not None:
        if not sections:
            err(path, "champ list : au moins un rayon est requis")
        for si, sec in enumerate(sections):
            where = path + " list[" + str(si) + "]"
            if not isinstance(sec, dict):
                err(where, "attendu un objet {name, items}")
                continue
            need(where, sec, "name", str, "du texte")
            items = need(where, sec, "items", list, "une liste d'articles")
            if items is None:
                continue
            if not items:
                err(where, "rayon vide")
            for ii, it in enumerate(items):
                iw = where + " items[" + str(ii) + "]"
                if not isinstance(it, dict):
                    err(iw, "attendu un objet")
                    continue
                iid = need(iw, it, "id", str, "un identifiant court")
                need(iw, it, "what", str, "du texte")
                need(iw, it, "qty", str, "du texte")
                need(iw, it, "unit", str, "du texte (peut etre vide)")
                if "sp" in it and not isinstance(it["sp"], bool):
                    err(iw, "champ sp : attendu true ou false")
                price = it.get("price")
                if not isinstance(price, (int, float)) or isinstance(price, bool):
                    err(iw, "champ price : attendu un nombre (ex. 11.81), recu " + repr(price))
                elif price < 0:
                    err(iw, "champ price : ne peut pas etre negatif")
                if iid is not None:
                    if iid in seen_ids:
                        err(iw, "identifiant en double : " + iid + " (deja en " + seen_ids[iid] + ")")
                    else:
                        seen_ids[iid] = "list[" + str(si) + "] items[" + str(ii) + "]"

    # ---- menu
    menu = need(path, w, "menu", list, "une liste de jours")
    if menu is not None:
        for di, day in enumerate(menu):
            where = path + " menu[" + str(di) + "]"
            if not isinstance(day, dict):
                err(where, "attendu un objet")
                continue
            need(where, day, "day", str, "du texte")
            need(where, day, "num", str, "du texte")
            for slot in ("midi", "soir"):
                if slot not in day:
                    continue
                meal = day[slot]
                if not isinstance(meal, dict):
                    err(where + " " + slot, "attendu un objet {n, h}")
                    continue
                need(where + " " + slot, meal, "n", str, "du texte")
                need(where + " " + slot, meal, "h", str, "du texte")

    # ---- conservation
    cons = need(path, w, "conservation", list, "une liste de fiches")
    if cons is not None:
        for ci, c in enumerate(cons):
            where = path + " conservation[" + str(ci) + "]"
            if not isinstance(c, dict):
                err(where, "attendu un objet")
                continue
            for key in ("name", "badgeLabel", "timeline", "action"):
                need(where, c, key, str, "du texte")
            badge = c.get("badge")
            if badge not in BADGES:
                err(where, "champ badge : attendu \"ok\" ou \"freeze\", recu " + repr(badge))

    # ---- recettes
    recipes = need(path, w, "recipes", list, "une liste de recettes")
    if recipes is not None:
        for ri, r in enumerate(recipes):
            where = path + " recipes[" + str(ri) + "]"
            if not isinstance(r, dict):
                err(where, "attendu un objet {t, s}")
                continue
            need(where, r, "t", str, "du texte")
            steps = need(where, r, "s", list, "une liste d'etapes")
            if steps is not None:
                if not steps:
                    err(where, "recette sans etape")
                for k, step in enumerate(steps):
                    if not isinstance(step, str):
                        err(where + " s[" + str(k) + "]", "attendu du texte")


def main():
    index_path = os.path.join(DATA, "index.json")
    idx = load(index_path)
    if idx is None:
        report()
        return

    need(index_path, idx, "updated", str, "un horodatage ISO 8601")
    weeks = need(index_path, idx, "weeks", list, "une liste de semaines")
    if weeks is None:
        report()
        return
    if not weeks:
        err(index_path, "aucune semaine listee — l'app afficherait un ecran vide")

    listed = {}
    for wi, entry in enumerate(weeks):
        where = index_path + " weeks[" + str(wi) + "]"
        if not isinstance(entry, dict):
            err(where, "attendu un objet")
            continue
        for key in ("id", "from", "to", "label"):
            v = need(where, entry, key, str, "du texte")
            if v is not None and key != "label" and not DATE.match(v):
                err(where, "champ " + key + " : format attendu AAAA-MM-JJ, recu " + repr(v))
        wid = entry.get("id")
        if not isinstance(wid, str):
            continue
        if wid in listed:
            err(where, "semaine en double : " + wid)
            continue
        listed[wid] = entry

        wpath = os.path.join(DATA, wid + ".json")
        if not os.path.exists(wpath):
            err(where, "fichier absent : " + wpath)
        else:
            check_week(wpath, entry)

    # Piege classique : le fichier de la semaine est cree mais l'entree d'index
    # est oubliee — la semaine n'apparait alors nulle part dans l'app.
    for name in sorted(os.listdir(DATA)):
        if not name.endswith(".json") or name == "index.json":
            continue
        wid = name[:-5]
        if wid not in listed:
            err(os.path.join(DATA, name),
                "ce fichier n'est reference nulle part dans index.json — "
                "la semaine sera invisible dans l'app")

    report(len(listed))


def report(count=None):
    if errors:
        sys.stderr.write("Validation echouee — " + str(len(errors)) + " probleme(s) :\n\n")
        for e in errors:
            sys.stderr.write("  - " + e + "\n")
        sys.stderr.write("\n")
        sys.exit(1)
    print("Contenu valide" + ("" if count is None else " — " + str(count) + " semaine(s)") + ".")


if __name__ == "__main__":
    main()
