// ============================================================
// ViBoot Navbar — Shortcut buttons + Dark Mode toggle
// ============================================================

// ---- Dark Mode ----

const DARK_STYLE_ID = "viboot-dark-mode";

const applyDarkMode = () => {
	if (document.getElementById(DARK_STYLE_ID)) return;
	const link = document.createElement("link");
	link.id = DARK_STYLE_ID;
	link.rel = "stylesheet";
	link.type = "text/css";
	link.href = chrome.runtime.getURL("js/darkmode.css");
	document.head.appendChild(link);
};

const removeDarkMode = () => {
	const el = document.getElementById(DARK_STYLE_ID);
	if (el) el.remove();
};

const toggleDarkMode = () => {
	const isActive = !!document.getElementById(DARK_STYLE_ID);
	if (isActive) {
		removeDarkMode();
		chrome.storage.sync.set({ vibootDarkMode: false });
		updateDarkToggleIcon(false);
	} else {
		applyDarkMode();
		chrome.storage.sync.set({ vibootDarkMode: true });
		updateDarkToggleIcon(true);
	}
};

const updateDarkToggleIcon = (isDark) => {
	const btn = document.getElementById("viboot-dark-toggle");
	if (btn) {
		btn.textContent = isDark ? "☀️" : "🌙";
		btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
	}
};

// Apply dark mode immediately on load if preference is set
chrome.storage.sync.get(["vibootDarkMode"], (result) => {
	if (result.vibootDarkMode) {
		applyDarkMode();
	}
});

// ---- Hide unwanted VTOP navbar clutter ----

const hideNavbarClutter = () => {
	// We MUST KEEP the elements in the DOM (so the home button clone can proxy clicks to it);
	// thus, we aggressively hide them with CSS. Bootstrap's d-inline-block uses !important
	// so we MUST append display:none!important to all targets.

	const hideAggressively = (el) => {
		if (el) el.style.cssText += "; display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important;";
	};

	hideAggressively(document.getElementById("quickLinks"));
	hideAggressively(document.getElementById("printVTOPCoreDocument"));
	hideAggressively(document.getElementById("favouriteBtn"));
	hideAggressively(document.getElementById("campusEtiquetteBtn"));
	hideAggressively(document.querySelector("#quickLinks a[onclick*='home']"));

	// Hide profile image icons
	const profileImg = document.querySelector(".navbar-nav img.img_icon_size");
	if (profileImg && profileImg.closest("li")) hideAggressively(profileImg.closest("li"));

	const mobileProfileImg = document.querySelector(".navbar-nav img.img_stamp_size");
	if (mobileProfileImg && mobileProfileImg.closest("li")) hideAggressively(mobileProfileImg.closest("li"));

	// Hide the VIT Logo Emblem
	const vitLogo = document.querySelector("a.navbar-brand");
	if (vitLogo) hideAggressively(vitLogo);

	// Compact the navbar height for a slimmer profile
	const mainNav = document.querySelector("nav.navbar");
	if (mainNav) {
		mainNav.style.setProperty("min-height", "40px", "important");
		mainNav.style.setProperty("padding-top", "0px", "important");
		mainNav.style.setProperty("padding-bottom", "0px", "important");
	}

	const headerBarControl = document.getElementById("vtopHeaderBarControl");
	if (headerBarControl) {
		headerBarControl.style.setProperty("padding-bottom", "0px", "important");
	}
};

// ---- Navbar shortcut buttons ----

