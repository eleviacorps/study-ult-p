# Task Plan: Subject → Author/Institution Hierarchy ✅ DONE

## Changes Made

### Database Schema (`supabase-schema.sql`)
- Added `author` column to `user_notes` table
- Added `author` column to `md_bank` table (in table definition + alter table for existing)
- Added index on `md_bank(author)`

### Types (`src/types/index.ts`)
- Added `author: string` to `Note` interface

### Notes API (`src/app/api/notes/route.ts`)
- Added `author` to `IncomingNote` type
- `GET` now returns `author` field
- `POST` upserts `author` field

### md_bank API (`src/app/api/md-bank/route.ts`)
- `GET` now returns `author` in list, supports `?author=` filter
- `POST` accepts and stores `author` field

### Reader Page (`src/app/reader/page.tsx`)
- **Rewritten** with Subject → Author → Chapter hierarchy
- Groups chapters by subject, then by author/institution
- Shows subject badge and author label on each card

### Reader Chapter Page (`src/app/reader/[chapter]/reader-chapter-client.tsx`)
- Breadcrumbs now include subject and author
- Subtitle shows subject · author · N topics

### Note Agent Upload Form (`src/app/note-agent/page.tsx`)
- Added **Subject** input field
- Added **Author / Institution** input field
- `Save to Vault` now passes subject + author
- Admin upload form now has Author field

### md_bank UI in Note Agent
- Files now grouped by Subject → Author in the bank browser
- Shows author label on each file group

### Vault Parser (`src/lib/vault-parser.ts`)
- Added `author: ""` to all parsed notes
