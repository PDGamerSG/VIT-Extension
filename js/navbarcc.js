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
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative; top:0px;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="#e8e8e8" stroke="none" style="position:relative; top:0px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
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

    let span = document.createElement("div");
    span.id = "viboot-navbar-cc";
    span.className = "navbar-brand";
    span.style.paddingTop = "20px";
    span.style.display = "flex";
    span.style.alignItems = "center";
    span.innerHTML = `
        <a href="javascript:loadmydiv('examinations/StudentMarkView')" id="EXM0011" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px" >Marks View</a>

        <a href="javascript:loadmydiv('academics/common/StudentAttendance')" id="ACD0042" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px;font-size:15px">Class Attendance</a>

        <a href="javascript:loadmydiv('academics/common/StudentCoursePage')" id="ACD0045" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Course Page</a>

        <a href="javascript:loadmydiv('examinations/StudentDA')" id="EXM0017" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">DA Upload</a>

        <a href="javascript:loadmydiv('academics/common/StudentTimeTable')" id="ACD0034" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Time Table</a>

        <a href="javascript:loadmydiv('academics/common/CalendarPreview')" id="ACD0128" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Academic Calendar</a>

        <button id="viboot-dark-toggle-cc" type="button" title="${isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}"
            style="background:transparent !important; border:none !important; box-shadow:none !important; white-space:nowrap; padding:4px 8px; display:flex; justify-content:center; align-items:center; cursor:pointer; outline:none !important; transition:all 0.2s ease; margin-left:15px;">
            ${isDark
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative; top:0px;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="#e8e8e8" stroke="none" style="position:relative; top:0px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
      }
        </button>
        `;

    document.getElementsByClassName("navbar-header")[0].insertAdjacentElement("beforeend", span);

    // Attach dark mode toggle handler
    const darkBtn = document.getElementById("viboot-dark-toggle-cc");
    if (darkBtn) {
      darkBtn.addEventListener("click", toggleDarkModeCC);
    }
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