const buildNavbar = (items_list) => {
	// Avoid duplicates
	if (document.getElementById("viboot-navbar")) return;

	// Remove clutter from original navbar
	hideNavbarClutter();

	// Map item names to their data-url values for direct, reliable clicking
	let marksUrl = null,
		attendanceUrl = null,
		coursePageUrl = null,
		daUploadUrl = null,
		timeTableUrl = null,
		calendarUrl = null,
		examScheduleUrl = null;

	for (let i = 0; i < items_list.length; i++) {
		const text = items_list[i].innerText.trim();
		const url = items_list[i].dataset.url;
		if (text.includes("Class Attendance")) attendanceUrl = url;
		else if (text.includes("Course Page")) coursePageUrl = url;
		else if (text.includes("Digital Assignment Upload")) daUploadUrl = url;
		else if (text.includes("Time Table")) timeTableUrl = url;
		else if (text.includes("Calendar")) calendarUrl = url;
		else if (text.includes("Marks")) marksUrl = url;
		else if (url === "examinations/StudExamSchedule") examScheduleUrl = url;
	}

	const nav = document.getElementsByClassName("collapse navbar-collapse");
	if (!nav || nav.length === 0) return;

	const span = document.createElement("div");
	span.id = "viboot-navbar";
	span.style.cssText = "display:flex;align-items:center;gap:4px;padding:0 8px;";

	// Helper — create a navigation button with original styles
	const makeBtn = (label, dataUrl) => {
		if (!dataUrl) return "";
		return `<button class="btn btn-primary border-primary shadow-none viboot-nav-btn" type="button" style="background:rgba(13,110,253,0);border-style:none;white-space:nowrap;" data-viboot-url="${dataUrl}">${label}</button>`;
	};

	span.innerHTML =
		makeBtn("Marks View", marksUrl) +
		makeBtn("Attendance", attendanceUrl) +
		makeBtn("Course Page", coursePageUrl) +
		makeBtn("DA Upload", daUploadUrl) +
		makeBtn(timeTableUrl ? "Time Table" : "Calendar", timeTableUrl || calendarUrl) +
		makeBtn("Exam Schedule", examScheduleUrl);

	// Extract the original Quick Links dropdown, rename to 'More Pins', and incorporate it to the navbar
	const originalDropdown = document.querySelector("#quickLinks .dropdown");
	if (originalDropdown) {
		const toggleBtn = originalDropdown.querySelector("button.dropdown-toggle");
		if (toggleBtn) {
			toggleBtn.className = "btn btn-primary border-primary shadow-none dropdown-toggle";
			toggleBtn.style.cssText = "background:rgba(13,110,253,0) !important; border-style:none !important; white-space:nowrap; padding:4px 12px !important; display:flex; align-items:center; color:#e8e8e8 !important; font-size: inherit; font-weight: normal;";
			const spanText = toggleBtn.querySelector("span");
			if (spanText) spanText.innerText = "More Pins";
		}
		span.appendChild(originalDropdown);
	}

	// Dark mode toggle will be generated as a DOM node and added to the right side navigation area

	// Recreate home button to avoid CSP inline-execution errors when moving elements with `onclick="javascript:..."`
	const originalHomeBtn = document.querySelector("#quickLinks a[onclick*='home']");
	if (originalHomeBtn) {
		const newHomeBtn = document.createElement("button");
		newHomeBtn.className = "btn btn-primary border-primary shadow-none viboot-nav-btn";
		newHomeBtn.style.cssText = "background:rgba(13,110,253,0);border-style:none;white-space:nowrap;padding:4px 8px;display:flex;align-items:center;";
		newHomeBtn.innerHTML = originalHomeBtn.innerHTML; // Keep the icon
		// Shift the icon down by 2px visually centering it
		const icon = newHomeBtn.querySelector("i");
		if (icon) icon.style.cssText = "position: relative; top: 2px;";
		newHomeBtn.type = "button";
		newHomeBtn.title = "Home";

		newHomeBtn.addEventListener("click", () => {
			originalHomeBtn.dispatchEvent(new MouseEvent("click", {
				view: window,
				bubbles: true,
				cancelable: true,
				buttons: 1
			}));
		});

		span.insertBefore(newHomeBtn, span.firstChild);
	}

	// Create Dark Mode toggle icon
	const isDark = !!document.getElementById(DARK_STYLE_ID);
	const darkBtnStyle = "background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:50%;width:32px;height:32px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;";
	const darkToggleBtn = document.createElement("button");
	darkToggleBtn.id = "viboot-dark-toggle";
	darkToggleBtn.type = "button";
	darkToggleBtn.style.cssText = darkBtnStyle;
	darkToggleBtn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
	darkToggleBtn.innerHTML = isDark ? "☀️" : "🌙";

	// Create a dedicated Sign Out button that triggers the hidden logout form
	let logoutBtn = null;
	const logoutForm = document.getElementById("logoutForm1");
	if (logoutForm) {
		logoutBtn = document.createElement("button");
		logoutBtn.className = "btn btn-danger shadow-none viboot-nav-btn";
		logoutBtn.style.cssText = "background:rgba(220,53,69,0.15) !important; border: 1px solid rgba(220,53,69,0.3) !important; color: #ff6b6b !important; white-space:nowrap; padding:4px 12px !important; display:flex; align-items:center; font-weight: 600 !important;";
		logoutBtn.innerHTML = "Sign Out";
		logoutBtn.type = "button";
		logoutBtn.title = "Sign Out";

		logoutBtn.addEventListener("click", () => {
			const submitBtn = logoutForm.querySelector('button[type="submit"]');
			if (submitBtn) submitBtn.click();
			else logoutForm.submit();
		});
	}

	// Move Dark Mode & Sign Out buttons to the right side next to Reg No
	const rightNav = document.querySelector("ul.navbar-nav.ms-auto");
	if (rightNav) {
		const rightBtnsLi = document.createElement("li");
		rightBtnsLi.className = "nav-item d-none d-sm-flex";
		rightBtnsLi.style.cssText = "align-items: center; gap: 8px; margin-right: 12px;";
		rightBtnsLi.appendChild(darkToggleBtn);
		if (logoutBtn) rightBtnsLi.appendChild(logoutBtn);

		const userDropdown = document.getElementById("navbarDropdown");
		const userDropdownLi = userDropdown ? userDropdown.closest("li") : null;

		if (userDropdownLi) {
			rightNav.insertBefore(rightBtnsLi, userDropdownLi);
		} else {
			rightNav.appendChild(rightBtnsLi);
		}
	} else {
		span.appendChild(darkToggleBtn);
		if (logoutBtn) span.appendChild(logoutBtn);
	}

	// Restyle the Reg No text to match our buttons and remove the dropdown caret
	const userDropdown = document.getElementById("navbarDropdown");
	if (userDropdown) {
		userDropdown.className = "btn btn-primary border-primary shadow-none viboot-nav-btn";
		userDropdown.style.cssText = "background:rgba(13,110,253,0) !important; border-style:none !important; white-space:nowrap; padding:4px 12px !important; display:flex; align-items:center;";

		const spanText = userDropdown.querySelector("span");
		if (spanText) {
			spanText.className = "";
			spanText.style.cssText = "color: #e8e8e8 !important; font-size: 13px !important; font-weight: 500 !important; letter-spacing: 0.3px;";
		}
	}

	nav[0].insertBefore(span, nav[0].children[0]);

	span.querySelectorAll(".viboot-nav-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const url = btn.getAttribute("data-viboot-url");
			if (!url) return; // Ignore buttons without URLs (e.g. Dark Mode/Logout handled separately)

			const target = Array.from(document.getElementsByTagName("a")).find(
				(a) => a.dataset.url === url
			);

			if (target) {
				// Use dispatchEvent instead of .click() to avoid Extension CSP catching
				// native inline hrefs as "unsafe-inline" extension executions.
				target.dispatchEvent(new MouseEvent("click", {
					view: window,
					bubbles: true,
					cancelable: true,
					buttons: 1
				}));
			}

			// Disable buttons momentarily to prevent rapid clicks breaking VTOP AJAX
			span.querySelectorAll(".viboot-nav-btn").forEach((b) => (b.disabled = true));
			setTimeout(() => {
				span.querySelectorAll(".viboot-nav-btn").forEach((b) => (b.disabled = false));
			}, 1000); // 1s timeout ensures VTOP finishes loading the view
		});
	});

	// Attach dark mode toggle
	const darkBtn = document.getElementById("viboot-dark-toggle");
	if (darkBtn) {
		darkBtn.addEventListener("click", toggleDarkMode);
	}
};

