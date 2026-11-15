# Project Rules & Guidelines

## Deployment Restriction (MANDATORY)

> [!IMPORTANT]
> **DO NOT deploy containers until the user explicitly says to.**

1. **No Autonomous Remote Deployment**:
   - Never execute remote container deployment (`deploy.sh`, `docker compose up`, `docker compose down`, `docker build`, or remote container rebuilds) on the remote VM (`161.97.110.121`) unless the user explicitly requests or confirms a deployment in their current prompt (e.g., *"deploy now"*, *"deploy container to VM"*, *"run deploy"*).
   - Do not rsync files or push deployment images to the remote server automatically upon completing a code change.

2. **Local-First Execution**:
   - All code edits, TypeScript checks (`npx tsc --noEmit`), linting (`npm run lint`), tests (`npm test`), and builds (`npm run build`) must run locally.
   - Present the changes to the user and request confirmation before performing any deployment action.

3. **Multi-Tenant VM Safety**:
   - When deployment is explicitly authorized by the user, only target the `web-ai-agent` container on port `3060`.
   - Never disrupt, restart, or alter the other 16 application containers running on the VM.

