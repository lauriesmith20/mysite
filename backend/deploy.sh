#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Personal Website backend · Azure Container Apps deployment
#
# Prerequisites:
#   • Azure CLI (az)  ≥ 2.53  — https://learn.microsoft.com/cli/azure/install-azure-cli
#   • Docker Desktop (or Docker CE) — https://docs.docker.com/get-docker/
#   • az login already done
#   • gh CLI logged in with the write:packages scope:
#       gh auth refresh -h github.com -s write:packages,read:packages,delete:packages
#     GHCR_TOKEN defaults to `gh auth token` — no PAT needs to be created or stored.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh                           # uses `gh auth token` automatically
#   GHCR_TOKEN=ghp_xxx ./deploy.sh         # or override with an explicit token
#   IMAGE_TAG=v1.2 ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
RESOURCE_GROUP="${RESOURCE_GROUP:-"rg-mysite"}"
LOCATION="${LOCATION:-"uksouth"}"
CONTAINER_ENV="${CONTAINER_ENV:-"cae-mysite"}"
APP_NAME="${APP_NAME:-"mysite-backend"}"
IMAGE_TAG="${IMAGE_TAG:-"$(date +%Y%m%d%H%M%S)"}"  # unique tag per deploy forces Azure to pull fresh
CPU="${CPU:-"0.25"}"
MEMORY="${MEMORY:-"0.5Gi"}"
MIN_REPLICAS="${MIN_REPLICAS:-"0"}"                        # scale-to-zero when idle
MAX_REPLICAS="${MAX_REPLICAS:-"1"}"
APP_PORT="${APP_PORT:-"8000"}"

# GitHub Container Registry
GHCR_USER="${GHCR_USER:-"lauriesmith20"}"
GHCR_TOKEN="${GHCR_TOKEN:-"$(gh auth token 2>/dev/null || true)"}"  # falls back to `gh auth token`
FULL_IMAGE="ghcr.io/${GHCR_USER}/mysite-backend:${IMAGE_TAG}"

# App configuration
CORS_ORIGINS="${CORS_ORIGINS:-"https://lauriesmith20.github.io"}"
AZURE_AD_TENANT_ID="${AZURE_AD_TENANT_ID:-""}"
AZURE_AD_CLIENT_ID="${AZURE_AD_CLIENT_ID:-""}"
AZURE_AD_API_AUDIENCE="${AZURE_AD_API_AUDIENCE:-""}"

