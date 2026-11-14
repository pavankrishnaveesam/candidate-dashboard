# CandiBoard

A Vite + React + TypeScript dashboard for the Candidate Manager API. The interface follows the supplied tactile pastel reference with a persistent sidebar, frosted toolbar, candidate cards, multi-criteria filter popover, candidate preview, and add/edit/delete flows.

## Run locally

1. Start the Spring Boot candidate API on `http://localhost:8080`.
2. Install client dependencies with `npm install`.
3. Copy `.env.example` to `.env` if the API uses a different URL, then set `VITE_API_BASE_URL`.
4. Run `npm run dev` and open the Vite URL shown in the terminal.

Create, view, update, delete, search, skills, experience range, and status filtering call the existing `/api/v1/candidates` API. Multiple statuses are combined client-side by querying the API once per selected status. The API must allow browser requests from the Vite origin (`http://localhost:5173`); configure CORS on the Spring Boot server if the browser blocks requests.

## Build

Run `npm run build` to type-check and create the production bundle in `dist/`.

## Reference styling

`pastalcandidate-dashboard.txt` is the original supplied CSS reference. It is intentionally excluded from Git. The application stylesheet in `src/styles.css` implements the selected design language and responsive dashboard patterns.
