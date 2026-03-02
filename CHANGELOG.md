# Changelog

All notable changes to VTop+ are documented here.

---

## [Unreleased]

### Added
- **Exam Schedule Beautifier** — new `js/exam_schedule.js` renders the exam schedule as a clean, filterable table instead of the raw VTOP table
  - Filter tabs: All / FAT / CAT2 / CAT1; tabs marked ✓ Done when all exams are past
  - Countdown badges in the Date column (Today / Tomorrow / N days / past rows faded)
  - Horizontally scrollable on mobile
- **Pin Teacher on Course Page** — 📌 teacher filter bar below the semester selector (`js/course_page.js`)
  - Pinned teachers persisted via `chrome.storage.sync`
  - Chips to toggle filter on/off; × to unpin
- **Timetable Evening Batch Support** (`js/time_table.js`)
  - Fixed lab slot index 12 (6:31–7:20) that was previously unset
  - Auto-detects and labels Morning Batch / Evening Batch / Full Day
  - Mobile-responsive horizontal scroll

### Changed
- **Dark Mode** — overhauled to a 100xdevs-inspired neutral dark theme (`js/navbar.js`, `js/navbarcc.js`)
  - Replaced blue-tinted navy palette with pure neutral dark (`#0d0d0d` background, `#161616` cards)
  - Buttons styled as flat/ghost (no raised button appearance)
  - DarkReader settings: `contrast: 90, sepia: 10`
- **VIT Logo** — removed from navbar; logo-to-homepage wiring removed (`js/navbar.js`)
- **Exam Schedule** — changed from card grid to compact table layout; removed "Report 30 minutes before" notice
- **Download Naming** (`js/course_page.js`, `service_worker/background.js`)
  - Downloads now use the original material title as the filename
  - Folder: `VIT Downloads/<Module Title>/<MaterialName>.<ext>`
- **Mobile Responsiveness** — navbar scrolls horizontally on small screens; sign-out always visible (`js/navbar.js`, `js/navbarcc.js`)
- **Home Navigation** — clicking the VIT logo previously navigated home; home button has been removed in favour of the logo (feature removed in this update)

### Manifest
- Added `js/exam_schedule.js` to content scripts (`manifest.json`)

---

## Notes
- CSP compliance maintained throughout: all navigation uses `dispatchEvent(MouseEvent)`, no `javascript:` href injection.
- Pinned teachers stored under `chrome.storage.sync` key `vtopPinnedTeachers`.
