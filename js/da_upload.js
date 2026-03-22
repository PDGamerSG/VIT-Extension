

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
let da_upload = true;
let da_page = async () => {
  let due_sync = [];
  da_upload = false;
  try {
    let reg_no, csrf;
    if (
      document.getElementsByClassName(
        "navbar-text text-light small fw-bold"
      )[0] != undefined
    ) {
      reg_no = document
        .getElementsByClassName("navbar-text text-light small fw-bold")[0]
        .innerText.replace("(STUDENT)", "")
        .trim();
    } else {
      reg_no = document
        .getElementsByClassName("VTopHeaderStyle")[0]
        .innerText.replace("(STUDENT)", "")
        .trim();
    }
    let table = document.getElementsByClassName("customTable")[0].children[0];
    let date = new Date().getTime();
    try {
      csrf = document.getElementsByName("_csrf")[3].defaultValue;
    } catch { }

    //Head Edit
    let table_head = document.getElementsByClassName("tableHeader");
    let edited_head = table_head[0].innerHTML.split("\n");
    // Reduce Course Title width to make room for the new columns
    edited_head = edited_head.map(h => h.replace('width: 45%;', 'width: 32%;'));
    edited_head.splice(5, 0, '<td style="width: 12%;">Upcoming Dues</td>');
    edited_head.splice(6, 0, '<td style="width: 13%;">Upload Status</td>');
    table_head[0].innerHTML = edited_head.join("");

    //body edit
    let rows = document.querySelectorAll(".tableContent");
    rows.forEach((row) => {
      let edited_row = row.innerHTML.split("\n");
      edited_row.splice(6, 0, '<td style="width: 12%;"></td>');
      edited_row.splice(7, 0, '<td style="width: 13%;"></td>');
      row.innerHTML = edited_row.join("");
    });

    for (let i = 1; i < table.children.length; i++) {
      const classid = table.children[i].children[1].innerHTML;
      if (table.children[i].children[3].children.length != 1) {
        await fetch(
          `${window.location.origin}/vtop/examinations/processDigitalAssignment`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: `authorizedID=${reg_no}&x=${new Date().toGMTString()}&classId=${classid}&_csrf=${csrf}`,
          }
        )
          .then((res) => res.text())
          .then(async (data) => {
            var parser = new DOMParser();
            var doc = parser.parseFromString(data, "text/html");
            var table_inner = doc.getElementsByClassName(
              "fixedContent tableContent"
            );
            let course_code = doc.getElementsByClassName(
              "fixedContent tableContent"
            )[0].children[1].innerText;
            let course_title = doc.getElementsByClassName(
              "fixedContent tableContent"
            )[0].children[2].innerText;
            //   console.log(table_inner);
            var due_date = await new Promise((resolve) => {
              let due_dates = [];
              let all_future_assignments = [];
              table_inner = Array.from(table_inner);
              table_inner.forEach((row) => {
                let date = row.childNodes[9] ? row.childNodes[9].childNodes[1] : null;
                if (!date) return;

                let is_un_uploaded = true;
                let upload_info = "";
                let upload_payload = null;
                try {
                  // Fallback: the old logic checking if children[0].innerHTML === ""
                  if (row.children[6] && row.children[6].children[0] && row.children[6].children[0].innerHTML === "") {
                    is_un_uploaded = true;
                  } else if (row.children[6]) {
                    upload_info = row.children[6].innerText.trim();
                    if (upload_info !== "" && upload_info !== "-" && !upload_info.toLowerCase().includes("upload")) {
                      is_un_uploaded = false;
                      let btn = row.querySelector("button#downloadStudentDA");
                      if (btn) {
                        let code = btn.getAttribute("data-code") || "";
                        let classid = btn.getAttribute("data-classid") || "";
                        if (!code || !classid) {
                          let onclickStr = btn.getAttribute("onclick") || "";
                          let match = onclickStr.match(/'([^']+)'.*?,'([^']+)'/);
                          if (match) {
                            code = match[1];
                            classid = match[2];
                          }
                        }
                        upload_payload = { code, classid };
                      }
                    }
                  }
                } catch { }

                try {
                  if (date.style.color == "green") {
                    let download_link = row.childNodes[11] ? row.childNodes[11].childNodes : [];
                    let assignment_obj = {
                      date_due: date.innerHTML,
                      download_link: download_link.length > 0 ? download_link[0] : document.createElement("div"),
                      course_code: course_code,
                      course_title: course_title,
                      is_uploaded: !is_un_uploaded,
                      upload_info: upload_info,
                      upload_payload: upload_payload
                    };

                    all_future_assignments.push(assignment_obj);

                    if (is_un_uploaded) {
                      due_dates.push(assignment_obj);
                    }
                  }
                } catch { }
              });

              if (all_future_assignments.length > 0) {
                all_future_assignments.sort((a, b) => new Date(a.date_due) - new Date(b.date_due));
              }

              if (due_dates.length > 0) {
                due_dates.sort((a, b) => {
                  return new Date(a.date_due) - new Date(b.date_due);
                });
                resolve({
                  due: due_dates[0],
                  next_any: all_future_assignments.length > 0 ? all_future_assignments[0] : null
                });
              } else {
                resolve({
                  due: {
                    date_due: "Nothing Left.",
                    download_link: document.createElement("div"),
                    course_code: course_code,
                    course_title: course_title,
                  },
                  next_any: all_future_assignments.length > 0 ? all_future_assignments[0] : null
                });
              }
              due_sync.push(due_dates);
            }).then((data) => data);

            var due = new Date(due_date.due.date_due.replace(/-/g, " ")).getTime();
            var color =
              (due - date) / (3600 * 24 * 1000) <= 3
                ? "rgb(238, 75, 43,0.6)"
                : "rgb(170, 255, 0,0.6)";
            let days_left = Math.ceil((due - date) / (3600 * 24 * 1000));
            // Transparent background if 'Nothing Left.'
            if (isNaN(due)) color = "transparent";

            table.children[i].children[4].style.background = color;
            if (!isNaN(days_left)) {
              table.children[i].children[4].innerHTML += `<span>${due_date.due.date_due}<br>(${days_left} days left)</span>`;
            } else {
              table.children[i].children[4].innerHTML += `<span>${due_date.due.date_due}</span>`;
            }
            if (due_date.due.download_link && due_date.due.download_link.nodeName) {
              table.children[i].children[4].children[0].appendChild(due_date.due.download_link.cloneNode(true));
            }

            // Populate Upload Status column
            let next_assign = due_date.next_any;
            if (next_assign) {
              let is_up = next_assign.is_uploaded;
              let bg_color = is_up ? "rgb(170, 255, 0,0.6)" : "rgb(238, 75, 43,0.6)"; // Green if uploaded, Red if not
              table.children[i].children[5].style.background = bg_color;

              let text_val = is_up ? `<span>${next_assign.upload_info}</span><br><span style="font-weight:bold;">(Uploaded)</span>`
                : `<span>${next_assign.date_due}</span><br><span style="font-weight:bold;">(Not Uploaded)</span>`;
              table.children[i].children[5].innerHTML = `<span style="display:inline-block; margin-bottom: 5px;">${text_val}</span>`;

              if (is_up && next_assign.upload_payload) {
                let viewBtn = document.createElement("button");
                viewBtn.innerHTML = '<i class="bi bi-eye-fill"></i> View';
                viewBtn.className = "btn btn-sm btn-link view-pdf-btn-main";
                viewBtn.style.color = "#0ea5e9";
                viewBtn.style.textDecoration = "none";
                viewBtn.style.fontWeight = "600";
                viewBtn.style.display = "block";
                viewBtn.style.margin = "0 auto";
                viewBtn.style.transition = "transform 0.2s, color 0.2s";

                viewBtn.onmouseover = () => {
                  viewBtn.style.transform = "scale(1.05)";
                  viewBtn.style.color = "#0284c7";
                };
                viewBtn.onmouseout = () => {
                  viewBtn.style.transform = "scale(1)";
                  viewBtn.style.color = "#0ea5e9";
                };

                let p = next_assign.upload_payload;
                viewBtn.onclick = async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  let originalHtml = viewBtn.innerHTML;
                  viewBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Wait...';
                  viewBtn.style.pointerEvents = "none";

                  try {
                    let actionUrl = "examinations/downloadSTudentDA/";
                    let formData = new URLSearchParams();

                    formData.append("authorizedID", reg_no);
                    formData.append("code1", p.code);
                    formData.append("classId1", p.classid);
                    if (csrf) formData.append("_csrf", csrf);

                    let res = await fetch(actionUrl, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                      },
                      body: formData,
                    });

                    if (res.ok) {
                      let blob = await res.blob();
                      if (blob.type === "application/octet-stream" || !blob.type) {
                        blob = new Blob([blob], { type: "application/pdf" });
                      }

                      let blobUrl = URL.createObjectURL(blob);
                      openPdfViewer(blobUrl);

                      setTimeout(() => {
                        URL.revokeObjectURL(blobUrl);
                      }, 5000);
                    } else {
                      console.error("Fetch failed. Status:", res.status);
                      alert("Failed to fetch document! Please try refreshing the page.");
                    }
                  } catch (error) {
                    console.error("Error viewing document:", error);
                    alert("Error viewing document. Please try again.");
                  } finally {
                    viewBtn.innerHTML = originalHtml;
                    viewBtn.style.pointerEvents = "auto";
                  }
                };

                table.children[i].children[5].appendChild(viewBtn);
              }
            } else {
              table.children[i].children[5].style.background = "transparent";
              table.children[i].children[5].innerHTML = `<span>-</span>`;
            }
          })
          .catch((err) => console.log(err));
      }
    }
    // console.log(due_sync);
    sort();

    // Calendar sync functionality and sorting text have been removed.
    da_upload = true;
  } catch (err) {
    // console.log(err);
  }
};


