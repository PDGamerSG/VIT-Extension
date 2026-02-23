// ============================================================
// VTop+ Navbar — Shortcut buttons + Dark Mode toggle
// ============================================================

// ---- Dark Mode ----

let isDarkModeActive = false;

const applyDarkMode = () => {
	isDarkModeActive = true;
	DarkReader.enable({
		brightness: 100,
		contrast: 100,
		sepia: 0
	});
};

const removeDarkMode = () => {
	isDarkModeActive = false;
	DarkReader.disable();
};

const toggleDarkMode = () => {
	if (isDarkModeActive) {
		removeDarkMode();
		chrome.storage.sync.set({ vtopDarkMode: false });
		updateDarkToggleIcon(false);
	} else {
		applyDarkMode();
		chrome.storage.sync.set({ vtopDarkMode: true });
		updateDarkToggleIcon(true);
	}
};

const updateDarkToggleIcon = (isDark) => {
	const btn = document.getElementById("vtop-dark-toggle");
	if (btn) {
		btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";

		btn.innerHTML = isDark
			? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative; top:2px;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
			: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#e8e8e8" stroke="none" style="position:relative; top:2px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
	}
};

// Apply dark mode immediately on load if preference is set
chrome.storage.sync.get(["vtopDarkMode"], (result) => {
	if (result.vtopDarkMode) {
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
	if (document.getElementById("vtop-navbar")) return;

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
	span.id = "vtop-navbar";
	span.style.cssText = "display:flex;align-items:center;gap:4px;padding:0 8px;";

	// Helper — create a navigation button with original styles
	const makeBtn = (label, dataUrl) => {
		if (!dataUrl) return "";
		return `<button class="btn btn-primary border-primary shadow-none vtop-nav-btn" type="button" style="background:rgba(13,110,253,0);border-style:none;white-space:nowrap;height:32px;display:flex;align-items:center;" data-vtop-url="${dataUrl}">${label}</button>`;
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

	const favouriteBtn = document.getElementById("favouriteBtn");
	if (favouriteBtn) {
		favouriteBtn.className = "btn btn-primary border-primary shadow-none vtop-nav-btn";
		favouriteBtn.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; white-space:nowrap; padding:4px 8px !important; display:flex; justify-content:center; align-items:center; outline:none !important; color:#e8e8e8 !important; height: 32px;";
		// Enforce fixed matching size on the icon
		const icon = favouriteBtn.querySelector("i");
		if (icon) icon.style.cssText = "font-size: 20px !important; position: relative; top: 0px;";
		favouriteBtn.style.display = "flex";
	}

	// Dark mode toggle will be generated as a DOM node and added to the right side navigation area

	// Recreate home button to avoid CSP inline-execution errors when moving elements with `onclick="javascript:..."`
	const originalHomeBtn = document.querySelector("#quickLinks a[onclick*='home']");
	if (originalHomeBtn) {
		const newHomeBtn = document.createElement("button");
		newHomeBtn.className = "btn btn-primary border-primary shadow-none vtop-nav-btn";
		newHomeBtn.style.cssText = "background:rgba(13,110,253,0);border-style:none;white-space:nowrap;padding:4px 8px;display:flex;align-items:center;height:32px;";
		newHomeBtn.innerHTML = originalHomeBtn.innerHTML; // Keep the icon
		const icon = newHomeBtn.querySelector("i");
		if (icon) icon.style.cssText = "font-size: 20px !important; position: relative; top: 2px;";
		newHomeBtn.type = "button";
		newHomeBtn.title = "Home";

		newHomeBtn.addEventListener("click", () => {
			// Strip inline handlers to avoid CSP violations
			originalHomeBtn.removeAttribute("onclick");
			if (originalHomeBtn.href && originalHomeBtn.href.startsWith("javascript:")) {
				originalHomeBtn.removeAttribute("href");
			}
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
	const isDark = isDarkModeActive;
	const darkBtnStyle = "background:transparent !important; border:none !important; box-shadow:none !important; white-space:nowrap; padding:4px 8px; display:flex; justify-content:center; align-items:center; cursor:pointer; outline:none !important; transition:all 0.2s ease; height: 32px;";
	const darkToggleBtn = document.createElement("button");
	darkToggleBtn.id = "vtop-dark-toggle";
	darkToggleBtn.type = "button";
	darkToggleBtn.style.cssText = darkBtnStyle;
	darkToggleBtn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";

	darkToggleBtn.innerHTML = isDark
		? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative; top:1px;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
		: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#e8e8e8" stroke="none" style="position:relative; top:1px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

	// Create a dedicated Sign Out button that triggers the hidden logout form
	let logoutBtn = null;
	const logoutForm = document.getElementById("logoutForm1");
	if (logoutForm) {
		logoutBtn = document.createElement("button");
		logoutBtn.className = "btn btn-danger shadow-none vtop-nav-btn";
		logoutBtn.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; white-space:nowrap; padding:4px 8px !important; display:flex; justify-content:center; align-items:center; outline:none !important; transition:all 0.2s ease; cursor:pointer; height: 32px;";
		logoutBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative; top:1px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 5 12 10 7"></polyline><line x1="15" y1="12" x2="5" y2="12"></line></svg>';
		logoutBtn.type = "button";
		logoutBtn.title = "Sign Out";

		logoutBtn.addEventListener("click", () => {
			const submitBtn = logoutForm.querySelector('button[type="submit"]');
			if (submitBtn) submitBtn.click();
			else logoutForm.submit();
		});
	}

	// Move Utilities & Reg No into a single aligned group
	const rightNav = document.querySelector("ul.navbar-nav.ms-auto");
	const userDropdown = document.getElementById("navbarDropdown");
	const userDropdownLi = userDropdown ? userDropdown.closest("li") : null;

	if (rightNav && userDropdownLi) {
		// Ensure userDropdownLi is flex and centered
		userDropdownLi.style.cssText = "display: flex !important; align-items: center !important; gap: 4px;";
		userDropdownLi.classList.add("d-none", "d-sm-flex");

		// Insert buttons BEFORE the userDropdown
		if (favouriteBtn) userDropdownLi.insertBefore(favouriteBtn, userDropdownLi.firstChild);
		userDropdownLi.insertBefore(darkToggleBtn, userDropdown);
		if (logoutBtn) {
			// Sign out at the very end
			userDropdownLi.appendChild(logoutBtn);
		}
	} else if (rightNav) {
		const rightBtnsLi = document.createElement("li");
		rightBtnsLi.className = "nav-item d-none d-sm-flex";
		rightBtnsLi.style.cssText = "display: flex !important; align-items: center !important; gap: 4px; margin-right: 12px;";
		if (favouriteBtn) rightBtnsLi.appendChild(favouriteBtn);
		rightBtnsLi.appendChild(darkToggleBtn);
		if (logoutBtn) rightBtnsLi.appendChild(logoutBtn);
		rightNav.appendChild(rightBtnsLi);
	} else {
		if (favouriteBtn) span.appendChild(favouriteBtn);
		span.appendChild(darkToggleBtn);
		if (logoutBtn) span.appendChild(logoutBtn);
	}

	// Restyle the Reg No text to match our buttons and remove the dropdown caret
	if (userDropdown) {
		userDropdown.className = "btn btn-primary border-primary shadow-none vtop-nav-btn";
		userDropdown.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; white-space:nowrap; padding:4px 8px !important; display:flex; align-items:center; outline:none !important; height: 32px;";

		const spanText = userDropdown.querySelector("span");
		if (spanText) {
			spanText.className = "";
			spanText.style.cssText = "color: #e8e8e8 !important; font-size: 14px !important; font-weight: normal; line-height: 1;";
		}
	}

	nav[0].insertBefore(span, nav[0].children[0]);

	span.querySelectorAll(".vtop-nav-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const url = btn.getAttribute("data-vtop-url");
			if (!url) return; // Ignore buttons without URLs (e.g. Dark Mode/Logout handled separately)

			const target = Array.from(document.getElementsByTagName("a")).find(
				(a) => a.dataset.url === url
			);

			if (target) {
				// Strip inline handlers to avoid CSP violations
				target.removeAttribute("onclick");
				if (target.href && target.href.startsWith("javascript:")) {
					target.removeAttribute("href");
				}
				target.dispatchEvent(new MouseEvent("click", {
					view: window,
					bubbles: true,
					cancelable: true,
					buttons: 1
				}));
			}

			// Disable buttons momentarily to prevent rapid clicks breaking VTOP AJAX
			span.querySelectorAll(".vtop-nav-btn").forEach((b) => (b.disabled = true));
			setTimeout(() => {
				span.querySelectorAll(".vtop-nav-btn").forEach((b) => (b.disabled = false));
			}, 1000); // 1s timeout ensures VTOP finishes loading the view
		});
	});

	// Attach dark mode toggle
	const darkBtn = document.getElementById("vtop-dark-toggle");
	if (darkBtn) {
		darkBtn.addEventListener("click", toggleDarkMode);
	}
};

const nav_bar_change = () => {
	// Don't duplicate
	if (document.getElementById("vtop-navbar")) return;

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
	const el = document.getElementById("vtop-navbar");
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
				document.querySelectorAll(".vtop-nav-btn").length === 0 &&
				flag
			) {
				nav_bar_change();
			}
		} catch (error) { }
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
if (document.querySelectorAll(".vtop-nav-btn").length === 0) {
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
			// Removed sessionStorage.setItem("vtopLastView", url);
		}
	}
});
