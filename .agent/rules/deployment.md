# Deployment Rules

> [!CRITICAL]
> **DO NOT deploy containers until the user explicitly says to.**

- **Explicit User Consent Required**: Never run `deploy.sh`, `docker compose up`, `docker compose down`, or rebuild container images on the remote VM (`161.97.110.121`) unless the user explicitly commands it in their prompt.
- **Local Development Only**: Keep all edits, tests, and builds local. Do not auto-deploy or auto-rsync to the remote VM.
- **VM Safety**: When deployment is explicitly requested, only modify the `web-ai-agent` container. Never touch the other 16 containers running on the host.
