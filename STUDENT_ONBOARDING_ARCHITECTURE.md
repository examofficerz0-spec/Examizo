# Student Onboarding Architecture & Lifecycle Specification

## 1. Executive Summary
This document provides the complete architectural blueprint and audit for the **Student Onboarding Lifecycle** in the Examizo Exam Portal ecosystem. It details the end-to-end journey from authentication through profile provisioning, curriculum locking, identity verification (DigiLocker), sub-profile isolation, and admin synchronization across both Cloudflare D1 (production primary) and local persistent storage (`shared-db.json`).

---

## 2. Onboarding Lifecycle Architecture Diagram

```mermaid
flowchart TD
    Start([Student Visits Portal]) --> AuthChoice{Auth Method?}
    
    %% Email Registration Flow
    AuthChoice -->|Email / Password| RegForm[Register Form<br/>fullName, email, dob, password]
    RegForm --> APIReg[/api/auth/register]
    APIReg --> D1Users[D1 users Table]
    APIReg --> D1SubProf[D1 sub_profiles Table<br/>is_primary = 1]
    APIReg --> SharedDb[sharedDb.json Users & Profiles]
    APIReg --> SetCookie[Issue student_token JWT Cookie]

    %% Google OAuth Flow
    AuthChoice -->|Google OAuth| GoogleAuth[/api/auth/google]
    GoogleAuth --> CheckExisting{Account Exists?}
    CheckExisting -->|No - New Student| CreateGoogle[Create User Record<br/>email, account_email, full_name]
    CreateGoogle --> D1Users
    CreateGoogle --> D1SubProf
    CreateGoogle --> SharedDb
    CheckExisting -->|Yes| ReadProfiles[Read Existing Sub-Profiles]
    
    %% Post-Auth Routing Decision
    SetCookie --> OnboardingRouter{Evaluate Routing State}
    CreateGoogle --> OnboardingRouter
    ReadProfiles --> OnboardingRouter
    
    OnboardingRouter -->|Course Not Locked| CourseSelectionPage[Course Selection Hub<br/>/course-selection]
    OnboardingRouter -->|Multiple Profiles / PIN Set| ProfilesHub[Profiles Hub<br/>/profiles<br/>'Who is studying today?']
    OnboardingRouter -->|Course Locked & 1 Profile| Dashboard[Student Dashboard<br/>/dashboard]

    %% Course Selection & Locking
    CourseSelectionPage --> CurriculumPicker[Interactive Curriculum Picker<br/>Board, Class/Grade, Subjects]
    CurriculumPicker --> APICourseLock[/api/courses/lock]
    APICourseLock --> UpdateCourseUsers[UPDATE users.locked_course_id]
    APICourseLock --> UpdateCourseSubProf[UPDATE sub_profiles.locked_course_id]
    APICourseLock --> RefreshJWT[Refresh JWT with lockedCourseId]
    RefreshJWT --> ProfilesCheck{Multiple Profiles?}
    ProfilesCheck -->|Yes| ProfilesHub
    ProfilesCheck -->|No| Dashboard

    %% Profiles Management & Switching
    ProfilesHub --> ProfileAction{Action on Profiles?}
    ProfileAction -->|Select Profile with PIN| PINModal[Enter 4-Digit PIN]
    PINModal --> APISwitchProfile[/api/profile/switch]
    ProfileAction -->|Select Profile without PIN| APISwitchProfile
    ProfileAction -->|Add Sub-Profile| CreateSubProfModal[Create Profile Modal<br/>Name, DOB, PIN, Avatar, Course]
    CreateSubProfModal --> APICreateSubProf[/api/profile/create]
    APICreateSubProf --> D1SubProf
    APICreateSubProf --> D1Users
    APISwitchProfile --> ReissueToken[Re-issue JWT with Profile Identity]
    ReissueToken --> CheckSubCourse{Sub-profile has Course?}
    CheckSubCourse -->|No| CourseSelectionPage
    CheckSubCourse -->|Yes| Dashboard

    %% DigiLocker Verification Bridge
    Dashboard --> DigiPrompt{DigiLocker Verified?}
    DigiPrompt -->|Unverified| DigiModal[DigiLocker KYC Gateway]
    DigiModal --> APIDigiAuth[/api/digilocker/authorize]
    APIDigiAuth --> MedizoBridge[MeriPehchaan Gateway & Medizo Cloud]
    MedizoBridge --> APIDigiSync[/api/digilocker/sync]
    APIDigiSync --> VerifiedBadge[Verified Academic Badge<br/>digilocker_verified = 1]
    DigiPrompt -->|Verified| AcademicActivities[Access Tests, Practice, Leaderboard]
```

---

## 3. Audit of Unfinished, Partial, or Inconsistent Onboarding Features

