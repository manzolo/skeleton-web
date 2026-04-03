Implement the following feature using TDD: $ARGUMENTS

Follow this exact order — do not skip steps:

## 1. Understand scope
- Identify which layer(s) are involved: backend only, frontend only, or both
- Read the relevant existing files before writing anything
- If a migration is needed, note it but do not run it yet

## 2. Write tests first (failing)
**Backend** (if touched):
- Add test(s) in `backend/tests/test_<feature>.py` (create file if new)
- Cover: happy path, error/edge cases, at least one boundary condition
- Tests must be `async`, use the `client` fixture from `conftest.py`
- Do NOT run them yet — they should fail at this stage

**Frontend** (if touched):
- Add test(s) in `frontend/tests/<Component>.test.tsx` (create file if new)
- Cover: renders correctly, user interactions, loading/error states
- Use `vi.spyOn` on API client functions — never mock fetch directly
- Do NOT run them yet

## 3. Implement the feature
- Write the minimum code to make the tests pass — no extras
- Backend: route in `main.py`, model in `models.py` if needed, schema inline or in a new `schemas.py`
- Frontend: component in `src/pages/` or `src/components/`, API call in `src/api/client.ts`
- If a migration is needed: inform the user to run `make migrate-new` after implementation

## 4. Verify tests pass
- Backend: `docker compose exec -T backend pytest tests/ -v --tb=short`
- Frontend: `docker compose exec -T frontend npm run test -- --run`
- Fix any failures before proceeding

## 5. Update documentation
- Add the new endpoint/component to `docs/architecture.md` under the relevant section
- Update `CLAUDE.md` if a new `make` command or workflow step is introduced
- Add a JSDoc comment on new exported TypeScript functions; add a docstring on new FastAPI route handlers

## Rules
- Never skip the test step, even for "trivial" changes
- Do not add features beyond what was asked
- Do not refactor surrounding code that was not part of the request
