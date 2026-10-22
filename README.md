# IT Tech Manager

A comprehensive, enterprise-ready IT Operations, Asset Management, Helpdesk, and Infrastructure Tracking platform tailored for IT technicians, system administrators, and organizational end-users.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Modules & Features](#key-modules--features)
3. [Role-Based Portals](#role-based-portals)
4. [How It Works](#how-it-works)
5. [Technical Architecture](#technical-architecture)
6. [Database Schema & Resilience](#database-schema--resilience)
7. [Installation & Getting Started](#installation--getting-started)
8. [Scripts & Commands](#scripts--commands)
9. [Default Accounts](#default-accounts)
10. [Backup & Disaster Recovery](#backup--disaster-recovery)

---

## Overview

**IT Tech Manager** provides a centralized command center for corporate IT departments to manage physical assets, helpdesk tickets, scheduled maintenance checkups, network infrastructure, software licenses, standard operating procedures, and automated database backups.

The application combines a reactive single-page frontend with an Express API backend, utilizing an embedded SQLite database engine configured with Write-Ahead Logging (WAL) for maximum reliability and zero-configuration deployment.

---

## Key Modules & Features

### 1. Asset & Inventory Management
* **Lifecycle Tracking**: Track desktops, laptops, servers, printers, mobile devices, and network switches with unique asset tags, serial numbers, models, and purchase dates.
* **Custom Fields & Specs**: Dynamic custom fields per asset type and JSON specifications (RAM, CPU, storage, OS).
* **QR Codes & Printing**: Built-in QR code generator for rapid physical tagging and asset lookups.
* **Toner & Consumables Log**: Monitor printer toner replacements, models, costs, and technician logs.
* **Assignment History**: Detailed historical timeline recording reassignments, maintenance, and status transitions.

### 2. Helpdesk & Issue Resolution
* **Ticket Management**: Create, assign, categorize, and track support requests by priority (*Low*, *Medium*, *High*, *Critical*).
* **Work Progress & Notes**: Interactive progress bars, resolution summaries, and internal notes.
* **Field Service Reports (FSR)**: Generate printable, client-ready service sign-off documents with digital touchscreen signatures (`react-signature-canvas`) and PDF downloads (`jspdf`, `jspdf-autotable`, `html2canvas`).
* **Cost Tracking**: Record spare parts or third-party service costs per incident.

### 3. Infrastructure & Network Tracking
* **IP Address Management (IPAM)**: Track assigned, static, and DHCP IP addresses mapped to hostnames, MAC addresses, and physical locations.
* **Server & Security Monitoring**: Maintain inventory of on-premise and cloud servers, operating systems, hardware parts, and security compliance items.
* **Location Management**: Organize assets, personnel, and checkups by office, branch, building, or room.

### 4. Preventative Maintenance & Daily Tasks
* **Routine Checkups**: Configurable periodic health checks (Daily, Weekly, Monthly, Quarterly) across network gear, backups, server health, and security controls.
* **Recurring To-Do Lists**: Technicians can configure recurring daily, weekly (by day of week), or monthly (by day of month) tasks with priorities and completion logs.
* **Daily Logs & Activities**: Audit log recording technician interventions, status updates, and administrative events.

### 5. Licenses & Warranties
* **Contract Monitoring**: Track software subscriptions, cloud services, and hardware manufacturer warranties.
* **Proactive Expiration Alerts**: Visual notification badges and dashboard warnings for items approaching expiry within 30, 60, or 90 days.

### 6. Knowledge Base & Contacts
* **Procedures & SOPs**: Standard Operating Procedures documentation with step-by-step instructions, troubleshooting matrix, attached PDFs, and role-based visibility.
* **Shared Notes**: Rich markdown-friendly notes repository for system passwords, network diagrams, and technician knowledge transfer.
* **Contact Directory**: Company staff directory with phone extensions, external vendor contacts, and emergency ISP escalations.

---

## Role-Based Portals

The application implements strict Role-Based Access Control (RBAC):

| Role | Accessible Views & Permissions |
| :--- | :--- |
| **Admin** | Full system control: User management, custom field builder, role permissions, automated database backup/restore settings, system audit logs, and all operational modules. |
| **Technician** | Operational suite: Dashboard, Assets, Inventory, Issues/Helpdesk, Daily Tasks, Checkups, To-Dos, Software Warranties, Procedures, Reports, and Contacts. |
| **User** | Streamlined Self-Service Portal: Submit new support tickets, view personal assigned assets, track submitted ticket resolutions, browse public procedures, and access the internal staff directory. |

---

## How It Works

```
┌────────────────────────────────────────────────────────┐
│                   React 19 SPA (Client)                │
│  React Router v7  │  Tailwind CSS  │  Recharts & Lucide│
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / REST (/api/*)
                            │ x-user-id / Bearer Auth
┌───────────────────────────▼────────────────────────────┐
│                  Express Backend (server.ts)           │
│  API Routing  │  Multer Uploads  │  Bcrypt Passwords   │
└───────────────────────────┬────────────────────────────┘
                            │ better-sqlite3
                            │ WAL Mode + Auto Checkpoints
┌───────────────────────────▼────────────────────────────┐
│             SQLite Database (database.sqlite)          │
│  Snapshot Backups  │  Pre-Validated Restores  │  WAL   │
└────────────────────────────────────────────────────────┘
```

1. **Client Layer**: Built with React 19 and Vite. State is managed reactively via context (`StoreProvider`), providing local form persistence, live toast notifications, dark mode, and optimistic UI updates.
2. **API & Security**: Express server running on port 3000 exposes REST endpoints under `/api/*`. Passwords are encrypted using `bcryptjs` with salt rounds. All requests validate role and resource-level permissions before performing database transactions.
3. **Storage Engine**: Data persists in SQLite via `better-sqlite3`. Database integrity is automatically enforced with foreign keys, transactional migrations, and Write-Ahead Logging (WAL).

---

## Technical Architecture

### Tech Stack

* **Frontend**:
  * **React 19** (`react`, `react-dom`)
  * **TypeScript** (`~5.8.2`)
  * **Vite 6** (Development server with middleware mode and build tooling)
  * **Tailwind CSS v4** (`@tailwindcss/vite` modern stylesheet compilation)
  * **React Router v7** (`react-router-dom` declarative client routing)
  * **Icons**: `lucide-react`
  * **Data Visualization**: `recharts` for IT ticket analytics and asset distributions
  * **Document & PDF Generation**: `jspdf`, `jspdf-autotable`, `html2canvas`
  * **Signatures & QR**: `react-signature-canvas`, `qrcode.react`
  * **Spreadsheet Utilities**: `xlsx` (Excel import/export)
* **Backend**:
  * **Node.js** (v22+)
  * **Express 4.22**
  * **better-sqlite3 12.6** (High-performance synchronous C++ SQLite binding)
  * **Multer 2.1** (Multipart form and image attachments)
  * **Bcryptjs 3.0** (Password hashing and credential verification)
  * **TSX 4.21** (Native TypeScript execution runner)
  * **Esbuild 0.28** (Fast production server bundler)

---

## Database Schema & Resilience

### WAL Mode (Write-Ahead Logging)
The embedded SQLite database operates with:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
```
* **Concurrency**: Reads and writes proceed without mutual exclusion, eliminating locks during simultaneous user interactions.
* **Crash Resilience**: Server restarts or unexpected terminations do not corrupt disk pages.
* **Graceful Termination**: The server captures `SIGINT` and `SIGTERM` signals to execute `wal_checkpoint(TRUNCATE)` and close database handles cleanly.

### Pre-Validated Restorations
When restoring a `.sqlite` database snapshot via the Admin portal:
1. The uploaded file is staged into a temporary file.
2. The server executes a dry-run `quick_check` integrity test on the candidate file.
3. Only if the uploaded file is proven to be a valid, uncorrupted SQLite database is the active database swapped, protecting the system from bricking due to invalid file uploads.

---

## Installation & Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher (v20+ / v22+ recommended)
* **npm**: v9.0.0 or higher

### Setup

1. **Clone or enter the project directory**:
   ```bash
   cd it-tech-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will start on **`http://localhost:3000`** (Express backend serving both the REST API and the Vite React frontend).

4. **Build for production**:
   ```bash
   npm run build
   ```
   This compiles the Vite frontend into `dist/` and bundles `server.ts` into `dist/server.cjs`.

5. **Run in production**:
   ```bash
   npm start
   ```

---

## Scripts & Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Runs the full-stack server using `tsx server.ts` with Vite middleware in development mode. |
| `npm run build` | Builds the React frontend (`vite build`) and bundles `server.ts` into `dist/server.cjs` via `esbuild`. |
| `npm run start` | Launches the pre-built production server (`node dist/server.cjs`). |
| `npm run lint` | Runs TypeScript type checking across the entire project (`tsc --noEmit`). |
| `npm run clean` | Deletes the `dist/` build directory. |

---

## Default Accounts

On initial launch, if no database exists, the application bootstraps default users:

| Username | Role | Default Password | Recommended Action |
| :--- | :--- | :--- | :--- |
| **admin** | Admin | `Admin@123` | Log in and change password immediately via Admin Portal. |
| **tech** | Technician | `Tech@123` | For standard day-to-day IT support and asset updates. |
| **user** | User | `User@123` | Standard employee self-service portal account. |

---

## Backup & Disaster Recovery

The system provides three backup methods under the **Backup & Restore** module:

1. **Automated SQLite Snapshots**:
   * Scheduled backups can run daily or weekly to a configurable local or network directory.
   * Creates point-in-time `.sqlite` clones using SQLite's native online backup API.
2. **JSON Data Dumps**:
   * One-click download of the entire database as a structured JSON file, including encrypted credentials and custom field schemas.
   * Can be restored across heterogeneous platforms or different SQLite versions.
3. **CSV Inventory Exports**:
   * Export asset inventories into spreadsheet-ready CSV files for audits and management reporting.
