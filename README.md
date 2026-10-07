# Personal Portfolio Holdings Dashboard

A private, browser-local INR holdings dashboard. Tracks balances only; changes in holding value include contributions, withdrawals, transfers and valuations. No income, expense, tax or investment-return calculations.

## Develop

Node 24 (Vite 8 requires Node 20.19+ or 22.12+). From this checkout:

```sh
npm ci
npm run dev
npm test
npm run build
```

If the default npm cache is unavailable, use `npm --cache /workspace/.npm-cache ci`.

Browser acceptance tests: `npm run test:browser` uses `/usr/bin/chromium`. Else install Playwright Chromium with `npx playwright install chromium`, then run `CHROMIUM_PATH='' npm run test:browser`. `npm run preview` serves the production build at the `/Portfolio-Management/` base path. Navigation uses in-app views without server-dependent routes; refreshing the project base works on Pages.

## Use

- **Add Holding:** choose category, institution and nickname, value or quantity × manual unit price, and valuation date. Owner, reference and custodian are optional. Edit, duplicate or delete in Holdings. Bank/Cash default to Liquid; other categories default to Unclassified. Classifications can be adjusted.
- **Import / Export:** download the template, upload XLSX or CSV, select a worksheet, map its first non-empty header row, and preview. Resolve ambiguous matches and any renamed records without IDs; correct invalid rows and re-upload. Confirm Add only, Update and add, or an explicitly selected replacement scope. Normal updates do not remove absent records. Blank amounts are never treated as zero. Dates: YYYY-MM-DD or Excel date cells/serials; blank dates use the import day. Imported files are processed once, never monitored.
- **Snapshots:** Save Portfolio Snapshot records all working holdings without changing their valuation dates. History sorts by snapshot date, then creation time and ID; sequence numbers distinguish same-day snapshots. Select any two snapshots to compare stable IDs, including added, removed and renamed holdings. Stale valuations are flagged after 30 days.
- **Backup:** download complete JSON regularly, and before reset/restore. Restore validates schema version, IDs, dates, values and classifications before confirmation. Excel exports provide current holdings, saved totals, and each snapshot's holdings.
- **Settings:** load/clear illustrative demo data, use compact lakh/crore amounts, add or rename categories. Categories containing holdings cannot be deleted. Renaming does not alter historical snapshots.

[Download Excel template](public/Holdings-template.xlsx).

## Privacy and limitations

IndexedDB is device/browser-specific storage, **not a backup**. Clearing browser data can lose all records. No cross-device sync, passwords, analytics, live quotes or financial-data transmission. All Excel processing happens locally. React escapes imported text; spreadsheet text exports prefix formula-like strings. Keep backups private: they contain your financial information.

Schema version 1 is checked before loading/restoring. Unknown future versions are rejected rather than destructively migrated. Values are normalised to paise for totals; ratios use unrounded amounts. Estimated equity includes only direct Equity and explicitly specified mixed-equity percentages; unclassified exposure is disclosed. Institution grouping normalises whitespace/case across categories and does not assess underlying issuer risk. Zero denominators display N/A.

The XLSX template covers the listed core columns, plus optional custodian, equity allocation percentage, premature withdrawal (true/false) and lock-in details in generated downloads. JSON backups also preserve editing timestamps, valuation method and all settings.

## Architecture and dependency choices

React 19 + TypeScript, Vite 8, Recharts 3, IndexedDB through `idb`, ExcelJS 4.4 and Papa Parse. Versions are fixed by `package-lock.json`. ExcelJS's transitive UUID is overridden to compatible UUID 11.1.1+ to eliminate the audited bounds-check advisory; the Excel round-trip is covered by tests. No TLS, signature or checksum checks are bypassed.

- `src/model.ts`: schema, validation, snapshots, calculations and illustrative demo.
- `src/storage.ts`: IndexedDB persistence.
- `src/transfer.ts`: XLSX/CSV parsing, validation, matching, scoped application and safe export.
- `src/main.tsx`: responsive views, accessible forms, charts, editing and import review.
- `src/model.test.ts`: calculation/data/import acceptance tests.
- `tests/dashboard.spec.ts`: browser persistence, editing, snapshots, Excel round-trip and mobile tests.

## GitHub Pages deployment

**Repository visibility and website visibility are separate.** A private repository does not necessarily make its Pages website private. The static app can be publicly reachable while each visitor's portfolio stays in their browser. Public publication requires the owner's approval.

The existing target is `https://github.com/sidd23-Automate/Portfolio-Management`. Do not commit portfolio backups or uploaded files. `.github/workflows/check.yml` validates pushes and PRs. Deployment is intentionally manual (`workflow_dispatch`), so pushing source does not publish the site automatically.

After publication approval and with suitable GitHub permissions:

1. Commit the reviewed source and push a `main` branch to the existing repository.
2. In repository **Settings → Pages**, choose **GitHub Actions** as source. Verify the repository and site visibility separately.
3. Run **Build and deploy Pages** from Actions. It runs tests, browser checks and build; configures Pages with `actions/configure-pages@v5`, uploads `dist` with `actions/upload-pages-artifact@v4`, and deploys using `actions/deploy-pages@v4`. The deploy job uses `pages: write`, `id-token: write` and the `github-pages` environment.
4. Visit the URL returned by the deployment action, verify loading and refresh at `/Portfolio-Management/`, and test storage and downloads. No live deployment has been claimed until this succeeds.

Official documentation verified during implementation (through their official GitHub source mirrors):

- [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite static deployment / GitHub Pages](https://vite.dev/guide/static-deploy.html)
- [ExcelJS API](https://github.com/exceljs/exceljs)

Official raw documentation sources, HTTPS Git reads and GitHub API access were verified. The existing repository is public and account permissions allow administration. The Pages workflow is dispatched manually after publication approval. Never paste tokens in chat.
