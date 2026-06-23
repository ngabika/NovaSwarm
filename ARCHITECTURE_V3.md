# NovaSwarm v3.0.0 - Architecture, Gap Analysis & Roadmap

## 1. System Overview
NovaSwarm is transitioning from an experimental prototype to a **Real Autonomous Multi-Agent Platform** running locally on Linux Mint. The system will leverage Express/Node.js, local/cloud LLMs (Gemini/Ollama), real dynamic scripting, authentic MCP (Model Context Protocol) interactions, and secure host-level operations with strict approval workflows.

## 2. Gap Analysis

### Current State
- The UI implies a complex multi-agent system, but currently, most operations are either basic prompt chains or hardcoded mocked configurations.
- The `server.ts` file contains dummy agent definitions, a mocked Kanban system, and mocked MCP entries with URLs that point to fictional endpoints (e.g., `https://mcp.google.com/search-grounding`, `https://api.binance.com/mcp`).
- Skills are simply text templates without dynamic hot-loading or actual JS/TS execution logic.
- "Dreaming" is a partially implemented background API call that creates text logs but does not safely modify code or generate executable artifacts that pass through a real CI/CD or staging sandbox.
- Hardware awareness is absent.
- The system lacks a dedicated Service Account pattern, running operations in whatever context Node.js is executed, without a Privilege Action Gateway.

### Target State (v3.0.0)
- **Real Agents**: 7 explicitly defined roles (Gábor, Attila, Bálint, Cili, Dénes, Nóra, Viktor), each with internal execution loops, specific memory access, and distinct capabilities.
- **Genuine MCP System**: A functional Model Context Protocol registry that mounts *real* tools (FileSystem, Google services via Firebase, Binance via API keys, active Web automation).
- **Execution Engine**: Dynamic sandboxed skill execution via Node `vm` context or `tsx` isolated runs.
- **Self-Healing & OTA**: Real GitHub-based version diffing, testing via `npm run lint` and `build`, user approval, and restart processes.
- **Security-First Host Access**: A Privilege Gateway that pauses execution and pings Telegram/UI for explicit approval before running destructive or sensitive `.sh` scripts.

## 3. List of Mock Features (Fake Capabilities to replace)
- **Mock MCP Definitions**: `mcp_google_search`, `mcp_shared_files`, `mcp_novaswarm_vault`, `mcp_binance_exchange`, `mcp_google_gmail`, `mcp_google_calendar`, `mcp_google_photos`, `mcp_google_business`, `mcp_google_ads`. All have fake endpoints and static lists of capabilities.
- **Mock Setup Status**: Checking `setupCompleted: true` implicitly without real environment validation.
- **Mock Kanban Flow**: Kanban items are hardcoded test data (`task_1`, `task_2`). Agents do not genuinely monitor this board autonomously.
- **Mock Dreaming Execution**: Synthesizes text via the LLM but does not actually test or deploy new 'skills'.
- **Mock Terminal / Shell Tools**: The `/api/terminal/execute` currently executes blind shell commands without a strict RBAC or Privilege Gateway.

## 4. Missing Implementations
- **Agent Profiles & Event Loop**: Missing `Gábor` (Swarm Leader) task allocation engine.
- **Service Account & Privilege Gateway**: Missing `sudo`/admin approval mechanism for `Bálint` to verify.
- **Skills Hot-Loader**: Missing TS runtime dynamic module loader (`import()` or `eval()` via secure sandbox) for updating skills without full server restarts.
- **Google MCP & Binance MCP Implementation**: Missing actual underlying API handlers for Gmail, Drive, Calendar, Docs, Sheets, Keep, Chat, and Binance.
- **Device Hardware Scanner**: Missing OS-level introspection (e.g., `lsusb`, `lspci`, `ifconfig`, `df -h`) that agents can safely read.
- **OTA Updater Protocol**: Missing functions to pull from Git, backup existing local memory/configs, run standard tests, and restart securely.
- **Shared Memory Vector Matrix**: Missing real interaction where specific agents index documents and others retrieve them effectively based on specific chat contexts context.

## 5. Development Roadmap

**Phase 1: Security & Foundation Setup**
- [ ] Implement Privileged Action Gateway (PAG).
- [ ] Define forbidden zones (`server.ts`, `.env`).
- [ ] Implement the `Hardware Awareness` scanner capability.

**Phase 2: True Agent Initialization & Chat Routing**
- [ ] Override `defaultAgents` to purely feature: Gábor, Attila, Bálint, Cili, Dénes, Nóra, Viktor.
- [ ] Implement the Swarm Leader delegation mechanism (Gábor receives tasks, assigns to specific agents via internal tagging).

**Phase 3: The True MCP Integration**
- [ ] Replace fake MCP URLs with real internal handlers or local dynamically loaded tool-servers.
- [ ] Implement true Google Workspace endpoints using Firebase Auth credentials already provisioned.
- [ ] Implement local FileSystem/Log monitoring MCPs.

**Phase 4: Dynamic Skills & Self-Healing**
- [ ] Build the `skills` directory hot-loader.
- [ ] Define the exact `AgentSkill` interface (execute function, permissions).
- [ ] Implement Attila's self-healing loop: Write Code -> Sandbox Test (`tsx --noEmit`) -> Request Approval -> Replace.

**Phase 5: Dreaming Engine Upgrade**
- [ ] Refactor the `/api/dream` endpoint. Ensure the output is parsed as JSON, yielding specific structural proposals (New Skill file, New MCP module).
- [ ] Save these artifacts to a 'staging' table in the DB for User/Gábor approval.

**Phase 6: OTA Updater**
- [ ] Implement GitHub releases fetcher.
- [ ] Write `backup` function (compressing state).
- [ ] Write `migrate` mechanism.

**Phase 7: Documentation Synthesis**
- [ ] Auto-generate `ARCHITECTURE.md`, `AGENTS.md`, `MCP.md`, `SKILLS.md`, `DREAMING.md`, `OTA.md`, `SECURITY.md` accurately tracking the new state.
