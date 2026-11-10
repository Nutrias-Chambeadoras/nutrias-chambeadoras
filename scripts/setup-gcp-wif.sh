#!/usr/bin/env bash
# Configura Workload Identity Federation para que GitHub Actions publique en Firebase Hosting
# sin llaves. Es idempotente: se puede correr mas de una vez.
#
# Requisitos: gcloud instalado y sesion iniciada (gcloud auth login) con una cuenta
# que tenga permisos de administrador de IAM sobre el proyecto.
#
# Uso: ./scripts/setup-gcp-wif.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-prod-nutrias-chambeadoras}"
PROJECT_NUMBER="${PROJECT_NUMBER:-188154185633}"
REPO="${REPO:-Nutrias-Chambeadoras/nutrias-chambeadoras}"
POOL="${POOL:-github}"
PROVIDER="${PROVIDER:-github-actions}"
SA_NAME="${SA_NAME:-github-deploy}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Proyecto: ${PROJECT_ID} (${PROJECT_NUMBER}) | Repo: ${REPO}"

echo "1/6 Habilitando APIs"
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  firebasehosting.googleapis.com \
  --project "${PROJECT_ID}"

echo "2/6 Cuenta de servicio ${SA_EMAIL}"
gcloud iam service-accounts describe "${SA_EMAIL}" --project "${PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name "GitHub Actions - deploy Hosting" \
    --project "${PROJECT_ID}"

# IAM es eventualmente consistente: una cuenta recien creada puede tardar unos segundos
# en poder usarse en una politica. Se reintenta en vez de fallar.
retry() {
  local intentos=10 espera=6 n=1
  until "$@"; do
    if [ "${n}" -ge "${intentos}" ]; then
      echo "Fallo despues de ${intentos} intentos: $*" >&2
      return 1
    fi
    echo "  reintentando en ${espera}s (${n}/${intentos})..."
    sleep "${espera}"
    n=$((n + 1))
  done
}

echo "3/6 Roles minimos para publicar en Hosting"
for ROLE in roles/firebasehosting.admin roles/serviceusage.serviceUsageConsumer; do
  retry gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${SA_EMAIL}" \
    --role "${ROLE}" \
    --condition=None >/dev/null
done

echo "4/6 Pool de identidades"
gcloud iam workload-identity-pools describe "${POOL}" \
  --location global --project "${PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create "${POOL}" \
    --location global \
    --display-name "GitHub" \
    --project "${PROJECT_ID}"

echo "5/6 Provider OIDC (solo acepta tokens de ${REPO})"
gcloud iam workload-identity-pools providers describe "${PROVIDER}" \
  --workload-identity-pool "${POOL}" --location global --project "${PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER}" \
    --workload-identity-pool "${POOL}" \
    --location global \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition "assertion.repository == '${REPO}'" \
    --project "${PROJECT_ID}"

echo "6/6 Permitir que el repo use la cuenta de servicio"
retry gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}" \
  --project "${PROJECT_ID}" >/dev/null

echo
echo "Listo. Valores (ya cargados como variables del repo):"
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "  GCP_SERVICE_ACCOUNT            = ${SA_EMAIL}"
echo "  FIREBASE_PROJECT_ID            = ${PROJECT_ID}"