const nav_bar_change = () => {
	// Don't duplicate
	if (document.getElementById("viboot-navbar")) return;

	let items_list = Array.from(document.getElementsByTagName("a")).filter(
		(e) => e.dataset.url
	);

	// If sidebar items haven't loaded yet, poll until they appear
	if (items_list.length === 0) {
		let retries = 0;
		const maxRetries = 40; // 40 × 150ms = 6s max wait
		const poller = setInterval(() => {
			items_list = Array.from(document.getElementsByTagName("a")).filter(
				(e) => e.dataset.url
			);
			retries++;
			if (items_list.length > 0) {
				clearInterval(poller);
				buildNavbar(items_list);
			} else if (retries >= maxRetries) {
				clearInterval(poller);
			}
		}, 150);
		return;
	}
	buildNavbar(items_list);
};

const clear_navbar = () => {
	const el = document.getElementById("viboot-navbar");
	if (el) el.remove();
};

// ---- Message listener ----

let flag = false;

chrome.runtime.onMessage.addListener((request) => {
	if (request.message === "nav_bar_change") {
		try {
			if (
				document.getElementsByClassName("btn-group dropend")[0]?.style
					.backgroundColor === "red"
			) {
				document.getElementsByClassName("btn-group dropend")[0].remove();
			}
			if (
				document.querySelectorAll(".viboot-nav-btn").length === 0 &&
				flag
			) {
				nav_bar_change();
			}
		} catch (error) {
			console.log(error);
		}
	}
});

// Remove red dropend button if present
if (
	document.getElementsByClassName("btn-group dropend")[0]?.style
		.backgroundColor === "red"
) {
	document.getElementsByClassName("btn-group dropend")[0].remove();
}

// Initial load — set up navbar
if (document.querySelectorAll(".viboot-nav-btn").length === 0) {
	window.addEventListener("load", () => {
		nav_bar_change();
	}, false);
	flag = true;
}

// Global click listener to track sidebar clicks directly from VTOP menu
document.addEventListener("click", (e) => {
	const a = e.target.closest("a[data-url]");
	if (a) {
		const url = a.dataset.url;
		if (url && !(e.target.closest("#quickLinks") && a.getAttribute("onclick") && a.getAttribute("onclick").includes("home"))) {
			// Removed sessionStorage.setItem("vibootLastView", url);
		}
	}
});
