#!/usr/bin/env bash
# GraphQL variables ($p, $e, ...) live in single-quoted query strings on purpose.
# shellcheck disable=SC2016
# Creates (or brings back in line) the Railway cron service that runs the
# nightly Stripe reconcile, next to questura-server in the same project.
#
#   bash apps/questura/infra/railway/create-reconcile-cron.sh --check   # read-only
#   bash apps/questura/infra/railway/create-reconcile-cron.sh --apply   # create / fix
#
# Why Railway and not GitHub Actions: the job needs the live database and the
# live Stripe key, and this repository is public. On Railway the cron service
# only holds *references* to questura-server's variables, so no secret is ever
# copied anywhere new, and rotating one on the server rotates it here too.
#
# What it wants (and --check compares against):
#   service   questura-reconcile, source Questurian/questurian branch main
#   settings  builder, build command, root directory and watch patterns copied
#             from questura-server; start `pnpm --dir apps/questura/apps/server
#             reconcile:nightly`; cron `20 4 * * *` (UTC); restart NEVER; no
#             pre-deploy command (the server's runs migrations) and no
#             healthcheck; the server's region (multiRegionConfig)
#   variables every variable questura-server has, as `${{questura-server.NAME}}`
#             (a server variable that is itself a reference, like REDIS_URL,
#             is copied as that same reference), plus APP_ROLE=job.
#             Every one: the reconcile boots Payload, and Payload's onInit
#             refuses a production boot missing any of ~25 of them
#             (src/shared/config/assert-production-config.ts).
#
# Idempotent: --apply only sends what differs. Nothing prints a variable's
# value; only names and settings. The token is read from
# ~/.questura-vault/owner.env (RAILWAY_API_TOKEN) and passed to curl through a
# private file, never on the command line.
#
# Procedure and how to check a run: apps/questura/docs/procedures/scheduled-jobs.md
set -euo pipefail

MODE=${1:-}
case "$MODE" in
  --check | --apply) ;;
  *) echo "usage: $0 --check | --apply" >&2; exit 2 ;;
esac

PROJECT_ID=aa5759b2-a793-4f16-8e8b-8633cdc41cac
ENVIRONMENT_ID=e35f0d85-c66d-4f66-b781-d9e456bab8cb
SERVER_SERVICE_ID=0f920c5a-3d07-4a51-a75a-fd7a29726f86
SERVER_SERVICE_NAME=questura-server
CRON_SERVICE_NAME=questura-reconcile
REPO=Questurian/questurian
BRANCH=main
START_COMMAND='pnpm --dir apps/questura/apps/server reconcile:nightly'
CRON_SCHEDULE='20 4 * * *'
VAULT=${QUESTURA_VAULT_ENV:-$HOME/.questura-vault/owner.env}
API=https://backboard.railway.com/graphql/v2

for tool in curl jq; do
  command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 2; }
done
[ -r "$VAULT" ] || { echo "cannot read $VAULT" >&2; exit 2; }

WORK=$(mktemp -d)
chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT

