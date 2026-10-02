"""Manual backend deployment: python3 deploy/microgreens-run.py test|production IMAGE_DIGEST.
Uses the signed-in operator; never deploys Lift or grants Cloud Build privileges.
"""
import os
import re
import subprocess
import sys

if len(sys.argv) != 3 or sys.argv[1] not in ("test", "production"):
    raise SystemExit("Usage: microgreens-run.py test|production sha256:DIGEST")
environment, digest = sys.argv[1:]
if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
    raise SystemExit("Use a pinned sha256 image digest")
service = "microgreens-api-test" if environment == "test" else "microgreens-api"
host = "test-api.microgreenskart.in" if environment == "test" else "api.microgreenskart.in"
frontend = "test.microgreenskart.in" if environment == "test" else "microgreenskart.in"
mongo = "microgreens-test-mongo-uri" if environment == "test" else "microgreens-mongo-uri"
secrets = {
    "MONGO_URI": mongo,
    "RAZORPAY_KEY_ID": "microgreens-razorpay-test-key-id",
    "RAZORPAY_KEY_SECRET": "microgreens-razorpay-test-key-secret",
    "RAZORPAY_WEBHOOK_SECRET": "microgreens-razorpay-webhook-secret",
    "CLOUDINARY_URL": "microgreens-cloudinary-url",
}
subprocess.run([
    os.environ.get("GCLOUD_BIN", "gcloud"), "run", "deploy", service,
    "--project=lift-475112", "--region=asia-south1",
    "--image=asia-south1-docker.pkg.dev/lift-475112/microgreens/microgreens-api@" + digest,
    "--service-account=" + service + "@lift-475112.iam.gserviceaccount.com",
    "--set-env-vars=" + ",".join([
        "SERVICE_MODE=microgreens", "MICROGREENS_ENVIRONMENT=" + environment,
        "NODE_ENV=production", "MICROGREENS_API_PREFIX=/v1",
        "PUBLIC_API_URL=https://" + host + "/v1", "FRONTEND_URL=https://" + frontend,
        "GUEST_COOKIE_NAME=__session", "MICROGREENS_CATALOGUE_WRITES=disabled",
        "GUEST_COOKIE_CROSS_SITE=" + ("true" if environment == "test" else "false"),
    ]),
    "--set-secrets=" + ",".join(key + "=" + secret + ":1" for key, secret in secrets.items()),
    "--min-instances=0", "--max-instances=" + ("1" if environment == "test" else "3"),
    "--memory=512Mi", "--cpu=1", "--port=8080", "--timeout=60s",
    "--allow-unauthenticated", "--ingress=all", "--quiet",
], check=True)
