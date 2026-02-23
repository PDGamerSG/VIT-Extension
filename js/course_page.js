let reg_no;
let moduleWise = true;


//sends the message to service worker
const trigger_download = (downloads) => {
  chrome.runtime.sendMessage({ message: "course-page-data", data: downloads });
};

// Download Link — constructs authenticated download URL
const get_link = (link_element, reg_no) => {
  if (!link_element) return null;

  const url = link_element.getAttribute("data-downloadurl");
  if (!url) return null;

  const sanitizedUrl = url.trim().replace(/[^a-zA-Z0-9/_\-.?&=]/g, "");
  const utc = new Date();
  const encodedRegNo = encodeURIComponent(reg_no || "");
  const encodedTime = encodeURIComponent(utc.toUTCString());

  if (window.location.href.indexOf("vtopcc") === -1) {
    const csrf = encodeURIComponent(document.getElementsByName("_csrf")[0]?.defaultValue || "");
    return `https://vtop.vit.ac.in/vtop/${sanitizedUrl}?authorizedID=${encodedRegNo}&_csrf=${csrf}&x=${encodedTime}`;
  } else {
    return `https://vtopcc.vit.ac.in/vtop/${sanitizedUrl}?authorizedID=${encodedRegNo}&x=${encodedTime}`;
  }
};