# Storage (SQLite persistence)
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-""}"                   # auto-detected or created
STORAGE_SHARE="${STORAGE_SHARE:-"mysite-data"}"
STORAGE_MOUNT_NAME="${STORAGE_MOUNT_NAME:-"mysitedata"}"
STORAGE_MOUNT_PATH="${STORAGE_MOUNT_PATH:-"/app/data"}"
DATABASE_URL="${DATABASE_URL:-"sqlite:////app/data/app.db"}"
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
header()  { echo -e "\n${BOLD}${CYAN}── $* ──${RESET}"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
header "Pre-flight checks"

command -v az     &>/dev/null || error "Azure CLI not found. Install: https://learn.microsoft.com/cli/azure/install-azure-cli"
command -v docker &>/dev/null || error "Docker not found. Install: https://docs.docker.com/get-docker/"
command -v gh     &>/dev/null || error "gh CLI not found. Install: https://cli.github.com/"

[[ -z "$GHCR_TOKEN" ]] && error "No GHCR token available. Run: gh auth refresh -h github.com -s write:packages,read:packages,delete:packages\nOr pass one explicitly: GHCR_TOKEN=ghp_xxx ./deploy.sh"

TOKEN_SCOPES=$(gh api -i user 2>/dev/null | grep -i '^x-oauth-scopes:' || true)
if [[ -n "$TOKEN_SCOPES" && "$TOKEN_SCOPES" != *"write:packages"* ]]; then
  warn "Current gh token lacks the write:packages scope — the ghcr.io push will likely fail."
  warn "Run: gh auth refresh -h github.com -s write:packages,read:packages,delete:packages"
fi

ACCOUNT=$(az account show --query "{name:name, id:id}" -o tsv 2>/dev/null) \
  || error "Not logged in to Azure. Run: az login"
info "Azure subscription: ${ACCOUNT}"

if ! az extension show --name containerapp &>/dev/null; then
  info "Installing 'containerapp' CLI extension..."
  az extension add --name containerapp --upgrade -y
fi

success "Pre-flight checks passed."

# ── 1. Resource Group ─────────────────────────────────────────────────────────
header "1 / Resource Group"

if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
  info "Resource group '${RESOURCE_GROUP}' already exists — skipping."
else
  info "Creating resource group '${RESOURCE_GROUP}' in '${LOCATION}'..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
  success "Resource group created."
fi

# ── 2. Build & push image to GitHub Container Registry ───────────────────────
header "2 / Build & push Docker image → ghcr.io"

info "Logging in to ghcr.io as '${GHCR_USER}'..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

info "Building image: ${FULL_IMAGE}"
docker build --platform linux/amd64 -t "$FULL_IMAGE" -f "${SCRIPT_DIR}/Dockerfile" "${SCRIPT_DIR}"

info "Pushing image..."
docker push "$FULL_IMAGE"

success "Image pushed: ${FULL_IMAGE}"

# ── 3. Azure Storage Account & File Share (SQLite persistence) ────────────────
header "3 / Storage Account & File Share"
# Skip if DATABASE_URL has been overridden to point at Azure SQL instead of SQLite.

if [[ "$DATABASE_URL" == sqlite* ]]; then
  EXISTING_SA=$(az storage account list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?starts_with(name,'mysitedata')].name" \
    --output tsv 2>/dev/null | head -1 || true)

  if [[ -n "$EXISTING_SA" ]]; then
    STORAGE_ACCOUNT="$EXISTING_SA"
    info "Reusing existing storage account: '${STORAGE_ACCOUNT}'"
  else
    STORAGE_ACCOUNT="mysitedata${RANDOM}"
    info "Creating storage account '${STORAGE_ACCOUNT}'..."
    az storage account create \
      --name           "$STORAGE_ACCOUNT" \
      --resource-group "$RESOURCE_GROUP" \
      --location       "$LOCATION" \
      --sku            Standard_LRS \
      --kind           StorageV2 \
      --output         none
    success "Storage account created."
  fi

  STORAGE_KEY=$(az storage account keys list \
    --resource-group  "$RESOURCE_GROUP" \
    --account-name    "$STORAGE_ACCOUNT" \
    --query           "[0].value" \
    --output          tsv)

  az storage share create \
    --name         "$STORAGE_SHARE" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key  "$STORAGE_KEY" \
    --output       none 2>/dev/null || true

  success "File share '${STORAGE_SHARE}' ready."
else
  info "DATABASE_URL is not sqlite — skipping storage account/file share setup."
fi

# ── 4. Container Apps Environment ─────────────────────────────────────────────
header "4 / Container Apps Environment"

if az containerapp env show --name "$CONTAINER_ENV" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  info "Environment '${CONTAINER_ENV}' already exists — skipping."
else
  info "Creating Container Apps Environment '${CONTAINER_ENV}'..."
  az containerapp env create \
    --name           "$CONTAINER_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location       "$LOCATION" \
    --output         none
  success "Environment created."
fi

if [[ "$DATABASE_URL" == sqlite* ]]; then
  info "Linking storage to environment..."
  az containerapp env storage set \
    --name                     "$CONTAINER_ENV" \
    --resource-group           "$RESOURCE_GROUP" \
    --storage-name             "$STORAGE_MOUNT_NAME" \
    --azure-file-account-name  "$STORAGE_ACCOUNT" \
    --azure-file-account-key   "$STORAGE_KEY" \
    --azure-file-share-name    "$STORAGE_SHARE" \
    --access-mode              ReadWrite \
    --output                   none
  success "Storage linked."
fi

# ── 5. Container App ──────────────────────────────────────────────────────────
header "5 / Container App"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
APP_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.App/containerApps/${APP_NAME}"

if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  info "Container App '${APP_NAME}' already exists — updating image + config..."
else
  info "Creating Container App '${APP_NAME}'..."
  az containerapp create \
    --name              "$APP_NAME" \
    --resource-group    "$RESOURCE_GROUP" \
    --environment       "$CONTAINER_ENV" \
    --image             "$FULL_IMAGE" \
    --registry-server   "ghcr.io" \
    --registry-username "$GHCR_USER" \
    --registry-password "$GHCR_TOKEN" \
    --target-port       "$APP_PORT" \
    --ingress           external \
    --cpu               "$CPU" \
    --memory            "$MEMORY" \
    --min-replicas      "$MIN_REPLICAS" \
    --max-replicas      "$MAX_REPLICAS" \
    --output            none
  success "Container App created."
fi

# Build volumes/mounts block only when using the SQLite + Azure Files setup.
VOLUMES_JSON="[]"
MOUNTS_JSON="[]"
if [[ "$DATABASE_URL" == sqlite* ]]; then
  VOLUMES_JSON="[{\"name\": \"${STORAGE_MOUNT_NAME}\", \"storageType\": \"AzureFile\", \"storageName\": \"${STORAGE_MOUNT_NAME}\"}]"
  MOUNTS_JSON="[{\"volumeName\": \"${STORAGE_MOUNT_NAME}\", \"mountPath\": \"${STORAGE_MOUNT_PATH}\"}]"
fi

# Single atomic ARM PATCH — sets image + registry + env vars + volume mount in one revision.
info "Applying image + config + volume mount in one atomic update..."
az rest --method PATCH \
  --url "${APP_ID}?api-version=2023-05-01" \
  --headers "Content-Type=application/json" \
  --body "{
    \"properties\": {
      \"configuration\": {
        \"ingress\": { \"external\": true, \"targetPort\": ${APP_PORT} },
        \"registries\": [{
          \"server\": \"ghcr.io\",
          \"username\": \"${GHCR_USER}\",
          \"passwordSecretRef\": \"ghcr-token\"
        }],
        \"secrets\": [{ \"name\": \"ghcr-token\", \"value\": \"${GHCR_TOKEN}\" }]
      },
      \"template\": {
        \"volumes\": ${VOLUMES_JSON},
        \"containers\": [{
          \"name\": \"${APP_NAME}\",
          \"image\": \"${FULL_IMAGE}\",
          \"resources\": { \"cpu\": ${CPU}, \"memory\": \"${MEMORY}\" },
          \"volumeMounts\": ${MOUNTS_JSON},
          \"env\": [
            { \"name\": \"ENVIRONMENT\", \"value\": \"production\" },
            { \"name\": \"DATABASE_URL\", \"value\": \"${DATABASE_URL}\" },
            { \"name\": \"CORS_ORIGINS\", \"value\": \"${CORS_ORIGINS}\" },
            { \"name\": \"AZURE_AD_TENANT_ID\", \"value\": \"${AZURE_AD_TENANT_ID}\" },
            { \"name\": \"AZURE_AD_CLIENT_ID\", \"value\": \"${AZURE_AD_CLIENT_ID}\" },
            { \"name\": \"AZURE_AD_API_AUDIENCE\", \"value\": \"${AZURE_AD_API_AUDIENCE}\" }
          ]
        }],
        \"scale\": {
          \"minReplicas\": ${MIN_REPLICAS},
          \"maxReplicas\": ${MAX_REPLICAS}
        }
      }
    }
  }" --output none
success "Container App updated."

# ── 6. Done ───────────────────────────────────────────────────────────────────
header "6 / Done!"

APP_URL=$(az containerapp show \
  --name           "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query          "properties.configuration.ingress.fqdn" \
  --output         tsv)

echo ""
echo -e "${BOLD}${GREEN}🚀 Backend is live!${RESET}"
echo -e "   ${BOLD}URL:${RESET} https://${APP_URL}"
echo ""
echo -e "   Resource Group : ${RESOURCE_GROUP}"
echo -e "   Location       : ${LOCATION}"
echo -e "   Image          : ${FULL_IMAGE}"
echo -e "   Container App  : ${APP_NAME}"
if [[ "$DATABASE_URL" == sqlite* ]]; then
  echo -e "   Storage Acct   : ${STORAGE_ACCOUNT} (share: ${STORAGE_SHARE})"
fi
echo ""
echo -e "${YELLOW}Tip:${RESET} Set VITE_API_BASE_URL=https://${APP_URL} as a GitHub Actions repo/environment"
echo -e "variable so the deployed frontend points at this backend."
echo ""
echo -e "${YELLOW}Tip:${RESET} To tear everything down:"
echo -e "   az group delete --name ${RESOURCE_GROUP} --yes --no-wait"