let sort_table = (n) => {
  let table = document.getElementsByTagName("tbody")[0];
  let i,
    x,
    y,
    count = 0;
  let switching = true;
  let direction = "ascending";

  while (switching) {
    switching = false;
    var rows = table.rows;

    //Loop to go through all rows
    for (i = 1; i < rows.length - 1; i++) {
      var Switch = false;

      // Fetch 2 elements that need to be compared
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      let x_due, y_due;
      if (n == 4) {
        x_due = parseInt(x.children[0].innerHTML.split("(")[1]);
        y_due = parseInt(y.children[0].innerHTML.split("(")[1]);
        if (isNaN(x_due)) {
          x_due = -1;
        }
        if (isNaN(y_due)) {
          y_due = -1;
        }
      }
      // Check the direction of order
      if (direction == "ascending") {
        // Check if 2 rows need to be switched
        if (
          x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase() &&
          [1, 2, 3, 5, 6, 7].includes(n)
        ) {
          // If yes, mark Switch as needed and break loop
          Switch = true;
          break;
        } else if (
          n == 0 &&
          parseInt(x.innerHTML.toLowerCase()) >
          parseInt(y.innerHTML.toLowerCase())
        ) {
          // If yes, mark Switch as needed and break loop
          Switch = true;
          break;
        } else if (n == 4 && x_due > y_due) {
          // If yes, mark Switch as needed and break loop
          Switch = true;
          break;
        }
      } else if (direction == "descending") {
        // Check direction
        if (
          x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase() &&
          [1, 2, 3, 5, 6, 7].includes(n)
        ) {
          // If yes, mark Switch as needed and break loop
          Switch = true;
          break;
        } else if (
          n == 0 &&
          parseInt(x.innerHTML.toLowerCase()) <
          parseInt(y.innerHTML.toLowerCase())
        ) {
          // If yes, mark Switch as needed and break loop
          Switch = true;
          break;
        } else if (n == 4 && x_due < y_due) {
          // If yes, mark Switch as needed and break loop
          Switch = true;
          break;
        }
      }
    }
    if (Switch) {
      // Function to switch rows and mark switch as completed
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;

      // Increase count for each switch
      count++;
    } else {
      // Run while loop again for descending order
      if (count == 0 && direction == "ascending") {
        direction = "descending";
        switching = true;
      }
    }
  }
};

