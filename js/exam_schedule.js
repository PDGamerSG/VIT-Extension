/**
 * VTop+ — Exam Schedule Beautifier
 * Parses the VTOP exam schedule table and renders a clean, table-based view.
 */

(() => {
	const MARKER_ID = "vit-ext-exam-schedule";

	// ── 1. Parse the existing exam schedule table ──────────────────────
	const parseExamSchedule = () => {
		const container = document.getElementById("fixedTableContainer");
		if (!container) return null;

		const table = container.querySelector("table.customTable");
		if (!table) return null;

		const rows = Array.from(table.querySelectorAll("tr"));
		const sections = {}; // { "FAT": [...], "CAT1": [...], "CAT2": [...] }
		let currentSection = null;

		for (const row of rows) {
			// Section header row
			const panelHead = row.querySelector("td.panelHead-secondary");
			if (panelHead) {
				currentSection = panelHead.textContent.trim();
				sections[currentSection] = [];
				continue;
			}

			// Skip table header rows
			if (row.classList.contains("tableHeader")) continue;

			// Data row
			if (!currentSection) continue;
			const cells = Array.from(row.querySelectorAll("td"));
			if (cells.length < 10) continue;

			const sNo = cells[0]?.textContent?.trim();
			if (!sNo || isNaN(parseInt(sNo))) continue; // skip non-data rows

			const entry = {
				sNo:          parseInt(sNo),
				courseCode:   cells[1]?.textContent?.trim() || "",
				courseTitle:  cells[2]?.textContent?.trim() || "",
				courseType:   cells[3]?.textContent?.trim() || "",
				classId:      cells[4]?.textContent?.trim() || "",
				slot:         cells[5]?.textContent?.trim() || "",
				examDate:     cells[6]?.textContent?.trim() || "",
				examSession:  cells[7]?.textContent?.trim() || "",
				reportTime:   cells[8]?.textContent?.trim() || "",
				examTime:     cells[9]?.textContent?.trim() || "",
				venue:        cells[10]?.textContent?.trim().replace(/-/g, "").trim() || "",
				seatLocation: cells[11]?.textContent?.trim().replace(/-/g, "").trim() || "",
				seatNo:       cells[12]?.textContent?.trim().replace(/-/g, "").trim() || "",
			};
			sections[currentSection].push(entry);
		}

		return sections;
	};

	// ── 2. Parse date string to Date object ──────────────────────────────
	const parseDate = (dateStr) => {
		if (!dateStr) return null;
		const parts = dateStr.split("-");
		if (parts.length !== 3) return null;
		const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
		const day = parseInt(parts[0]);
		const month = months[parts[1]];
		const year = parseInt(parts[2]);
		if (isNaN(day) || month === undefined || isNaN(year)) return null;
		return new Date(year, month, day);
	};

	// ── 3. Format countdown to a date ───────────────────────────────────
	const getCountdown = (dateStr) => {
		const d = parseDate(dateStr);
		if (!d) return null;
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		d.setHours(0, 0, 0, 0);
		const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
		if (diff < 0) return null;
		if (diff === 0) return "Today";
		if (diff === 1) return "Tomorrow";
		return `${diff} days`;
	};

	// ── 4. Session label ─────────────────────────────────────────────────
	const sessionLabel = (s) => {
		if (!s) return "";
		if (s.startsWith("FN")) return "Forenoon";
		if (s.startsWith("AN")) return "Afternoon";
		return s;
	};

	// ── 5. Check if all exams in a section are past ─────────────────────
	const isSectionDone = (exams) => {
		const now = new Date(); now.setHours(0, 0, 0, 0);
		const withDate = exams.filter(e => e.examDate);
		if (withDate.length === 0) return false;
		return withDate.every(e => {
			const d = parseDate(e.examDate);
			return d && d < now;
		});
	};

	// ── 6. Render the beautified table view ──────────────────────────────
	const renderExamSchedule = (sections) => {
		const wrapper = document.createElement("div");
		wrapper.id = MARKER_ID;

		const style = document.createElement("style");
		style.textContent = `
			#${MARKER_ID} {
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				margin: 16px 0 24px;
			}
			#${MARKER_ID} .es-header {
				display: flex;
				align-items: center;
				gap: 10px;
				margin-bottom: 16px;
				flex-wrap: wrap;
			}
			#${MARKER_ID} .es-title {
				font-size: 18px;
				font-weight: 700;
				color: #0f172a;
				margin: 0;
			}
			/* Filter tabs */
			#${MARKER_ID} .es-tabs {
				display: flex;
				align-items: center;
				gap: 4px;
				margin-bottom: 16px;
				flex-wrap: wrap;
				border-bottom: 1px solid #e2e8f0;
				padding-bottom: 0;
			}
			#${MARKER_ID} .es-tab {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				padding: 7px 14px;
				font-size: 13px;
				font-weight: 500;
				color: #64748b;
				cursor: pointer;
				border: none;
				background: transparent;
				border-bottom: 2px solid transparent;
				margin-bottom: -1px;
				transition: color 0.15s, border-color 0.15s;
				white-space: nowrap;
			}
			#${MARKER_ID} .es-tab:hover { color: #0f172a; }
			#${MARKER_ID} .es-tab.active { color: #0f172a; font-weight: 600; border-bottom-color: #3b82f6; }
			#${MARKER_ID} .es-tab.active.fat-tab { border-bottom-color: #ef4444; }
			#${MARKER_ID} .es-tab.active.cat2-tab { border-bottom-color: #f97316; }
			#${MARKER_ID} .es-tab.active.cat1-tab { border-bottom-color: #3b82f6; }
			#${MARKER_ID} .es-tab-count {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				min-width: 18px;
				height: 18px;
				padding: 0 5px;
				font-size: 10px;
				font-weight: 700;
				border-radius: 9px;
				background: #f1f5f9;
				color: #64748b;
			}
			#${MARKER_ID} .es-tab.fat-tab .es-tab-count { background: #fef2f2; color: #b91c1c; }
			#${MARKER_ID} .es-tab.cat2-tab .es-tab-count { background: #fff7ed; color: #c2410c; }
			#${MARKER_ID} .es-tab.cat1-tab .es-tab-count { background: #eff6ff; color: #1d4ed8; }
			#${MARKER_ID} .es-tab-done {
				font-size: 10px;
				color: #22c55e;
			}
			/* Table wrapper */
			#${MARKER_ID} .es-table-wrap {
				overflow-x: auto;
				-webkit-overflow-scrolling: touch;
				border-radius: 8px;
				border: 1px solid #e2e8f0;
			}
			#${MARKER_ID} .es-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 13px;
			}
			#${MARKER_ID} .es-table thead th {
				background: #f8fafc;
				color: #64748b;
				font-size: 11px;
				font-weight: 600;
				letter-spacing: 0.04em;
				text-transform: uppercase;
				padding: 9px 12px;
				text-align: left;
				border-bottom: 1px solid #e2e8f0;
				white-space: nowrap;
			}
			#${MARKER_ID} .es-table tbody tr {
				border-bottom: 1px solid #f1f5f9;
				transition: background 0.1s;
			}
			#${MARKER_ID} .es-table tbody tr:last-child { border-bottom: none; }
			#${MARKER_ID} .es-table tbody tr:hover { background: #f8fafc; }
			#${MARKER_ID} .es-table tbody tr.past-row { opacity: 0.5; }
			#${MARKER_ID} .es-table td {
				padding: 9px 12px;
				color: #334155;
				vertical-align: middle;
			}
			#${MARKER_ID} .es-table .col-no { color: #94a3b8; font-size: 12px; width: 32px; }
			#${MARKER_ID} .es-table .col-code { font-weight: 600; color: #0f172a; white-space: nowrap; font-size: 12px; }
			#${MARKER_ID} .es-table .col-title { min-width: 160px; }
			#${MARKER_ID} .es-type-badge {
				display: inline-block;
				padding: 2px 6px;
				border-radius: 4px;
				font-size: 10px;
				font-weight: 700;
				letter-spacing: 0.03em;
				white-space: nowrap;
			}
			#${MARKER_ID} .es-type-badge.th { background: #e0f2fe; color: #0369a1; }
			#${MARKER_ID} .es-type-badge.ss { background: #f0fdf4; color: #15803d; }
			#${MARKER_ID} .es-type-badge.oc { background: #faf5ff; color: #7c3aed; }
			#${MARKER_ID} .es-type-badge.lo { background: #fef2f2; color: #b91c1c; }
			#${MARKER_ID} .es-exam-badge {
				display: inline-block;
				padding: 2px 7px;
				border-radius: 4px;
				font-size: 10px;
				font-weight: 700;
				letter-spacing: 0.03em;
			}
			#${MARKER_ID} .es-exam-badge.fat { background: #fef2f2; color: #b91c1c; }
			#${MARKER_ID} .es-exam-badge.cat2 { background: #fff7ed; color: #c2410c; }
			#${MARKER_ID} .es-exam-badge.cat1 { background: #eff6ff; color: #1d4ed8; }
			#${MARKER_ID} .es-date-cell { white-space: nowrap; }
			#${MARKER_ID} .es-countdown {
				display: inline-block;
				margin-left: 5px;
				font-size: 10px;
				font-weight: 600;
				padding: 1px 6px;
				border-radius: 8px;
				white-space: nowrap;
			}
			#${MARKER_ID} .es-countdown.today { background: #fef9c3; color: #854d0e; }
			#${MARKER_ID} .es-countdown.tomorrow { background: #fef2f2; color: #b91c1c; }
			#${MARKER_ID} .es-countdown.soon { background: #fff7ed; color: #c2410c; }
			#${MARKER_ID} .es-countdown.upcoming { background: #eff6ff; color: #1e40af; }
			#${MARKER_ID} .es-seat-info {
				font-size: 11px;
				color: #475569;
				white-space: nowrap;
			}
			#${MARKER_ID} .es-empty {
				text-align: center;
				padding: 24px;
				color: #94a3b8;
				font-size: 13px;
			}
			/* Section divider row in "All" view */
			#${MARKER_ID} .es-section-row td {
				background: #f8fafc;
				font-size: 11px;
				font-weight: 700;
				letter-spacing: 0.06em;
				text-transform: uppercase;
				padding: 5px 12px;
				color: #64748b;
				border-bottom: 1px solid #e2e8f0;
			}
		`;
		wrapper.appendChild(style);

		// Header
		const header = document.createElement("div");
		header.className = "es-header";
		header.innerHTML = `<h2 class="es-title">Exam Schedule</h2>`;
		wrapper.appendChild(header);

		// Build tabs: All | FAT | CAT2 | CAT1
		const TAB_ORDER = ["All", "FAT", "CAT2", "CAT1"];
		const tabBar = document.createElement("div");
		tabBar.className = "es-tabs";

		const tableContainer = document.createElement("div");
		tableContainer.id = MARKER_ID + "-body";

		// ── makeRow defined FIRST (before renderTable uses it) ──────────
		const makeRow = (exam, sKey, showExamCol) => {
			const now = new Date(); now.setHours(0, 0, 0, 0);
			const examDateObj = parseDate(exam.examDate);
			const isPast = examDateObj && examDateObj < now;
			const tr = document.createElement("tr");
			if (isPast) tr.classList.add("past-row");

			let cdHtml = "";
			if (!isPast && exam.examDate) {
				const cd = getCountdown(exam.examDate);
				if (cd) {
					const cls = cd === "Today" ? "today" : cd === "Tomorrow" ? "tomorrow" : parseInt(cd) <= 7 ? "soon" : "upcoming";
					cdHtml = `<span class="es-countdown ${cls}">${cd}</span>`;
				}
			}

			const sKeyLower = sKey.toLowerCase();
			const typeClass = (exam.courseType || "").toLowerCase();
			const seatParts = [exam.venue, exam.seatLocation, exam.seatNo ? "#" + exam.seatNo : null].filter(Boolean);
			const seatHtml = seatParts.length ? `<span class="es-seat-info">${seatParts.join(" · ")}</span>` : `<span style="color:#cbd5e1">—</span>`;
			const examBadgeHtml = showExamCol
				? `<td><span class="es-exam-badge ${sKeyLower}">${sKey}</span></td>` : "";

			tr.innerHTML = `
				<td class="col-no">${exam.sNo}</td>
				<td class="col-code">${exam.courseCode}</td>
				<td class="col-title">${exam.courseTitle}</td>
				<td><span class="es-type-badge ${typeClass}">${exam.courseType || "—"}</span></td>
				<td style="white-space:nowrap;font-size:12px;color:#64748b">${exam.slot || "—"}</td>
				${examBadgeHtml}
				<td class="es-date-cell">${exam.examDate || "<span style='color:#cbd5e1'>—</span>"}${cdHtml}</td>
				<td style="white-space:nowrap;font-size:12px">${sessionLabel(exam.examSession) || "—"}</td>
				<td style="white-space:nowrap;font-size:12px">${exam.examTime || "—"}</td>
				<td>${seatHtml}</td>
			`;
			return tr;
		};

		const renderTable = (tabKey) => {
			tableContainer.innerHTML = "";
			const wrap = document.createElement("div");
			wrap.className = "es-table-wrap";
			const table = document.createElement("table");
			table.className = "es-table";

			const showExamCol = tabKey === "All";
			const colCount = showExamCol ? 10 : 9;

			const thead = document.createElement("thead");
			thead.innerHTML = `<tr>
				<th class="col-no">#</th>
				<th>Course Code</th>
				<th>Course Title</th>
				<th>Type</th>
				<th>Slot</th>
				${showExamCol ? "<th>Exam</th>" : ""}
				<th>Date</th>
				<th>Session</th>
				<th>Time</th>
				<th>Venue / Seat</th>
			</tr>`;
			table.appendChild(thead);

			const tbody = document.createElement("tbody");
			let rowCount = 0;

			if (tabKey === "All") {
				const SECTION_ORDER = ["FAT", "CAT2", "CAT1"];
				const otherSections = Object.keys(sections).filter(k => !SECTION_ORDER.includes(k));
				const orderedKeys = [...SECTION_ORDER.filter(k => sections[k]), ...otherSections.filter(k => sections[k])];

				for (const sKey of orderedKeys) {
					const exams = sections[sKey] || [];
					if (!exams.length) continue;
					const divRow = document.createElement("tr");
					divRow.className = "es-section-row";
					divRow.innerHTML = `<td colspan="${colCount}">${sKey}${isSectionDone(exams) ? " ✓ Done" : ""}</td>`;
					tbody.appendChild(divRow);
					for (const exam of exams) {
						tbody.appendChild(makeRow(exam, sKey, true));
						rowCount++;
					}
				}
			} else {
				const exams = sections[tabKey] || [];
				for (const exam of exams) {
					tbody.appendChild(makeRow(exam, tabKey, false));
					rowCount++;
				}
			}

			if (rowCount === 0) {
				const emptyRow = document.createElement("tr");
				emptyRow.innerHTML = `<td colspan="${colCount}" class="es-empty">No exams found</td>`;
				tbody.appendChild(emptyRow);
			}

			table.appendChild(tbody);
			wrap.appendChild(table);
			tableContainer.appendChild(wrap);
		};

		// Build tab buttons — use event delegation to avoid any closure issues
		for (const tabKey of TAB_ORDER) {
			if (tabKey !== "All" && !sections[tabKey]) continue;

			const btn = document.createElement("button");
			const tabClass = tabKey === "FAT" ? "fat-tab" : tabKey === "CAT2" ? "cat2-tab" : tabKey === "CAT1" ? "cat1-tab" : "";
			btn.className = `es-tab${tabClass ? " " + tabClass : ""}${tabKey === "All" ? " active" : ""}`;
			btn.dataset.tab = tabKey;

			const count = tabKey === "All"
				? Object.values(sections).reduce((s, a) => s + a.length, 0)
				: (sections[tabKey] || []).length;
			const isDone = tabKey !== "All" && sections[tabKey] && isSectionDone(sections[tabKey]);
			btn.innerHTML = `${tabKey}<span class="es-tab-count">${count}</span>${isDone ? '<span class="es-tab-done">✓</span>' : ""}`;
			tabBar.appendChild(btn);
		}

		// Single delegated click handler on the tab bar
		tabBar.addEventListener("click", (e) => {
			const btn = e.target.closest(".es-tab");
			if (!btn) return;
			const tabKey = btn.dataset.tab;
			if (!tabKey) return;
			tabBar.querySelectorAll(".es-tab").forEach(b => b.classList.remove("active"));
			btn.classList.add("active");
			renderTable(tabKey);
		});

		wrapper.appendChild(tabBar);
		renderTable("All");
		wrapper.appendChild(tableContainer);

		return wrapper;
	};

	// ── 7. Main entry point ──────────────────────────────────────────────
	const beautifyExamSchedule = () => {
		if (document.getElementById(MARKER_ID)) return;

		const container = document.getElementById("fixedTableContainer");
		if (!container) return;

		const sections = parseExamSchedule();
		if (!sections || Object.keys(sections).length === 0) return;

		// Remove "Exam Reporting Time" notice from the VTOP DOM
		document.querySelectorAll(".ps-4 span, .form-group span").forEach(span => {
			if (span.textContent.includes("Exam Reporting Time") || span.textContent.includes("Reporting Time")) {
				const parent = span.closest(".ps-4") || span.closest(".form-group") || span.parentElement;
				if (parent) parent.style.display = "none";
			}
		});

		const newView = renderExamSchedule(sections);

		// Insert above the original table container
		container.parentElement.insertBefore(newView, container);

		// Hide the original ugly table (but keep the semester selector form intact)
		container.style.display = "none";
	};

	// Listen for extension message
	chrome.runtime.onMessage.addListener((request) => {
		if (request.message === "exam_schedule") {
			// Remove old view so we re-render fresh data
			const old = document.getElementById(MARKER_ID);
			if (old) old.remove();
			const oldContainer = document.getElementById("fixedTableContainer");
			if (oldContainer) oldContainer.style.display = "";

			setTimeout(() => {
				try { beautifyExamSchedule(); } catch (e) {
					console.error("VTop+: Exam schedule beautifier error", e);
				}
			}, 400);
		}
	});

	// MutationObserver fallback for AJAX-loaded content
	const examObserver = new MutationObserver(() => {
		if (
			document.getElementById("fixedTableContainer") &&
			!document.getElementById(MARKER_ID)
		) {
			setTimeout(() => {
				try { beautifyExamSchedule(); } catch (e) { /* silent */ }
			}, 300);
		}
	});

	examObserver.observe(document.body, { childList: true, subtree: true });

	// Also hook into the semester search form to re-render after semester change
	const hookSearchForm = () => {
		const form = document.getElementById("examSchedule");
		if (!form || form.dataset.vitHooked) return;
		form.dataset.vitHooked = "1";
		form.addEventListener("submit", () => {
			// Remove old beautified view; background.js will send exam_schedule message
			const old = document.getElementById(MARKER_ID);
			if (old) old.remove();
			const oldContainer = document.getElementById("fixedTableContainer");
			if (oldContainer) oldContainer.style.display = "";
		});
	};

	// Try to hook immediately and via observer
	hookSearchForm();
	const formObserver = new MutationObserver(() => hookSearchForm());
	formObserver.observe(document.body, { childList: true, subtree: true });
})();
