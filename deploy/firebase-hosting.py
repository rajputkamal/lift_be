"""Deploy the isolated API Hosting site using an authenticated gcloud session.

Usage: python3 deploy/firebase-hosting.py inventory|create|deploy|domain|domain-status [production|test]
GCLOUD_BIN may select an explicitly installed gcloud executable. No keys are stored.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

PROJECT = "lift-475112"
ENVIRONMENT = sys.argv[2] if len(sys.argv) > 2 else "production"
if ENVIRONMENT not in ("production", "test"):
    raise SystemExit("Environment must be production or test")
SITE = "microgreens-api-test-lift-475112" if ENVIRONMENT == "test" else "microgreens-api-lift-475112"
BASE = "https://firebasehosting.googleapis.com/v1beta1/"
DOMAIN = "test-api.microgreenskart.in" if ENVIRONMENT == "test" else "api.microgreenskart.in"
cli = os.environ.get("GCLOUD_BIN", "gcloud")
token = subprocess.check_output([cli, "auth", "print-access-token"], text=True).strip()


def api(path, method="GET", payload=None, raw=None):
    url = path if path.startswith("https://") else BASE + path
    if not (url.startswith(BASE) or url.startswith("https://upload-firebasehosting.googleapis.com/")):
        raise ValueError("Unexpected Firebase destination")
    body = json.dumps(payload).encode() if payload is not None else raw
    req = Request(url, data=body, method=method, headers={
        "Authorization": "Bearer " + token,
        "X-Goog-User-Project": PROJECT,
        "Content-Type": "application/octet-stream" if raw is not None else "application/json",
    })
    try:
        with urlopen(req, timeout=60) as response:
            data = response.read()
            return json.loads(data) if data else {}
    except HTTPError as error:
        detail = json.loads(error.read()).get("error", {})
        raise SystemExit(f"Firebase API {error.code}: {detail.get('message', 'request failed')}") from None


action = sys.argv[1]
parent = f"projects/{PROJECT}/sites"
if action == "inventory":
    print(json.dumps(api(parent), indent=2))
elif action == "create":
    print(json.dumps(api(parent + "?siteId=" + SITE, "POST", {}), indent=2))
elif action == "deploy":
    # The explicit site is independent of default/frontend Hosting targets.
    api(parent + "/" + SITE)
    config = json.loads(Path(__file__).with_name("firebase.microgreens-test.json" if ENVIRONMENT == "test" else "firebase.microgreens.json").read_text())["hosting"]
    serving = {
        "headers": [{"glob": h["source"], "headers": {item["key"]: item["value"] for item in h["headers"]}} for h in config["headers"]],
        "rewrites": [{"glob": r["source"], "run": r["run"]} for r in config["rewrites"]],
    }
    version = api(f"sites/{SITE}/versions", "POST", {"config": serving})["name"]
    file = Path(__file__).with_name("firebase-public") / "404.html"
    content = gzip.compress(file.read_bytes(), mtime=0)
    digest = hashlib.sha256(content).hexdigest()
    populate = api(version + ":populateFiles", "POST", {"files": {"/404.html": digest}})
    for requested in populate.get("uploadRequiredHashes", []):
        if requested != digest:
            raise SystemExit("Unexpected upload request")
        api(populate["uploadUrl"] + "/" + digest, "POST", raw=content)
    api(version + "?updateMask=status", "PATCH", {"status": "FINALIZED"})
    release = api(f"sites/{SITE}/releases?versionName={version}", "POST", {})
    print(json.dumps({"site": SITE, "version": version, "release": release["name"], "url": f"https://{SITE}.web.app"}, indent=2))
elif action == "domain":
    print(json.dumps(api(parent + f"/{SITE}/customDomains?customDomainId={DOMAIN}", "POST", {}), indent=2))
elif action == "domain-status":
    print(json.dumps(api(parent + f"/{SITE}/customDomains/{DOMAIN}"), indent=2))
else:
    raise SystemExit("Unknown action")
