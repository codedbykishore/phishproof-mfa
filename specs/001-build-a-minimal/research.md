# Research: Build a Minimal Banking Prototype with Phishing-Resistant MFA

## WebAuthn Implementation Approach

**Decision**: Use @simplewebauthn/browser for frontend and @simplewebauthn/server for backend
**Rationale**: Provides comprehensive WebAuthn support with good documentation and security practices. Handles challenge generation, credential verification, and supports all major authenticators.
**Alternatives considered**: 
- WebAuthn API directly (too low-level, error-prone)
- Other libraries (less maintained, fewer features)

## SQLite In-Memory Database Strategy

**Decision**: Use better-sqlite3 with in-memory database for demo purposes
**Rationale**: Fast, reliable, and supports all required SQL operations. In-memory mode perfect for prototype that doesn't need persistence.
**Alternatives considered**:
- JSON file storage (no SQL features, harder to query)
- LocalStorage (client-side only, not suitable for server data)

## Frontend Architecture

**Decision**: Vanilla HTML/CSS/JS with single-page application pattern
**Rationale**: Minimal dependencies, fast loading, direct browser API access for WebAuthn. No framework overhead needed for prototype scope.
**Alternatives considered**:
- React/Vue (unnecessary complexity for simple UI)
- No framework (would require manual routing/state management)

## Backend API Design

**Decision**: RESTful API with Express.js and standard WebAuthn endpoints
**Rationale**: Simple, well-understood pattern. Standard endpoints for registration and authentication flows.
**Alternatives considered**:
- GraphQL (overkill for simple CRUD operations)
- tRPC (unnecessary type safety for prototype)

## Testing Strategy

**Decision**: Jest for unit tests, Supertest for API integration tests
**Rationale**: Industry standard, good mocking capabilities, works well with Node.js. Supertest provides realistic API testing.
**Alternatives considered**:
- Mocha/Chai (Jest is more feature-complete)
- Cypress for E2E (too heavy for prototype scope)

## Deployment Strategy

**Decision**: Vercel for frontend, Vercel serverless functions for backend
**Rationale**: Easy deployment, automatic HTTPS, good performance. Single platform simplifies hosting.
**Alternatives considered**:
- Netlify (similar capabilities, Vercel chosen for better Node.js support)
- Heroku (more expensive, overkill for static demo)

## Security Headers Configuration

**Decision**: Use helmet.js middleware for Express
**Rationale**: Comprehensive security headers out-of-the-box. Handles CSP, HSTS, CORS, and other security measures.
**Alternatives considered**:
- Manual header configuration (error-prone, incomplete coverage)

## Session Management

**Decision**: JWT tokens with 30-minute expiration
**Rationale**: Stateless, secure, and meets the 30-minute requirement from clarifications. Easy to implement and verify.
**Alternatives considered**:
- Server-side sessions (requires database persistence)
- No sessions (would break user experience requirements)</content>
<parameter name="filePath">/home/kinux/projects/phishproof-mfa/specs/001-build-a-minimal/research.md
