// ============================================================
// ViBoot Navbar for VTOPCC + Dark Mode toggle
// ============================================================

let isDarkModeActiveCC = false;

const applyDarkModeCC = () => {
  isDarkModeActiveCC = true;
  DarkReader.enable({
    brightness: 100,
    contrast: 100,
    sepia: 0
  });
};

const removeDarkModeCC = () => {
  isDarkModeActiveCC = false;
  DarkReader.disable();
};

const toggleDarkModeCC = () => {
  if (isDarkModeActiveCC) {
    removeDarkModeCC();
    chrome.storage.sync.set({ vibootDarkMode: false });
    updateDarkToggleIconCC(false);
  } else {
    applyDarkModeCC();
    chrome.storage.sync.set({ vibootDarkMode: true });
    updateDarkToggleIconCC(true);
  }
};

const updateDarkToggleIconCC = (isDark) => {
  const btn = document.getElementById("viboot-dark-toggle-cc");
  if (btn) {
    btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
    btn.innerHTML = isDark
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative; top:1px;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="#e8e8e8" stroke="none" style="position:relative; top:1px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  }
};

// Apply dark mode on load if preference is set
chrome.storage.sync.get(["vibootDarkMode"], (result) => {
  if (result.vibootDarkMode) {
    applyDarkModeCC();
  }
});

// ---- VTOPCC Navbar ----

let nav_barcc = () => {
  if (document.URL.match("vtopcc") != null) {
    // Avoid duplicates
    if (document.getElementById("viboot-navbar-cc")) return;

    const isDark = isDarkModeActiveCC;

    const navItems = [
      { label: "Marks View", url: "examinations/StudentMarkView", id: "EXM0011" },
      { label: "Class Attendance", url: "academics/common/StudentAttendance", id: "ACD0042" },
      { label: "Course Page", url: "academics/common/StudentCoursePage", id: "ACD0045" },
      { label: "DA Upload", url: "examinations/StudentDA", id: "EXM0017" },
      { label: "Time Table", url: "academics/common/StudentTimeTable", id: "ACD0034" },
      { label: "Academic Calendar", url: "academics/common/CalendarPreview", id: "ACD0128" },
    ];

    const span = document.createElement("div");
    span.id = "viboot-navbar-cc";
    span.className = "navbar-brand";
    span.style.paddingTop = "20px";
    span.style.display = "flex";
    span.style.alignItems = "center";

    // Create nav links as buttons (CSP-safe, no javascript: URLs)
    navItems.forEach(item => {
      const link = document.createElement("button");
      link.type = "button";
      link.textContent = item.label;
      link.dataset.loadUrl = item.url;
      link.dataset.menuId = item.id;
      Object.assign(link.style, {
        color: "#fafafa",
        borderStyle: "none",
        background: "transparent",
        textDecoration: "none",
        marginLeft: "15px",
        fontSize: "15px",
        cursor: "pointer",
        padding: "0",
        outline: "none",
      });

      link.addEventListener("click", () => {
        // Find the original VTOP sidebar menu item and click it
        const original = document.getElementById(item.id)
          || document.querySelector(`a[onclick*="${item.url}"]`);
        if (original) {
          original.dispatchEvent(new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1,
          }));
        }
      });

      span.appendChild(link);
    });

    // Dark mode toggle button
    const darkToggleBtn = document.createElement("button");
    darkToggleBtn.id = "viboot-dark-toggle-cc";
    darkToggleBtn.type = "button";
    darkToggleBtn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
    Object.assign(darkToggleBtn.style, {
      background: "transparent",
      border: "none",
      boxShadow: "none",
      whiteSpace: "nowrap",
      padding: "4px 8px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
      outline: "none",
      transition: "all 0.2s ease",
      marginLeft: "15px",
      height: "32px",
    });

    darkToggleBtn.innerHTML = isDark
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative; top:1px;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="#e8e8e8" stroke="none" style="position:relative; top:1px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

    span.appendChild(darkToggleBtn);

    document.getElementsByClassName("navbar-header")[0].insertAdjacentElement("beforeend", span);

    // Attach dark mode toggle handler
    darkToggleBtn.addEventListener("click", toggleDarkModeCC);
  }
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "vtopcc_nav_bar") {
    try {
      nav_barcc();
    } catch (error) {
      // console.log(error);
    }
  }
});