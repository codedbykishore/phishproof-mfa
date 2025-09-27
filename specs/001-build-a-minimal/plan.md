
# Implementation Plan: Build a Minimal Banking Prototype with Phishing-Resistant MFA

**Branch**: `001-build-a-minimal` | **Date**: 2025-09-26 | **Spec**: /home/kinux/projects/phishproof-mfa/specs/001-build-a-minimal/spec.md
***Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed*: Feature specification from `/specs/001-build-a-minimal/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Build a minimal single-page banking prototype demonstrating phishing-resistant MFA using hybrid authentication (password + WebAuthn/Passkey). The application will feature a complete user journey from registration through dashboard interaction, with SQLite backend for demo purposes. Technical approach uses Vite + vanilla HTML/CSS/JS frontend with Node/Express backend, focusing on two-factor authentication implementation and audit logging to prove security effectiveness.

## Technical Context
**Language/Version**: JavaScript (ES2020+), Node.js 18+  
**Primary Dependencies**: Vite, Express.js, better-sqlite3 (SQLite), WebAuthn libraries, bcryptjs (password hashing)  
**Storage**: SQLite database with password hashing for demo purposes  
**Testing**: Jest for unit tests, Supertest for API integration tests  
**Target Platform**: Web browsers with WebAuthn support (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Authentication operations ≤1 second, page loads ≤3 seconds on 3G  
**Constraints**: Prototype/demo scope, local SQLite persistence, no real financial data  
**Scale/Scope**: Single-user demo application, ~600 lines of code, 4 main UI sections, two-factor authentication

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality Gates**:
- [x] Clean architecture with clear separation of concerns (frontend/backend separation)
- [x] Test coverage plan ≥80% for all new code (Jest testing framework planned)
- [x] Linting configuration defined for chosen tech stack (ESLint for JS)
- [x] Conventional commit format planned (semantic commit messages)

**Testing Standards Gates**:
- [x] Unit and integration test strategy defined (Jest + Supertest)
- [x] Negative path testing scenarios identified (WebAuthn failures, insufficient balance)
- [x] TDD approach confirmed (tests before implementation)
- [x] CI/CD test enforcement configured (GitHub Actions planned)

**User Experience Gates**:
- [x] Design system components identified/planned (vanilla HTML/CSS with consistent patterns)
- [x] Error handling UX patterns defined (clear success/failure indicators)
- [x] Accessibility requirements documented (WCAG 2.1 AA compliance planned)
- [x] UI consistency standards established (single-page app with tabs)

**Performance Gates**:
- [x] 3-second page load budget on 3G confirmed (Vite bundling optimized)
- [x] 300ms API response time budget confirmed (in-memory SQLite is fast)
- [x] UI thread blocking limits (≤50ms) planned (vanilla JS, no heavy frameworks)
- [x] Performance monitoring strategy defined (browser dev tools + manual testing)

**Security & Privacy Gates**:
- [x] No secrets in logs policy established (audit events exclude sensitive data)
- [x] Input validation strategy confirmed (server-side validation required)
- [x] HTTPS/TLS enforcement planned (required for WebAuthn)
- [x] Fail-secure defaults identified (authentication failures deny access)
- [x] Security headers configuration planned (CORS, CSP, HSTS)

**Governance Gates**:
- [x] PR review process includes constitutional compliance (checklist required)
- [x] Amendment process understood by team (PR-based with 2+ reviewers)
- [x] Violation documentation process defined (security impact assessment required)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── frontend/
│   ├── index.html          # Single-page app HTML
│   ├── css/
│   │   └── styles.css      # Application styles
│   └── js/
│       ├── app.js          # Main application logic
│       ├── webauthn.js     # WebAuthn client utilities
│       └── api.js          # API client functions
├── backend/
│   ├── server.js           # Express server entry point
│   ├── database.js         # SQLite database setup and queries
│   ├── webauthn.js         # WebAuthn server utilities
│   ├── auth.js             # Authentication middleware
│   └── routes.js           # API route handlers
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # API integration tests
│   └── e2e/                # End-to-end tests (if needed)
├── package.json            # Node.js dependencies and scripts
├── vite.config.js          # Vite configuration
└── README.md               # Project documentation
```

**Structure Decision**: Web application with clear frontend/backend separation. Frontend uses vanilla HTML/CSS/JS for minimal dependencies. Backend uses Express.js with in-memory SQLite. Tests follow standard Node.js project structure.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each API contract file → contract test task [P] (3 contracts = 3 test tasks)
- Each data entity → model creation task [P] (3 entities = 3 model tasks)
- Each user story acceptance scenario → integration test task (4 scenarios = 4 integration tasks)
- WebAuthn implementation tasks (frontend + backend)
- UI component implementation tasks
- Database setup and migration tasks
- Security and audit logging tasks

**Ordering Strategy**:
- TDD order: Database setup → Model tests → API contract tests → Integration tests → Implementation
- Dependency order: Backend before frontend, database before API routes
- Mark [P] for parallel execution (independent files, same technology stack)
- Sequential for interdependent tasks (API routes depend on database)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md including:
- 6 test-related tasks (contract + integration tests)
- 8 implementation tasks (backend API, frontend components)
- 4 infrastructure tasks (database, security, deployment)
- 4 validation tasks (manual testing, performance checks)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete (Authentication core + Enhanced UX features)
- [x] Phase 5: Validation passed (31 passing tests)

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented
- [x] Core authentication implemented and tested
- [x] Enhanced user experience features planned and specified

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