token=$(grep -E '^RAILWAY_API_TOKEN=' "$VAULT" | tail -n 1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')
[ -n "$token" ] || { echo "RAILWAY_API_TOKEN is not in $VAULT" >&2; exit 2; }
printf 'Authorization: Bearer %s\n' "$token" > "$WORK/auth"
unset token

# gql QUERY [VARIABLES_JSON] -> response on stdout; exits on a GraphQL error.
# Error messages from Railway name fields, never variable values.
gql() {
  local body response
  body=$(jq -n --arg q "$1" --argjson v "${2:-"{}"}" '{query: $q, variables: $v}')
  response=$(curl -sS --max-time 60 "$API" -H "@$WORK/auth" -H 'Content-Type: application/json' --data-binary "$body")
  if jq -e '.errors' <<<"$response" >/dev/null 2>&1; then
    echo "Railway API error: $(jq -c '[.errors[].message]' <<<"$response")" >&2
    exit 1
  fi
  printf '%s' "$response"
}

INSTANCE_FIELDS='builder buildCommand startCommand rootDirectory watchPatterns cronSchedule restartPolicyType preDeployCommand healthcheckPath railwayConfigFile source { repo image } latestDeployment { meta }'

# --- read the server ----------------------------------------------------------
server=$(gql "query(\$e:String!,\$s:String!){ serviceInstance(environmentId:\$e, serviceId:\$s){ $INSTANCE_FIELDS } }" \
  "$(jq -n --arg e "$ENVIRONMENT_ID" --arg s "$SERVER_SERVICE_ID" '{e:$e,s:$s}')")
server_vars_query='query($p:String!,$e:String!,$s:String!){ variables(projectId:$p, environmentId:$e, serviceId:$s, unrendered:true) }'
gql "$server_vars_query" "$(jq -n --arg p "$PROJECT_ID" --arg e "$ENVIRONMENT_ID" --arg s "$SERVER_SERVICE_ID" '{p:$p,e:$e,s:$s}')" \
  | jq '.data.variables' > "$WORK/server-vars.json"

# Desired variables. Railway-provided names (RAILWAY_*) are never set by hand.
jq --arg svc "$SERVER_SERVICE_NAME" '
  with_entries(select(.key | startswith("RAILWAY_") | not))
  | with_entries(.value = (if (.value | tostring | test("\\$\\{\\{")) then .value else "${{" + $svc + "." + .key + "}}" end))
  + {APP_ROLE: "job"}
' "$WORK/server-vars.json" > "$WORK/desired-vars.json"

# The cron runs the code the server runs, not whatever main is: a reconcile
# ahead of the server could expect a migration the server has not applied.
server_commit=$(jq -r '.data.serviceInstance.latestDeployment.meta.commitHash // empty' <<<"$server")
[ -n "$server_commit" ] || { echo "cannot read questura-server's deployed commit" >&2; exit 1; }

desired_settings=$(jq --arg start "$START_COMMAND" --arg cron "$CRON_SCHEDULE" '.data.serviceInstance | {
  builder, buildCommand, rootDirectory, watchPatterns,
  startCommand: $start, cronSchedule: $cron, restartPolicyType: "NEVER",
  preDeployCommand: null, healthcheckPath: null, railwayConfigFile: null,
  multiRegionConfig: (.latestDeployment.meta.serviceManifest.deploy.multiRegionConfig // null)
}' <<<"$server")

# --- read the cron service, if any --------------------------------------------
project=$(gql 'query($p:String!){ project(id:$p){ services { edges { node { id name } } } } }' \
  "$(jq -n --arg p "$PROJECT_ID" '{p:$p}')")
cron_id=$(jq -r --arg n "$CRON_SERVICE_NAME" '[.data.project.services.edges[].node | select(.name == $n) | .id][0] // empty' <<<"$project")

echo "project questura: services $(jq -c '[.data.project.services.edges[].node.name]' <<<"$project")"
echo "server $SERVER_SERVICE_NAME: $(jq 'length' "$WORK/server-vars.json") variables"

current_settings='null'
cron_commit=''
triggers='[]'
echo '{}' > "$WORK/cron-vars.json"
if [ -n "$cron_id" ]; then
  echo "cron service $CRON_SERVICE_NAME: exists ($cron_id)"
  cron=$(gql "query(\$e:String!,\$s:String!){ serviceInstance(environmentId:\$e, serviceId:\$s){ $INSTANCE_FIELDS nextCronRunAt } }" \
    "$(jq -n --arg e "$ENVIRONMENT_ID" --arg s "$cron_id" '{e:$e,s:$s}')")
  current_settings=$(jq '.data.serviceInstance | {
    builder, buildCommand, rootDirectory, watchPatterns, startCommand, cronSchedule,
    restartPolicyType, preDeployCommand, healthcheckPath, railwayConfigFile,
    multiRegionConfig: (.latestDeployment.meta.serviceManifest.deploy.multiRegionConfig // null),
    repo: .source.repo, nextCronRunAt
  }' <<<"$cron")
  cron_commit=$(jq -r '.data.serviceInstance.latestDeployment.meta.commitHash // empty' <<<"$cron")
  triggers=$(gql 'query($p:String!,$e:String!,$s:String!){ deploymentTriggers(projectId:$p, environmentId:$e, serviceId:$s){ edges { node { id branch } } } }' \
    "$(jq -n --arg p "$PROJECT_ID" --arg e "$ENVIRONMENT_ID" --arg s "$cron_id" '{p:$p,e:$e,s:$s}')" \
    | jq -c '[.data.deploymentTriggers.edges[].node.id]')
  gql "$server_vars_query" "$(jq -n --arg p "$PROJECT_ID" --arg e "$ENVIRONMENT_ID" --arg s "$cron_id" '{p:$p,e:$e,s:$s}')" \
    | jq '.data.variables' > "$WORK/cron-vars.json"
else
  echo "cron service $CRON_SERVICE_NAME: does not exist (would be created)"
fi

# --- compare ------------------------------------------------------------------
# Normalise so an empty array/string and null read the same.
normalise='with_entries(.value |= (if . == [] or . == "" then null else . end))'
settings_diff=$(jq -n --argjson want "$desired_settings" --argjson have "$current_settings" "
  (\$want | $normalise) as \$w | ((\$have // {}) | $normalise) as \$h
  | [\$w | keys[] | select(\$w[.] != \$h[.]) | {setting: ., want: \$w[.], have: \$h[.]}]")
echo
echo "settings:"
jq -r '.[] | "  differs  \(.setting): have \(.have | tojson) -> want \(.want | tojson)"' <<<"$settings_diff"
[ "$(jq length <<<"$settings_diff")" -eq 0 ] && echo "  all match"
if [ "$current_settings" != 'null' ]; then
  echo "  repo: $(jq -r '.repo // "none"' <<<"$current_settings"), next run: $(jq -r '.nextCronRunAt // "none"' <<<"$current_settings")"
fi
echo "  commit: server ${server_commit:0:7}, cron ${cron_commit:0:7}$([ -z "$cron_commit" ] && echo 'none')"
echo "  auto-deploy triggers on the cron (want none, like the server): $(jq length <<<"$triggers")"

# Names only. Values are compared, never printed.
jq -n --slurpfile w "$WORK/desired-vars.json" --slurpfile h "$WORK/cron-vars.json" '
  $w[0] as $w | $h[0] as $h
  | {missing: [$w | keys[] | select($h[.] == null)],
     different: [$w | keys[] | select($h[.] != null and $h[.] != $w[.])],
     extra: [$h | keys[] | select(startswith("RAILWAY_") | not) | select($w[.] == null)]}
' > "$WORK/vars-diff.json"
echo
echo "variables ($(jq 'length' "$WORK/desired-vars.json") wanted, names only):"
echo "  missing:   $(jq -c '.missing' "$WORK/vars-diff.json")"
echo "  different: $(jq -c '.different' "$WORK/vars-diff.json")"
echo "  extra (left alone): $(jq -c '.extra' "$WORK/vars-diff.json")"

vars_to_send=$(jq '(.missing + .different) | length' "$WORK/vars-diff.json")
settings_to_send=$(jq 'length' <<<"$settings_diff")
needs_repo=0
if [ -z "$cron_id" ] || [ "$(jq -r '.repo // ""' <<<"$current_settings")" != "$REPO" ]; then needs_repo=1; fi
needs_deploy=0
if [ "$cron_commit" != "$server_commit" ] || [ "$vars_to_send" -gt 0 ] || [ "$settings_to_send" -gt 0 ]; then needs_deploy=1; fi
triggers_to_delete=$(jq length <<<"$triggers")

echo
if [ "$MODE" = --check ]; then
  if [ -z "$cron_id" ] || [ "$vars_to_send" -gt 0 ] || [ "$settings_to_send" -gt 0 ] || [ "$needs_repo" -eq 1 ] || [ "$needs_deploy" -eq 1 ] || [ "$triggers_to_delete" -gt 0 ]; then
    echo "CHECK: --apply would $([ -z "$cron_id" ] && echo 'create the service, ')set $vars_to_send variable(s), change $settings_to_send setting(s)$([ "$needs_repo" -eq 1 ] && echo ", connect $REPO")$([ "$triggers_to_delete" -gt 0 ] && echo ", delete $triggers_to_delete auto-deploy trigger(s)")$([ "$needs_deploy" -eq 1 ] && echo ", deploy the server's commit ${server_commit:0:7}")."
  else
    echo "CHECK: everything matches. Nothing to do."
  fi
  exit 0
fi

# --- apply --------------------------------------------------------------------
# Order: create with no source (nothing builds), variables and settings with
# deploys skipped, connect the repo, drop the auto-deploy trigger that connect
# adds (the server has none: deploys are by hand), then deploy the exact
# commit the server runs. Connecting may itself start a build of main's head;
# the pinned deploy below supersedes it.
if [ -z "$cron_id" ]; then
  cron_id=$(gql 'mutation($i:ServiceCreateInput!){ serviceCreate(input:$i){ id } }' \
    "$(jq -n --arg p "$PROJECT_ID" --arg e "$ENVIRONMENT_ID" --arg n "$CRON_SERVICE_NAME" '{i:{projectId:$p, environmentId:$e, name:$n}}')" \
    | jq -r '.data.serviceCreate.id')
  echo "created $CRON_SERVICE_NAME ($cron_id)"
fi

if [ "$vars_to_send" -gt 0 ]; then
  jq --slurpfile d "$WORK/vars-diff.json" 'with_entries(select(.key as $k | ($d[0].missing + $d[0].different) | index($k)))' \
    "$WORK/desired-vars.json" > "$WORK/send-vars.json"
  gql 'mutation($i:VariableCollectionUpsertInput!){ variableCollectionUpsert(input:$i) }' \
    "$(jq -n --arg p "$PROJECT_ID" --arg e "$ENVIRONMENT_ID" --arg s "$cron_id" --slurpfile v "$WORK/send-vars.json" \
      '{i:{projectId:$p, environmentId:$e, serviceId:$s, variables:$v[0], replace:false, skipDeploys:true}}')" >/dev/null
  echo "set $vars_to_send variable(s): $(jq -c 'keys' "$WORK/send-vars.json")"
fi

if [ "$settings_to_send" -gt 0 ]; then
  # Send the whole desired set: fields that already match are harmless.
  # null clears a field (pre-deploy command, healthcheck, config file).
  input=$(jq '. | with_entries(select(.key != "multiRegionConfig" or .value != null))' <<<"$desired_settings")
  gql 'mutation($e:String!,$s:String!,$i:ServiceInstanceUpdateInput!){ serviceInstanceUpdate(environmentId:$e, serviceId:$s, input:$i) }' \
    "$(jq -n --arg e "$ENVIRONMENT_ID" --arg s "$cron_id" --argjson i "$input" '{e:$e,s:$s,i:$i}')" >/dev/null
  echo "updated settings: $(jq -c '[.[].setting]' <<<"$settings_diff")"
fi

if [ "$needs_repo" -eq 1 ]; then
  gql 'mutation($id:String!,$i:ServiceConnectInput!){ serviceConnect(id:$id, input:$i){ id } }' \
    "$(jq -n --arg id "$cron_id" --arg r "$REPO" --arg b "$BRANCH" '{id:$id, i:{repo:$r, branch:$b}}')" >/dev/null
  echo "connected $REPO@$BRANCH"
  needs_deploy=1
fi

triggers=$(gql 'query($p:String!,$e:String!,$s:String!){ deploymentTriggers(projectId:$p, environmentId:$e, serviceId:$s){ edges { node { id } } } }' \
  "$(jq -n --arg p "$PROJECT_ID" --arg e "$ENVIRONMENT_ID" --arg s "$cron_id" '{p:$p,e:$e,s:$s}')" \
  | jq -r '.data.deploymentTriggers.edges[].node.id')
for trigger in $triggers; do
  gql 'mutation($id:String!){ deploymentTriggerDelete(id:$id) }' "$(jq -n --arg id "$trigger" '{id:$id}')" >/dev/null
  echo "deleted auto-deploy trigger $trigger"
done

if [ "$needs_deploy" -eq 1 ]; then
  gql 'mutation($e:String!,$s:String!,$c:String!){ serviceInstanceDeployV2(environmentId:$e, serviceId:$s, commitSha:$c) }' \
    "$(jq -n --arg e "$ENVIRONMENT_ID" --arg s "$cron_id" --arg c "$server_commit" '{e:$e,s:$s,c:$c}')" >/dev/null
  echo "deployed ${server_commit:0:7} (the server's commit)"
fi

echo "APPLY: done. Run --check again to confirm; the first run is at the next 04:20 UTC."