let sort = () => {
  let head_change = Array.from(
    document.getElementsByClassName("tableHeader")[0].children
  );
  for (let i = 0; i < head_change.length - 1; i++) {
    head_change[i].addEventListener("click", () => {
      sort_table(i);
    });
  }
};

let openPdfViewer = (blobUrl) => {
  // VTOP CSP severely restricts blob: and data: in <object> / <embed> tags.
  // We bypass this entirely by opening the Blob URL in a native new browser tab.
  let pdfWindow = window.open(blobUrl, "_blank");
  if (!pdfWindow) {
    // If popups are blocked by the browser, we instruct the background worker to open it
    let a = document.createElement("a");
    a.href = blobUrl;
    a.target = "_blank";
    a.click();
  }
};

let da_detail_page = () => {
  let rows = document.querySelectorAll(".tableContent");
  let csrfInput = document.getElementsByName("_csrf")[0];
  let csrf = csrfInput ? (csrfInput.value || csrfInput.defaultValue) : "";
  let authInput = document.getElementById("authorizedID");
  let authId = authInput ? (authInput.value || authInput.defaultValue) : "";

  rows.forEach((row, index) => {
    let studentDaBtn = row.querySelector("button#downloadStudentDA");

    if (studentDaBtn) {
      let container = studentDaBtn.parentElement;
      if (container.querySelector(".view-pdf-btn")) return;

      container.style.display = "flex";
      container.style.justifyContent = "center";
      container.style.alignItems = "center";
      container.style.gap = "15px";

      let viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn btn-link bi bi-eye-fill view-pdf-btn";
      viewBtn.title = "View Document Without Downloading";
      viewBtn.style.color = "#0ea5e9";
      viewBtn.style.fontSize = "1.2rem";
      viewBtn.style.padding = "0";
      viewBtn.style.transition = "transform 0.2s, color 0.2s";
      viewBtn.onmouseover = () => {
        viewBtn.style.transform = "scale(1.15)";
        viewBtn.style.color = "#0284c7";
      };
      viewBtn.onmouseout = () => {
        viewBtn.style.transform = "scale(1)";
        viewBtn.style.color = "#0ea5e9";
      };

      let code = studentDaBtn.getAttribute("data-code") || "";
      let classid = studentDaBtn.getAttribute("data-classid") || "";

      // Fallback: Extract from onclick="downloadDA('code', 'classid')"
      if (!code || !classid) {
        let onclickStr = studentDaBtn.getAttribute("onclick") || "";
        let match = onclickStr.match(/'([^']+)'.*?,'([^']+)'/);
        if (match) {
          code = match[1];
          classid = match[2];
        }
      }

      viewBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        let originalClass = viewBtn.className;
        viewBtn.className = "btn btn-link bi bi-hourglass-split view-pdf-btn";
        viewBtn.style.pointerEvents = "none";

        try {
          let daForm = document.getElementById("downloadStudentDAForm");
          let actionUrl = daForm && daForm.getAttribute("action") ? daForm.getAttribute("action") : "examinations/downloadSTudentDA/";
          let formData = new URLSearchParams();

          if (daForm) {
            // Write exact variables to the form temporarily
            let formCode1 = document.getElementById("code1");
            let formClassId1 = document.getElementById("classId1");
            if (formCode1) formCode1.value = code;
            if (formClassId1) formClassId1.value = classid;

            // Reconstruct the exact payload VTOP would send
            let fd = new FormData(daForm);
            for (let [k, v] of fd.entries()) {
              formData.append(k, v);
            }
          } else {
            // Fallback
            formData.append("authorizedID", authId);
            formData.append("code1", code);
            formData.append("classId1", classid);
            if (csrf) formData.append("_csrf", csrf);
          }

          let res = await fetch(actionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: formData,
          });

          if (res.ok) {
            let blob = await res.blob();
            if (blob.type === "application/octet-stream" || !blob.type) {
              blob = new Blob([blob], { type: "application/pdf" });
            }

            let blobUrl = URL.createObjectURL(blob);
            openPdfViewer(blobUrl);

            // Clean up the blob URL from memory after sufficient time
            // since the new tab needs a moment to load it.
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 5000);
          } else {
            console.error("Fetch failed. Status:", res.status, "Params:", { code, classid, authId, actionUrl });
            alert("Failed to fetch document! Please try refreshing the page.");
          }
        } catch (error) {
          console.error("Error viewing document:", error);
          alert("Error viewing document. Please try again.");
        } finally {
          viewBtn.className = originalClass;
          viewBtn.style.pointerEvents = "auto";
        }
      };

      container.insertBefore(viewBtn, studentDaBtn);
    }
  });
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "da_upload") {
    try {
      if (da_upload && document.getElementById("semesterSubId")) {
        da_page();
      }
    } catch (error) {
      // console.log(error);
    }
  }
});

// A MutationObserver to handle dynamically loaded DA Detail Pages
// because the navigation inside DA happens via AJAX without a full page reload or extension message.
let daDetailObserver = new MutationObserver(() => {
  if (document.getElementById("downloadStudentDAForm")) {
    da_detail_page();
  }
});

daDetailObserver.observe(document.body, { childList: true, subtree: true });
