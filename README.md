# Thrive Automation FSM — Modern UI Rebuild

A modern, responsive rebuild of the **Thrive Automation FSM** field service application, derived from the
`thrive-automation.fsm-26.4.00` bundle and the application workspace. It keeps the same operational model
(work orders, dispatch, inventory, timesheets, projects, checklists, sites/assets, HR and configuration)
while presenting it in a refreshed, modern interface.

The app is completely self-contained: **no build step, no server, no dependencies**.

---

## Run it

1. Open `index.html` directly in a modern browser (Chrome, Edge, Firefox, Safari).
2. Or serve the folder locally:

   ```bash
   python -m http.server 8080
   ```

   Then open <http://localhost:8080>.

All demo data and changes are stored in the browser (`localStorage`), so you can explore freely and
reload without losing your work.

---

## What is included

### Dashboard
- Live KPIs: open work orders, completions, SLA / on-time rate, low-stock alerts
- 7-day work order volume chart (created vs completed)
- Work order status donut, technician workload, high-priority queue
- Today's route map and team activity feed

### Work orders
- Search, status / priority / technician filters
- List, Kanban board and technician schedule views
- Create, edit, assign, reschedule and complete work orders
- Board cards are draggable between statuses
- Detail drawer with overview, interactive task checklist, parts and activity timeline

### Dispatch & route planning
- Per-technician daily route planner
- Add, remove, reorder and drag stops
- Nearest-neighbour route optimization with distance and drive-time savings
- Stylised route map with stop sequence
- Saved routes table with load / delete

### Inventory
- Stock register with levels, bins, warehouses, reorder points and value
- Stock adjustment workflow (add/remove with audit trail)
- Movement orders: receipts, transfers and issues — completing an order applies stock
- Replenishment suggestions that generate draft receipts
- Item creation and low-stock notifications

### Timesheets
- Weekly timesheet by technician with day-by-day summary
- Add / edit / delete time entries against work orders or projects
- Submit for approval; approvals tab to approve or return sheets
- Billable / non-billable tracking and locked submitted periods

### Projects
- Project cards with progress, budget burn and milestone counts
- Project drawer with timeline, budget, hours and interactive milestones
- Create / edit projects, add milestones, advance milestone status and auto-recalculate progress

### Checklists
- Checklist instances with progress tracking and due dates
- Live item toggling; marking all items complete updates status and notifications
- Reusable templates, template preview and "use template" to create instances
- Create custom checklist templates

### Sites & assets
- Site register with contacts, linked assets and open work orders
- Site detail view and "create work order at this site"
- Asset register with status, serial, install and warranty information

### HR & leave
- Leave request queue with approve / reject actions
- Remaining balances per technician (annual, sick, study, family)
- New leave request with automatic day calculation
- Approved leave updates technician availability

### Configuration
- Technician management with skills, groups, status and utilization
- Support-group overview with live membership counts
- Work order templates and standard task sets
- Appearance (light / dark), demo data export, and full reset

---

## Demo data

The seed dataset is generated relative to the current date so the app always looks live. It includes:

| Entity | Count |
| --- | --- |
| Work orders | 19 |
| Technicians | 6 |
| Sites | 8 |
| Assets | 12 |
| Inventory items | 12 |
| Warehouses | 3 |
| Movement orders | 5 |
| Projects | 4 |
| Checklists | 5 |
| Checklist templates | 4 |
| Timesheets | 5 |
| Leave requests | 6 |
| Saved routes | 3 |

### Reset and export
- **Configuration → Settings → Reset workspace** restores the original seeded dataset.
- **Export dataset** downloads the current state as JSON.
- Data is stored under `thrive-automation-fsm-demo-state-v1`; theme is stored separately.

---

## Interaction notes

- `Ctrl / Cmd + K` opens the global command palette.
- `Esc` closes the palette, modal, drawer, popover or mobile navigation.
- Drag work order cards across board columns; drag route stops to reorder.
- Theme and layout work down to phone width.
- All icons are inline SVG; no font or CDN dependency.

---

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Application shell, SVG icon sprite |
| `styles.css` | Design system, light/dark themes, responsive layout |
| `data.js` | Relative-date demo dataset |
| `app.js` | State, routing, views, forms, interactions |

The original bundle remains untouched alongside this folder. This rebuild is a front-end demo:
server-side platform processes were replaced with equivalent browser-side logic and local persistence.
