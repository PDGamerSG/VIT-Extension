# VTop+

VTop+ is a powerful, open-source browser extension designed to enhance the VTOP experience for VIT students. It revamps the interface, adds missing features, and provides a customizable, modern, and dark-mode-ready environment.

## ✨ Key Features

- **Revamped Homepage & UI**: A cleaner, user-friendly dashboard layout with a modern aesthetic. 
- **Dark Mode**: A highly requested, seamless dark mode integration for late-night study sessions.
- **Hide CGPA**: Added a privacy toggle feature to hide your CGPA from the dashboard.
- **Course Page Filters**: Filter by semester and academic year, such as "Fall 2025–26". The newest available semester opens by default unless a course is already selected. Use "All" to see every course.
- **Class Messages on Dashboard**: Important class announcements are now directly visible on the improved homepage layout.
- **Better Timetable View**: A solid foundation for viewing your timetable (with major enhancements planned for upcoming releases).
- **DA (Digital Assignment) Upload Improvements**:
  - View the exact **Upload Status** right on the page.
  - Preview uploaded assignments directly without needing to download them first.
- **Quick Logout**: An accessible logout button directly in the navigation bar.

## 🚀 Installation 

Clone this repository and build with Node.js. No dependencies are required.

### Firefox

1. Run `node build.js firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select `dist/firefox/manifest.json`.
4. Open VTOP and allow the extension to access the site if Firefox asks.

Temporary add-ons are removed when Firefox restarts. Permanent installation in standard Firefox requires a Mozilla-signed add-on. To submit a build for signing, ZIP the contents of `dist/firefox/` with `manifest.json` at the archive root.

### Chrome / Edge

1. Run `node build.js chrome`.
2. Open `chrome://extensions/` (or `edge://extensions/`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select `dist/chrome/`.

Run `node build.js` to build both browsers. Browser-specific manifests share the same source files. Firefox uses a background script; Chrome uses a service worker. Dark mode and its saved preference are shared across the campus interfaces within each browser.

## 👨‍💻 Developer

Developed with ❤️ by **Pallab Das**. 

Let's connect!
- [GitHub: @PDGamerSG](https://github.com/PDGamerSG)
- [LinkedIn: Pallab Das](https://www.linkedin.com/in/das-pallab/)
- [Instagram: @pallabdas_pd](https://www.instagram.com/pallabdas_pd/)

## 📝 License

This project is open source. (Add details about licensing if applicable).
