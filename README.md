# QueryStudio

A modern, lightweight PostgreSQL client built with Tauri, React, and Rust.

## Features

- **Connection Management** - Save and quickly switch between database connections (Cmd+K)
- **Table Browser** - Browse schemas and tables with row counts
- **Data Viewer** - Paginated table data with column types and primary key indicators
- **Query Editor** - Execute custom SQL queries with Cmd+Enter
- **CRUD Operations**
  - Add rows with smart defaults for SERIAL/auto-increment columns
  - Edit rows via right-click context menu
  - Delete rows with confirmation dialog
  - Copy cell content to clipboard

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Rust, Tauri v2
- **Database**: PostgreSQL via tokio-postgres

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

### Connecting to a Database

1. Click "New Connection" on the welcome screen
2. Enter connection details (host, port, database, username, password) or use a connection string
3. Click "Connect"

Connections are saved locally (without passwords) for quick access.

### Browsing Tables

- Tables are listed in the sidebar grouped by schema
- Click a table to view its data
- Use pagination controls to navigate through rows

### Adding Data

1. Select a table
2. Click "Add Row" button
3. Fill in the fields (columns with defaults like SERIAL are auto-skipped)
4. Click "Insert Row"

### Editing & Deleting

Right-click on any cell to:
- **Copy cell content** - Copy value to clipboard
- **Edit row** - Open editor with pre-filled values
- **Delete row** - Remove row (with confirmation)

### Query Editor

1. Switch to the "Query" tab
2. Write your SQL
3. Press Cmd+Enter (or Ctrl+Enter) to execute

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K | Open connection switcher |
| Cmd+Enter | Execute query (in Query tab) |

## Project Structure

```
src/                    # React frontend
├── components/         # UI components
├── lib/               # Hooks, API, types, store
└── routes/            # Page components

src-tauri/src/         # Rust backend
├── lib.rs             # Tauri commands
├── database.rs        # PostgreSQL connection manager
├── queries.rs         # SQL query constants
└── storage.rs         # Connection persistence
```

## License

MIT