| # | Component / Flow | Issue Description | Root Cause | Implemented Resolution |
|---|------------------|-------------------|------------|------------------------|
| **1** | **Profile Settings Save** (`/profile`) | `handleSaveProfile` in `src/app/profile/page.tsx` was a client-side mock function that only showed a toast and never sent an HTTP request. | Missing `/api/profile/update` route; form had no submission logic to persist changes. | Created `/api/profile/update` route with dual-write to D1 & `sharedDb`, bcrypt password updates, full validation, and connected `handleSaveProfile` with controlled inputs. |
| **2** | **Primary Profile Sync** (`/api/auth/register`) | When registering via email/password, the user was inserted into `users`, but never inserted into `sub_profiles` with `is_primary = 1`. | Missing `INSERT INTO sub_profiles` statement in registration route. | Added automatic `INSERT INTO sub_profiles` with `is_primary = 1` in both D1 and `sharedDb` registration flows. |
| **3** | **Google OAuth User Provisioning** (`/api/auth/google`) | For brand-new Google users, `account_email` and `full_name` were omitted (left `NULL`), and no `sub_profiles` row was created. | Incomplete SQL insert statement in `api/auth/google/route.ts`. | Populated `account_email = lowerEmail`, `full_name = cleanName`, and provisioned primary `sub_profiles` record in both D1 and `sharedDb`. |
| **4** | **Sub-Profile List Exclusion** (`/api/profile/list`) | In `api/profile/list/route.ts`, sub-profiles with an unassigned `locked_course_id` were filtered out with `return isPrimary \|\| (u.locked_course_id && ...);`. | Artificial filter excluding sub-profiles that hadn't locked a course yet. | Removed filter, allowing sub-profiles without locked course to display as "Curriculum Setup Pending" and navigate to `/course-selection` upon activation. |
| **5** | **Course Lock Sub-Profile Sync** (`/api/courses/lock` & `/api/course/select`) | When a student locks a curriculum course, only `users` was updated, leaving `sub_profiles.locked_course_id` un-updated. | Missing update query for `sub_profiles` table. | Added `UPDATE sub_profiles SET locked_course_id = ? WHERE id = ? OR (parent_user_id = ? AND is_primary = 1)` in both D1 and `sharedDb`. |
| **6** | **Class Promotion Sub-Profile Sync** (`/api/course/promote`) | When promoting/rolling back a school grade, only `users` was updated, not `sub_profiles`. | Missing `UPDATE sub_profiles` statement. | Added `UPDATE sub_profiles SET locked_course_id = ? WHERE id = ?` during both grade promotion and grade rollback. |
| **7** | **Admin Portal D1 Schema Initialization** (`admin-portal/src/lib/d1.ts`) | `admin-portal` had `ensureD1Columns()` with `ALTER TABLE` statements but lacked `ensureD1Tables()` with full `CREATE TABLE IF NOT EXISTS` definitions. | Schema synchronization divergence between portals. | Added full `ensureD1Tables()` creating `sub_profiles`, `mistake_logs`, `mock_tests`, `attempts`, and exported alias `ensureD1Columns`. |
| **8** | **Admin Student Creation Gaps** (`admin-portal/src/app/api/users/route.ts`) | Admin adding a student did not set `account_email`, `full_name`, or insert a primary row in `sub_profiles`. | Incomplete insert parameters in admin user creation route. | Updated admin creation to set `account_email`, `full_name`, and insert a primary row into `sub_profiles` in both D1 and `sharedDb`. |

---

## 4. Remediation Architecture & Target States

### A. Dedicated Profile Update Route (`/api/profile/update`)
- Validates student authentication token.
- Allows updating:
  - `name` / `full_name` / `nickname`
  - `dob`
  - `password` (re-hashed via bcrypt with minimum length validation)
- Updates both `users` and `sub_profiles` in Cloudflare D1 and `sharedDb.json`.
- Issues a refreshed JWT `student_token` with the updated display name and course metadata.

### B. Universal Primary Sub-Profile Provisioning
- Whenever a primary account is created (Email Registration, Google OAuth, or Admin Portal Creation):
  - In `users`: `id`, `name`, `full_name`, `nickname`, `email`, `account_email = email`, `status = 'Active'`.
  - In `sub_profiles`: `id = user.id`, `parent_user_id = user.id`, `parent_email = email`, `name`, `full_name`, `nickname`, `is_primary = 1`, `status = 'Active'`.

### C. Persistent Course Synchronization
- Whenever `/api/courses/lock`, `/api/course/select`, or `/api/course/promote` is invoked:
  - `UPDATE users SET locked_course_id = ? WHERE id = ? OR LOWER(email) = ?`
  - Simultaneously execute `UPDATE sub_profiles SET locked_course_id = ? WHERE id = ? OR (parent_user_id = ? AND is_primary = 1)`
  - Update local `sharedDb.users` and `sharedDb.sub_profiles` records for instant memory-mode resilience.

### D. Sub-Profile Visibility Guarantee
- In `/api/profile/list`, all sub-profiles are returned and unified between `users` and `sub_profiles`.
- If a sub-profile has no course, it renders safely with `"Curriculum Setup Pending"`. When switched into, the portal routes to `/course-selection` to finalize onboarding.

---

## 5. Completed Verification Checklist

- [x] Cloudflare D1 tables initialized (`users`, `sub_profiles`, `attempts`, `mock_tests`, `questions`, `xp_transactions`, `mistake_logs`, `courses`, `weekly_dpps`, `resources`, `notifications`).
- [x] Implemented `/api/profile/update` in `student-portal`.
- [x] Connected `src/app/profile/page.tsx` `handleSaveProfile` to `/api/profile/update` with controlled state binding.
- [x] Updated `/api/auth/register` to auto-provision primary `sub_profiles` row.
- [x] Updated `/api/auth/google` to set `account_email`, `full_name`, and auto-provision primary `sub_profiles` row.
- [x] Updated `/api/profile/list` to merge `sub_profiles` and ensure all sub-profiles remain visible.
- [x] Updated `/api/courses/lock` & `/api/course/select` to sync `sub_profiles.locked_course_id`.
- [x] Updated `/api/course/promote` to sync `sub_profiles.locked_course_id` on promote and rollback.
- [x] Updated `admin-portal/src/lib/d1.ts` to include full `ensureD1Tables()`.
- [x] Updated `admin-portal/src/app/api/users/route.ts` to populate `account_email`, `full_name`, and primary `sub_profiles` row.
- [x] Validated Next.js production build (`npm run build`) in both portals (`student-portal` and `admin-portal`).
- [x] Automatically committed and pushed all code changes to GitHub `origin main` on both remotes.