//Link Details
const get_link_details = (link_element, index) => {

  if (link_element.outerText.indexOf("_") === -1) {
    let table_rows = link_element.parentNode.parentNode.parentNode.children;
    let module = table_rows[3].innerText.trim();
    let module_title = table_rows[4].innerText.trim();
    let topic = table_rows[7].innerText.trim();
    let date = table_rows[1].innerText.trim();

    if (module == "") {
      topic = "Unnamed";
    }

    let title = (link_element.title + "-" + topic + "-" + date).replace(
      /[/:*?"<>|]/g,
      "_"
    );
    let folder_title = module + "-" + module_title;
    let data = {
      url: get_link(link_element, reg_no),
      title: title,
      folder_title: folder_title,
    };

    return data;
  } else {
    let data = {
      url: get_link(link_element, reg_no),
      title: link_element.title + "-",
    };

    return data;
  }
};

//collects the course name, faculty name and slot
let course_details = () => {
  let course_table = document
    .getElementsByTagName("table")[0]
    .querySelectorAll("td");
  let course =
    course_table[8].innerText.trim() + "-" + course_table[9].innerText.trim();
  let faculty_slot =
    course_table[12].innerText.trim() + "-" + course_table[13].innerText.trim();
  return { course, faculty_slot };
};

//Get the individual link beside the individual check box
const checkbox_link = (chk) => {
  if (chk.parentNode === null) return [];

  return Array.from(chk.parentNode.children).filter(function (child) {
    return child !== chk;
  });
};

//Download Files "All" or "Selected"
const download_files = (type) => {
  let all_links = Array.from(document.querySelectorAll(".check-input"));

  all_links = all_links
    .filter((link) => type === "all" || link["checked"])
    .map((link, index) => get_link_details(checkbox_link(link)[0], index));

  const { course, faculty_slot } = course_details();

  return trigger_download({
    link_data: all_links,
    course: course,
    faculty_slot: faculty_slot,
    module_wise: moduleWise,
  });
};



const modify_page = () => {
  const { course, faculty_slot } = course_details();

  /* ADD MODULE-WISE TOGGLE SWITCH */
  let targetElement = document.querySelector("#CoursePageLectureDetail > div:nth-child(11) > div.form-group.col-sm-12.row.mb-3");

  if (targetElement) {
    let toggleWrapper = document.createElement("div");
    toggleWrapper.style.display = "flex";
    toggleWrapper.style.alignItems = "center";
    toggleWrapper.style.justifyContent = "flex-end";
    toggleWrapper.style.marginTop = "5px";

    let toggleLabel = document.createElement("label");
    toggleLabel.innerText = "Download Module Wise";
    toggleLabel.style.marginRight = "10px";
    toggleLabel.style.fontSize = "14px";
    toggleLabel.style.color = "#333";
    toggleLabel.style.fontWeight = "bold";

    let toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.checked = true;
    toggleCheckbox.style.width = "18px";
    toggleCheckbox.style.height = "18px";
    toggleCheckbox.style.cursor = "pointer";

    toggleWrapper.appendChild(toggleLabel);
    toggleWrapper.appendChild(toggleCheckbox);
    targetElement.insertBefore(toggleWrapper, targetElement.firstChild);

    toggleCheckbox.addEventListener("change", () => {
      moduleWise = toggleCheckbox.checked;
    });
  }

  // Reference material links — redirect downloads through the extension
  let material = Array.from(document.querySelectorAll(".btn-link"));
  let ref_material = material.filter(m => !m.innerHTML.includes("Web Material"));

  ref_material.forEach((elem, index) => {
    elem.addEventListener("click", (event) => {
      event.preventDefault();
      return trigger_download({
        link_data: [get_link_details(elem, index)],
        course,
        faculty_slot,
        module_wise: moduleWise,
      });
    });
  });

  // Add tooltips to materials
  for (let i = 0; i < ref_material.length; i++) {
    ref_material[i].setAttribute("title", i + 1);
  }

  /* Download buttons at the bottom of the page */
  let footer = document.getElementsByClassName("form-group col-md-4")[2];
  if (!footer) return;
  footer.className = "form-group col-md-6";

  let download_all_d = document.getElementById("backButton").cloneNode(true);
  download_all_d.removeAttribute("href");
  download_all_d.removeAttribute("onclick");
  download_all_d.innerText = "Download all files";
  download_all_d.style = "padding:3px 16px;font-size:13px; margin-left:5px;";
  download_all_d.onclick = () => download_files("all");
  footer.appendChild(download_all_d);

  let download_selected_d = download_all_d.cloneNode(true);
  download_selected_d.innerText = "Download selected files";
  download_selected_d.onclick = () => download_files("selected");
  footer.appendChild(download_selected_d);
};

// ── Semester Filter for Course Dropdown ──
let lastActiveFilter = "all"; // Persists across re-creations

const addSemesterFilter = () => {
  const FILTER_ID = "vit-ext-semester-filter";
  if (document.getElementById(FILTER_ID)) return;

  const courseSelect = document.getElementById("courseId");
  if (!courseSelect) return;

  // Store all original options (excluding the default placeholder)
  const allOptions = Array.from(courseSelect.options);
  const defaultOption = allOptions.find(o => o.value === "");
  const courseOptions = allOptions.filter(o => o.value !== "");

  if (courseOptions.length === 0) return;

  // Detect semesters
  const fallOptions = courseOptions.filter(o => o.textContent.includes("Fall Semester"));
  const winterOptions = courseOptions.filter(o => o.textContent.includes("Winter Semester"));

  // Only add filter if there are multiple semesters
  if (fallOptions.length === 0 && winterOptions.length === 0) return;

  // Find insertion point
  const fieldset = courseSelect.closest("fieldset");
  if (!fieldset) return;
  const legend = fieldset.querySelector("legend");

  // Create filter bar
  const filterBar = document.createElement("div");
  filterBar.id = FILTER_ID;
  Object.assign(filterBar.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    margin: "8px 0 12px 0",
    borderRadius: "8px",
    flexWrap: "wrap",
  });

  // Label
  const label = document.createElement("span");
  label.textContent = "Filter:";
  Object.assign(label.style, {
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    marginRight: "4px",
  });
  filterBar.appendChild(label);

  // Button state
  const buttons = [];
  let activeKey = "all";

  // Minimal pill-shaped button styles
  const BTN_BASE = {
    padding: "5px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    outline: "none",
    border: "1px solid #e2e8f0",
    backgroundColor: "transparent",
    color: "#475569",
    transition: "all 200ms ease",
    lineHeight: "1.4",
    letterSpacing: "0.01em",
  };

  const BTN_ACTIVE = {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    borderColor: "#3b82f6",
    fontWeight: "600",
  };

  const BTN_INACTIVE = {
    backgroundColor: "transparent",
    color: "#475569",
    borderColor: "#e2e8f0",
    fontWeight: "500",
  };

  const createBtn = (text, key) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    btn.dataset.semKey = key;
    Object.assign(btn.style, BTN_BASE);

    btn.addEventListener("mouseenter", () => {
      if (activeKey !== key) {
        btn.style.backgroundColor = "#f1f5f9";
        btn.style.borderColor = "#cbd5e1";
      }
    });

    btn.addEventListener("mouseleave", () => {
      if (activeKey !== key) {
        Object.assign(btn.style, BTN_INACTIVE);
      }
    });

    btn.addEventListener("click", () => filterCourses(key));
    filterBar.appendChild(btn);
    buttons.push({ btn, key });
    return btn;
  };

  const setActiveBtn = (key) => {
    activeKey = key;
    lastActiveFilter = key;
    buttons.forEach(b => {
      if (b.key === key) {
        Object.assign(b.btn.style, BTN_ACTIVE);
      } else {
        Object.assign(b.btn.style, BTN_INACTIVE);
      }
    });
  };

  // Create filter buttons
  createBtn("All", "all");
  if (fallOptions.length > 0) createBtn("Fall · " + fallOptions.length, "fall");
  if (winterOptions.length > 0) createBtn("Winter · " + winterOptions.length, "winter");

  // Course count badge
  const badge = document.createElement("span");
  Object.assign(badge.style, {
    marginLeft: "auto",
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "500",
  });
  badge.textContent = courseOptions.length + " courses";
  filterBar.appendChild(badge);

  // Filter logic
  const filterCourses = (key) => {
    const selectedValue = courseSelect.value;

    while (courseSelect.options.length > 0) {
      courseSelect.remove(0);
    }

    if (defaultOption) courseSelect.appendChild(defaultOption.cloneNode(true));

    const filtered = key === "fall" ? fallOptions
      : key === "winter" ? winterOptions
        : courseOptions;

    filtered.forEach(opt => courseSelect.appendChild(opt.cloneNode(true)));

    if (selectedValue && Array.from(courseSelect.options).some(o => o.value === selectedValue)) {
      courseSelect.value = selectedValue;
    } else {
      courseSelect.selectedIndex = 0;
    }

    setActiveBtn(key);
  };

  // Insert into DOM
  if (legend) {
    legend.insertAdjacentElement("afterend", filterBar);
  } else {
    fieldset.insertBefore(filterBar, fieldset.firstChild);
  }

  // Restore previous filter state
  setActiveBtn(lastActiveFilter);
  if (lastActiveFilter !== "all") {
    filterCourses(lastActiveFilter);
  }
};

