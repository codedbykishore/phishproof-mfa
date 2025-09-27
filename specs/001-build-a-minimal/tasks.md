# Tasks: Build a Minimal Banking Prototype with Phishing-Resistant MFA

**Input**: Design docu## Phase 3.6: Polis## Phase 3.6: Polish & UX Enhancements
- [x] T042 [P] Add unit tests for WebAuthn utilities in tests/unit/webauthn-utils.test.js
- [x] T043 [P] Add unit tests for database operations in tests/unit/database.test.js
- [x] T044 [P] Add unit tests for authentication middleware in tests/unit/auth.test.js
- [x] T045 Performance test WebAuthn operations (<1 second) in tests/performance/webauthn-performance.test.js
- [x] T046 Performance test page load times (<3 seconds) in tests/performance/page-load-performance.test.js
- [x] T047 [P] Create README.md with setup and demo instructions
- [x] T048 [P] Add JSDoc comments and code documentation
- [x] T049 Configure Vite build for production deployment
- [x] T050 Run quickstart.md validation scenarios manually

## Phase 3.7: Final UX & Security Features (Enhanced Implementation)
- [x] T051 Add personalized welcome message in dashboard with user greeting in src/frontend/js/app.js
- [x] T052 Implement red logout button with confirmation warning dialog in src/frontend/css/styles.css and src/frontend/js/app.jsg
- [x] T042 [P] Add unit tests for WebAuthn utilities in tests/unit/test-webauthn-utils.js
- [x] T043 [P] Add unit tests for database operations in tests/unit/test-database.js
- [x] T044 [P] Add unit tests for authentication middleware in tests/unit/test-auth.js
- [x] T045 Performance test WebAuthn operations (<1 second) in tests/performance/test-webauthn-performance.js
- [x] T046 Performance test page load times (<3 seconds) in tests/performance/test-page-load.js
- [x] T047 [P] Create README.md with setup and demo instructions
- [x] T048 [P] Add JSDoc comments and code documentation
- [x] T049 Configure Vite build for production deployment
- [x] T050 Run quickstart.md validation scenarios manually
- [x] T051 Update registration flow to redirect to login page after successful registration
- [x] T052 Add password field to user registration and login forms
- [x] T053 Implement password hashing and verification in backend
- [x] T054 Update authentication flow to require password + WebAuthn (two-factor)
- [x] T055 Update database schema to include password field for users
- [x] T056 Modify frontend to handle two-step authentication process
- [x] T057 Update API endpoints to support password-based authentication
- [x] T058 Add password validation and security requirements
- [x] T059 Update audit logging to track password authentication events
- [x] T060 Test complete user journey: register → login (password + WebAuthn) → dashboard → transfer → audit `/specs/001-build-a-minimal/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `src/frontend/`, `src/backend/`, `tests/`
- Adjust based on plan.md structure with frontend/backend separation

## Phase 3.1: Setup
- [x] T001 Create project structure per implementation plan (src/frontend/, src/backend/, tests/)
- [x] T002 Initialize Node.js project with package.json, Vite config, and Express setup
- [x] T003 [P] Install frontend dependencies (Vite, @simplewebauthn/browser)
- [x] T004 [P] Install backend dependencies (Express, better-sqlite3, @simplewebauthn/server, jsonwebtoken, helmet)
- [x] T005 [P] Configure ESLint and Prettier for code quality
- [x] T006 [P] Set up Jest and Supertest for testing framework

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T007 [P] Contract test for WebAuthn registration endpoints in tests/contract/webauthn-registration.test.js
- [x] T008 [P] Contract test for WebAuthn authentication endpoints in tests/contract/webauthn-authentication.test.js
- [x] T009 [P] Contract test for dashboard and transfer endpoints in tests/contract/dashboard-transfers.test.js
- [x] T010 [P] Integration test for passkey registration flow in tests/integration/passkey-registration.test.js
- [x] T011 [P] Integration test for passkey authentication flow in tests/integration/passkey-login.test.js
- [x] T012 [P] Integration test for dashboard display in tests/integration/dashboard-display.test.js
- [x] T013 [P] Integration test for transfer operations in tests/integration/transfer-operation.test.js
- [x] T014 [P] Integration test for audit logging in tests/integration/audit-logging.test.js

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T015 [P] Create User database model and queries in src/backend/database.js
- [x] T016 [P] Create Transaction database model and queries in src/backend/database.js
- [x] T017 [P] Create AuditEvent database model and queries in src/backend/database.js
- [x] T018 [P] Implement WebAuthn server utilities in src/backend/webauthn.js
- [x] T019 [P] Implement JWT authentication middleware in src/backend/auth.js
- [x] T020 Implement WebAuthn registration challenge endpoint in src/backend/routes.js
- [x] T021 Implement WebAuthn registration verify endpoint in src/backend/routes.js
- [x] T022 Implement WebAuthn authentication challenge endpoint in src/backend/routes.js
- [x] T023 Implement WebAuthn authentication verify endpoint in src/backend/routes.js
- [x] T024 Implement dashboard data endpoint in src/backend/routes.js
- [x] T025 Implement transfer creation endpoint in src/backend/routes.js
- [x] T026 Implement audit events endpoint in src/backend/routes.js

## Phase 3.4: Frontend Implementation
- [x] T027 [P] Create main HTML structure with tabs in src/frontend/index.html
- [x] T028 [P] Implement CSS styles for banking UI in src/frontend/css/styles.css
- [x] T029 [P] Create WebAuthn client utilities in src/frontend/js/webauthn.js
- [x] T030 [P] Create API client functions in src/frontend/js/api.js
- [x] T031 Implement main application logic and state management in src/frontend/js/app.js
- [x] T032 Implement registration tab UI and interactions in src/frontend/js/app.js
- [x] T033 Implement login tab UI and interactions in src/frontend/js/app.js
- [x] T034 Implement dashboard tab UI and data display in src/frontend/js/app.js
- [x] T035 Implement transactions tab UI and transfer form in src/frontend/js/app.js
- [x] T036 Implement audit/logs tab UI and event display in src/frontend/js/app.js

## Phase 3.5: Integration & Security
- [x] T037 Initialize SQLite database with schema in src/backend/server.js
- [x] T038 Configure Express middleware (CORS, helmet, JSON parsing) in src/backend/server.js
- [x] T039 Implement audit event logging for all operations in src/backend/routes.js
- [x] T040 Implement session timeout handling (30 minutes) in src/backend/auth.js
- [x] T041 Implement audit event cleanup (24-hour retention) in src/backend/database.js

## Phase 3.6: Polish & UX Enhancements
- [ ] T042 [P] Add unit tests for WebAuthn utilities in tests/unit/test-webauthn-utils.js
- [ ] T043 [P] Add unit tests for database operations in tests/unit/test-database.js
- [ ] T044 [P] Add unit tests for authentication middleware in tests/unit/test-auth.js
- [ ] T045 Performance test WebAuthn operations (<1 second) in tests/performance/test-webauthn-performance.js
- [ ] T046 Performance test page load times (<3 seconds) in tests/performance/test-page-load.js
- [x] T047 [P] Create README.md with setup and demo instructions
- [ ] T048 [P] Add JSDoc comments and code documentation
- [ ] T049 Configure Vite build for production deployment
- [ ] T050 Run quickstart.md validation scenarios manually

## Phase 3.7: Final UX & Security Features
- [ ] T051 Add personalized welcome message in dashboard with user greeting in src/frontend/js/app.js
- [ ] T052 Implement red logout button with confirmation warning dialog in src/frontend/css/styles.css and src/frontend/js/app.js
- [ ] T053 Add authentication state warnings for already-logged-in users on register/login tabs in src/frontend/js/app.js
- [ ] T054 Implement user-to-user transfer with recipient selection and validation in src/frontend/js/app.js and src/backend/routes.js
- [ ] T055 Add WebAuthn/passkey integration for transfer confirmation (password manager protocol) in src/frontend/js/app.js
- [ ] T056 Complete audit log enhancements with detailed event tracking and filtering in src/backend/database.js and src/frontend/js/app.js
- [ ] T057 Add session management warnings and auto-logout countdown in src/frontend/js/app.js
- [ ] T058 Implement transfer history with recipient information display in src/frontend/js/app.js

## Dependencies
- Setup (T001-T006) before everything
- Tests (T007-T014) before implementation (T015-T041)
- Database models (T015-T017) before API routes (T020-T026)
- Backend routes (T020-T026) before frontend implementation (T027-T036)
- Core implementation (T015-T036) before integration (T037-T041)
- Everything before polish (T042-T050)

## Parallel Example
```
# Launch T007-T014 together (all contract and integration tests):
Task: "Contract test for WebAuthn registration endpoints in tests/contract/test-webauthn-registration.js"
Task: "Contract test for WebAuthn authentication endpoints in tests/contract/test-webauthn-authentication.js"
Task: "Contract test for dashboard and transfer endpoints in tests/contract/test-dashboard-transfers.js"
Task: "Integration test for passkey registration flow in tests/integration/test-passkey-registration.js"
Task: "Integration test for passkey authentication flow in tests/integration/test-passkey-login.js"
Task: "Integration test for dashboard display in tests/integration/test-dashboard-display.js"
Task: "Integration test for transfer operations in tests/integration/test-transfer-operation.js"
Task: "Integration test for audit logging in tests/integration/test-audit-logging.js"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing (TDD requirement)
- Commit after each task completion
- Database operations in routes.js are sequential due to shared file
- Frontend components can be parallel as they modify different sections of app.js
- All tasks include exact file paths for clarity

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P] (3 contract test tasks)
   - Each endpoint group → implementation task (6 endpoint implementation tasks)

2. **From Data Model**:
   - Each entity → database model task [P] (3 model tasks)
   - Database schema → initialization task

3. **From User Stories**:
   - Each acceptance scenario → integration test [P] (5 integration test tasks)
   - Quickstart scenarios → validation tasks

4. **From Research**:
   - Technology decisions → setup and dependency tasks (6 setup tasks)

5. **Ordering**:
   - Setup → Tests → Database Models → API Routes → Frontend → Integration → Polish
   - Dependencies block parallel execution where files overlap

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (3 contract test tasks)
- [x] All entities have model tasks (3 database model tasks)
- [x] All tests come before implementation (TDD ordering maintained)
- [x] Parallel tasks truly independent (different files or non-conflicting sections)
- [x] Each task specifies exact file path (all tasks include paths)
- [x] No task modifies same file as another [P] task (verified file separation)</content>
<parameter name="filePath">/home/kinux/projects/phishproof-mfa/specs/001-build-a-minimal/tasks.md