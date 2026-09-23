# Software Requirements Specification (SRS)
## Minimal Gym Management Mobile App

**Version:** 1.0
**Date:** July 6, 2026
**Platform:** React Native (Expo), Expo Router, NativeWind, SQLite/AsyncStorage (fully offline, no cloud backend)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for a minimal, single-admin gym management mobile application. The app allows a gym owner to track members and their monthly fee payment status, without any premium/tiered membership plans. It is offline-first with automatic cloud backup.

### 1.2 Scope
The app is for internal use by one gym owner/admin (hardcoded credentials, no multi-user roles). It does not handle online fee collection, class scheduling, attendance, or equipment management. It tracks: members, their fixed monthly fee, payment history, and monthly financial summaries.

### 1.3 Intended User
A single gym administrator. No member-facing login or portal.

---

## 2. Overall Description

### 2.1 Product Perspective
Standalone, fully offline mobile app. Local SQLite/AsyncStorage is the sole data store — there is no cloud backend, no sync, and no internet dependency at any point. All data (members, payments, profile pictures) lives only on the device.

### 2.2 Constraints
- No premium/tiered plans — every member pays the same fixed monthly fee (e.g. Rs. 1000).
- Single hardcoded login (PIN/password), no real authentication provider.
- No payment gateway integration — payments are recorded manually by the admin, not collected in-app.
- Monthly cycle resets automatically on the 1st of each month (all members become "unpaid" for the new month; history is preserved, not deleted).

### 2.3 Assumptions
- Only one device/admin uses the app; there is no multi-device access or data sharing.
- The app has no internet dependency whatsoever — it is designed to work entirely offline, permanently, not just when connectivity is unavailable.
- Data lives only on the device; the user is responsible for their own device-level backups (e.g. phone backup tools) if desired, outside the scope of this app.

---

## 3. System Features

### 3.1 Screen 1 — Login Screen
**Description:** Gates access to the app.

**Requirements:**
- FR-1.1: Display a PIN/password input field.
- FR-1.2: Validate input against a hardcoded, hashed credential stored in app config.
- FR-1.3: On success, navigate to the Dashboard (Home) screen.
- FR-1.4: On failure, show an error message; no lockout/rate-limiting required at this scale.
- FR-1.5: Session is not persisted across app restarts — app always opens on the login screen.

### 3.2 Screen 2 — Dashboard (Home) Screen
**Description:** At-a-glance summary of gym status for the current month.

**Requirements:**
- FR-2.1: Display total number of registered members.
- FR-2.2: Display number of members who have paid the current month's fee.
- FR-2.3: Display number of members who have not paid the current month's fee.
- FR-2.4: Display total payments collected this month, calculated as `paid_members_count × fixed_monthly_fee`.
- FR-2.5: Display total dues pending this month, calculated as `unpaid_members_count × fixed_monthly_fee`.
- FR-2.6: All figures shown as cards (Total Members, Paid, Unpaid, Collected, Due).
- FR-2.7: All figures automatically reset in meaning on the 1st of each month — since status is derived from whether a payment record exists for the current month, no explicit "reset" action is needed; new month simply starts with zero payment records.
- FR-2.8: Data refreshes each time the dashboard is opened or on pull-to-refresh.

### 3.3 Screen 3 — Members Screen
**Description:** Full member list and CRUD operations.

**Requirements:**
- FR-3.1: Display all members with: profile picture (or placeholder), name, phone (if present), and current month payment status badge (Paid/Unpaid).
- FR-3.2: Provide a search bar to filter members by name.
- FR-3.3: Provide filter options: All / Paid / Unpaid.
- FR-3.4: Provide sort options: by Name (A–Z / Z–A), by Date Created (newest/oldest).
- FR-3.5: Support Create: add a new member with name (required), profile picture (optional), phone number (optional). Monthly fee defaults to the fixed gym fee.
- FR-3.6: Support Read: tap a member to view full details and payment history.
- FR-3.7: Support Update: edit member's name, photo, and phone.
- FR-3.8: Support Delete: remove a member (with confirmation prompt) and their payment history.
- FR-3.9: From the member detail view, allow marking the member as "Paid" for the current month — this captures the device's current date/time automatically and creates a payment record.
- FR-3.10: Search, filter, and sort must work together (combinable, not mutually exclusive).

### 3.4 Screen 4 — Accounts / Finance Screen
**Description:** Historical and current financial overview.

**Requirements:**
- FR-4.1: Display total payments collected in the current month.
- FR-4.2: Display a month-by-month history of payments collected (e.g. list or chart: month, amount collected, number of members paid).
- FR-4.3: Allow filtering the history by a specific month/year.
- FR-4.4: Display total dues outstanding for the current month.
- FR-4.5: (Optional, nice-to-have) Show a simple trend indicator — e.g. collection this month vs. last month.

---

## 4. Data Model

**members**
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | required |
| photo_uri | text | optional; local path + Supabase Storage URL once synced |
| phone | text | optional |
| join_date | date | auto-set on creation |
| is_active | boolean | for soft-delete if needed |
| created_at | timestamp | |
| updated_at | timestamp | |

**payments**
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| member_id | uuid | foreign key → members.id |
| month | text | format: `YYYY-MM` |
| paid_on | timestamp | captured automatically from device clock when marked paid |
| amount | number | fixed fee amount at time of payment |
| created_at | timestamp | |

**app_config** (local only)
| Field | Type | Notes |
|---|---|---|
| login_hash | text | hardcoded, hashed credential |
| monthly_fee | number | fixed fee, e.g. 1000 |
| gym_name | text | display name |

A member's current-month status (Paid/Unpaid) is **derived**, not stored: unpaid unless a `payments` row exists for that `member_id` and the current `month`.

---

## 5. Non-Functional Requirements

- NFR-1: The app must work entirely offline, with no internet or network permission required at any point.
- NFR-2: All data (members, payments, profile pictures) is stored only in local SQLite/AsyncStorage and device file storage — no external server or cloud service is involved.
- NFR-3: The hardcoded login password is stored locally (hashed) and checked entirely on-device.
- NFR-4: The app should remain responsive with at least a few hundred members (typical small/medium gym scale).
- NFR-5: Since there is no cloud backup, data loss risk (e.g. app uninstall, device loss) should be communicated to the user; a manual local export/import (e.g. to a file) is a candidate for a future version.

---

## 6. Navigation Flow

```
Login Screen
    │ (successful login)
    ▼
Dashboard (Home)
    │
    ├──► Members Screen ──► Member Detail ──► Edit Member
    │                    └─► Add Member
    │
    └──► Accounts / Finance Screen
```

---

## 7. Out of Scope

- Premium/tiered membership plans
- Online payment collection / payment gateway integration
- Class scheduling, attendance tracking, equipment management
- Multi-staff roles or real authentication provider
- Cloud backup/sync of any kind — all data is local-only
- Push notifications / payment reminders (candidate for future version)
- Data export/import for backup purposes (candidate for future version)