// ── Message listener for course page modifications ──
chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "course_page_change") {
    try {
      const loader = setInterval(function () {
        if (document.readyState !== "complete") return;
        clearInterval(loader);
        // gets the registration number
        if (
          document.getElementsByClassName(
            "navbar-text text-light small fw-bold"
          )[0] == undefined
        ) {
          reg_no =
            document
              .getElementsByClassName("VTopHeaderStyle")[0]
              .innerText.replace("(STUDENT)", "")
              .trim() || "";
        } else reg_no = document.getElementsByClassName("navbar-text text-light small fw-bold")[0].innerText.replace("(STUDENT)", "").trim() || "";
        if (!document.getElementsByName("download_all_u").length) {
          modify_page();
        }
      }, 500);
    } catch (error) { }
  }
});

// ── Persistent observer to detect Course Page appearing in the DOM ──
// This fires whenever the #courseId select element appears (initial Course Page load)
(() => {
  let filterDebounce = null;
  const coursePageObserver = new MutationObserver(() => {
    const courseSelect = document.getElementById("courseId");
    const filterExists = document.getElementById("vit-ext-semester-filter");
    if (courseSelect && !filterExists) {
      if (filterDebounce) clearTimeout(filterDebounce);
      filterDebounce = setTimeout(() => {
        addSemesterFilter();
      }, 300);
    }
  });
  coursePageObserver.observe(document.body, { childList: true, subtree: true });
})();