let course = "";
let faculty_slot = "";
let module_wise = true;
let data = {};
let pendingDownloadName = null; // set by content script before .download-btn download

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "table_name" || request.message === "fac_upload_name") {
    // File naming preference (unused in current flow but kept for future use)
  }
  if (request.message === "set-download-name") {
    pendingDownloadName = request.name;
  }
  if (request.message === "course-page-data") {
    data = request.data;
  }
  if (request.message === "assignment-page-data") {
    data = request.data;
  }
});

/* Sends a message to the content script */
const returnMessage = (MessageToReturn) => {
  chrome.tabs.query({ active: true }, (tabs) => {
    for (let tab of tabs) {
      if (tab.url && tab.url.includes("vtop")) {
        chrome.tabs.sendMessage(tab.id, {
          message: MessageToReturn,
        }).catch(() => { });
        break;
      }
    }
  });
};

// Trigger download from course_page
const trigger_download = (request) => {
  course = request.data.course;
  faculty_slot = request.data.faculty_slot;
  module_wise = request.data.module_wise;
  request.data.link_data.forEach((link) => {
    if (!link.url) return;
    chrome.downloads.download({
      url: link.url,
      conflictAction: "uniquify",
    });
  });
};

// Change File Name for the file
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (
    item.url.includes("vtop.vit.ac.in") ||
    item.url.includes("vtopcc.vit.ac.in")
  ) {
    let view;
    let fileUrlLower = item.url.toLowerCase();
    if (fileUrlLower.includes("examinations")) {
      view = "Assignment";
    } else if (fileUrlLower.includes("coursesyllabusdownload")) {
      view = "Syllabus";
    } else if (fileUrlLower.includes("downloadpdf") || fileUrlLower.includes("facultypdf") || fileUrlLower.includes("downloadcoursemat")) {
      view = "Course";
    } else {
      view = "Unknown";
    }

    if (view == "Course") {
      const fileExt = "." + item.filename.split(".").pop();
      const ld = data && data.link_data && data.link_data[0];
      if (ld) {
        let filename = "VIT Downloads/";
        if (ld.folder_title && module_wise) {
          filename += ld.folder_title.replace(/[/:*?"<>|]/g, "_") + "/" + (ld.title || "file") + fileExt;
        } else {
          filename += (ld.title || "file") + fileExt;
        }
        suggest({ filename: filename });
      } else {
        // VTOP server filename format: SEMESTER_COURSEID_TYPE_YYYY-MM-DD_MaterialName.ext
        // Extract just the MaterialName part after the date
        const nameNoExt = item.filename.replace(/\.[^.]+$/, "");
        const dateMatch = nameNoExt.match(/_\d{4}-\d{2}-\d{2}_(.+)$/);
        const derivedName = dateMatch ? dateMatch[1] : (pendingDownloadName || null);
        if (derivedName) {
          suggest({ filename: "VIT Downloads/" + derivedName.replace(/[/:*?"<>|]/g, "_") + fileExt });
        } else {
          suggest({ filename: "VIT Downloads/Other Downloads/" + item.filename });
        }
        pendingDownloadName = null;
      }
      course = "";
      faculty_slot = "";
    }else if (view == "Assignment") {
      let file_extension = item.filename.replace(/([^_]*_){8}/, "").split(".");
      file_extension = "." + file_extension[file_extension.length - 1];
      let file_name = course;
      if (item.url.includes("doDownloadQuestion")) file_name += " QP ";
      else if (item.url.includes("downloadSTudentDA")) file_name += " Submission ";
      else {
        suggest({ filename: "VIT Downloads/Other Downloads/Assignments/" + item.filename });
        return;
      }
      file_name += item.filename.slice(-5, -4);
      suggest({ filename: "VIT Downloads/Other Downloads/Assignments/" + file_name + file_extension });
    } else if (view == "Syllabus") {
      let file_extension = item.filename.replace(/([^_]*_){8}/, "").split(".");
      file_extension = "." + file_extension[file_extension.length - 1];
      let syllabus_course = item.filename.split("_")[1];
      suggest({ filename: "VIT Downloads/Other Downloads/Syllabus/" + syllabus_course + file_extension });
    }
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* Fires after the completion of a request */
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    let link = details["url"];
    if (link.indexOf("doStudentMarkView") !== -1) {
      returnMessage("mark_view_page");
    } else if (
      link.indexOf("processViewStudentAttendance") !== -1 ||
      link.indexOf("processBackAttendanceDetails") !== -1
    ) {
      returnMessage("view_attendance");
    } else if (link.indexOf("menu.js") !== -1 || link.indexOf("home") !== -1) {
      if (link.indexOf("menu.js") !== -1) await sleep(500);
      returnMessage("nav_bar_change");
      if (link.indexOf("home") !== -1) {
        await sleep(500);
        returnMessage("dashboard");
      }
    } else if (link.indexOf("processViewStudentCourseDetail") !== -1) {
      returnMessage("course_page_change");
    } else if (
      link.indexOf("doDigitalAssignment") !== -1 ||
      link.indexOf("sweetalert.min.js") != -1 ||
      link.indexOf("glyphicons-halflings-regular.woff2") != -1
    ) {
      await sleep(300);
      returnMessage("da_upload");
    } else if (link.indexOf("vtopcc.vit.ac.in/vtop/vtopLogin") !== -1) {
      returnMessage("vtopcc_captcha");
    } else if (
      link.indexOf("vtop/doLogin") !== -1 ||
      link.indexOf("goHomePage") !== -1
    ) {
      returnMessage("vtopcc_nav_bar");
      returnMessage("dashboard");
    } else if (link.indexOf("processViewTimeTable") !== -1) {
      returnMessage("time_table");
    } else if (link.indexOf("processStudExamSchedule") !== -1) {
      // Form submitted — results loaded
      await sleep(400);
      returnMessage("exam_schedule");
    } else if (link.indexOf("StudExamSchedule") !== -1 && link.indexOf("process") === -1) {
      // Initial page navigation to exam schedule
      await sleep(800);
      returnMessage("exam_schedule");
    }
  },
  {
    urls: ["*://vtop.vit.ac.in/*", "*://vtopcc.vit.ac.in/vtop/*"],
  }
);

// Fires the msg from script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.message && request.message.course) trigger_download(request);
  } catch (e) { }
});

// Keep service worker alive
chrome.alarms.create({ periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => { });
