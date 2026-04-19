
# Airo — AI Travel Engineering Platform

A premium, minimalist trip planner with a "silent" AI engine, real photos, live pricing, and branded PDF exports.

## Tech Foundation
- **Lovable Cloud**: Auth (email/password) + database for users, trips, and trip items
- **Lovable AI Gateway**: Vision-capable model (`google/gemini-2.5-flash`) for text + image analysis
- **AI image generation**: `google/gemini-2.5-flash-image` to produce authentic-looking destination/hotel/flight imagery on demand (cached per item)
- **Server functions** for AI calls and PDF generation
- **i18n**: Auto RTL/LTR based on browser language (Hebrew/English)
- **Theming**: Dynamic dark/light following device preference, "Airo Blue" accent, 24px+ corner radius throughout

## Auth & Accounts
- Email/password signup + login (`/auth`)
- `profiles` table (display name, avatar, language preference)
- `user_roles` table (separate from profiles, with `has_role` security definer function)
- Protected routes for trip creation/management; public route for shared QR view

## Routes
- `/` — Home: Airo logo, "Past Trips" gallery (immersive cards), single "Launch New Journey" CTA
- `/auth` — Sign up / log in
- `/trip/new` — Initial parameters (origin, dates, travelers count)
- `/trip/$tripId/plan` — Main workflow with top progress bar (Flights → Hotels → Attractions), the Airo Drawer, basket items, floating Live Total
- `/trip/$tripId/review` — Vertical timeline view + "Export Airo Itinerary" button
- `/shared/$shareToken` — Public read-only itinerary view (QR target)

## The Airo Drawer (Silent AI)
- Pull-up bottom sheet with physics-based animation
- Clean text input ("Direct flights to Japan in March", "Near Shinjuku, luxury vibe")
- Prominent image drop zone — uploaded photos analyzed by vision AI to identify locations
- Subtle "thinking" animation (no chat bubbles, no conversation UI)
- Returns 4–6 option cards with AI-generated authentic imagery, ratings, prices
- "Best Value" badge on items priced below the monthly average

## Trip Workflow
**Phase 1 — Flights** (multi-leg supported): Add outbound + return + stopovers to basket
**Phase 2 — Hotels** (multi-destination): Each hotel gets its own check-in/check-out dates
**Phase 3 — Attractions**: Suggested by hotel proximity + travel dates

Tapping any card expands to immersive full-screen detail. Add-to-basket updates the floating Live Total instantly.

## Final Review & PDF Export
- Vertical timeline plotting flights, hotel stays, and scheduled attractions in chronological order
- "Export Airo Itinerary" generates a branded PDF (server-side) with:
  - Airo logo + cover
  - Timeline layout
  - Real photos for every selected item
  - Updated prices + booking links
  - **QR code** linking to `/shared/$shareToken` so others can import the trip into their Airo account

## Database Schema (Lovable Cloud)
- `profiles` — user info
- `user_roles` — separate roles table with `has_role()` security definer
- `trips` — id, owner, title, origin, dates, traveler_count, status, share_token
- `trip_items` — trip_id, type (flight/hotel/attraction), payload JSON, image_url, price, start_date, end_date, sort_order
- `trip_collaborators` — for QR-imported viewers

## Design System
- **Light**: white + light-grey layered surfaces
- **Dark**: charcoal/midnight luxury palette
- **Accent**: Airo Blue for progress bar, price tags, CTAs
- **Radius**: 24px+ on all components (cards, buttons, inputs, drawer)
- **Typography**: clean sans-serif with strong hierarchy
- **Motion**: smooth, physics-based drawer + stage transitions

## Build Order
1. Foundation: design tokens (light/dark, Airo Blue, 24px radius), i18n RTL/LTR setup, base layout
2. Auth + profiles + user_roles schema
3. Home screen with Past Trips gallery
4. Trip creation + database schema for trips/items
5. Planning workflow shell (progress bar, basket, Live Total)
6. Airo Drawer UI + AI server function (text + image analysis)
7. AI image generation for cards (cached per item)
8. Flights → Hotels → Attractions stages
9. Review timeline screen
10. PDF export server function with QR + shared trip route
