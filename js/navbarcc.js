// ============================================================
// ViBoot Navbar for VTOPCC + Dark Mode toggle
// ============================================================

const DARK_STYLE_ID_CC = "viboot-dark-mode";

const applyDarkModeCC = () => {
  if (document.getElementById(DARK_STYLE_ID_CC)) return;
  const link = document.createElement("link");
  link.id = DARK_STYLE_ID_CC;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL("js/darkmodecc.css");
  document.head.appendChild(link);
};

const removeDarkModeCC = () => {
  const el = document.getElementById(DARK_STYLE_ID_CC);
  if (el) el.remove();
};

const toggleDarkModeCC = () => {
  const isActive = !!document.getElementById(DARK_STYLE_ID_CC);
  if (isActive) {
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
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
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

    const isDark = !!document.getElementById(DARK_STYLE_ID_CC);

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
            style="background:none;border:1px solid rgba(255,255,255,0.3);border-radius:50%;width:32px;height:32px;
            font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;
            margin-left:15px;transition:all 0.2s;color:#fafafa;">${isDark ? "☀️" : "🌙"}</button>
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