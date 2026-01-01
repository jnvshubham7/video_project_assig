# Testing

## Backend
- Jest + Supertest are used for unit & integration tests
- Run: `npm test` from `backend` (this uses `mongodb-memory-server` for DB tests)

## Frontend
- Jest + Testing Library for component tests
- Run: `npm test` from `frontend`

## Coverage
- Use `npm run test:coverage` to generate coverage reports

## CI
- Add CI workflow to run `npm test` for backend and frontend (separate jobs)

## Test notes
- Add tests for critical flows: auth, upload, streaming, processing status updates, RBAC enforcement.