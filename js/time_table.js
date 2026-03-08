/**
 * VIT Extension — Timetable Beautifier
 * Parses the raw VTOP timetable grid and renders a clean, compact weekly view.
 */

(() => {
	// Prevent double-injection
	if (document.getElementById("vit-ext-timetable")) return;

	// ── 1. Parse the registration table for course details ──────────────
	const parseCourseDetails = () => {
		const courses = {}; // keyed by course code, e.g. "ISWE205L"
		const tbody = document.querySelector("tbody");
		if (!tbody) return courses;

		const rows = tbody.querySelectorAll("tr");
		for (const row of rows) {
			const cells = row.children;
			if (cells.length < 9) continue;

			// Column 2 = Course (code + title), Column 7 = Slot/Venue, Column 8 = Faculty
			const courseCell = cells[2]?.innerText?.trim() || "";
			const slotVenueCell = cells[7]?.innerText?.trim() || "";

			if (!courseCell || !slotVenueCell) continue;

			// Parse "ISWE205L - Computer Networks" from the course cell
			const match = courseCell.match(/^(\S+)\s*-\s*(.+)/);
			if (!match) continue;

			const code = match[1].trim();
			const title = match[2].split("\n")[0].trim(); // grab first line only

			// Parse slot/venue: "A1+TA1 - \nSJT109" or "L37+L38 - \nSJTG18"
			const svParts = slotVenueCell.replace(/[\r\n]+/g, " ").split("-");
			const slotStr = (svParts[0] || "").trim();
			const venue = (svParts[1] || "").trim();

			courses[code] = { code, title, venue, slots: slotStr };
		}
		return courses;
	};

	// ── 2. Parse the #timeTableStyle grid for slot placements ───────────
	const parseGrid = (courseMap) => {
		const ttTable = document.getElementById("timeTableStyle");
		if (!ttTable) return null;

		const allRows = ttTable.querySelectorAll("tr");

		// The first 4 rows are headers (Theory start/end, Lab start/end)
		// Then pairs of rows per day: (THEORY row, LAB row)
		// Day rows have the day name in the first cell with rowspan=2

		const dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
		// Map to store: { dayName: { theory: [cells], lab: [cells] } }
		const dayData = {};

		let currentDay = null;
		let rowType = null; // "theory" or "lab"

		for (let r = 0; r < allRows.length; r++) {
			const row = allRows[r];
			const cells = Array.from(row.children);
			if (cells.length < 3) continue;

			// Check if first cell is a day name
			const firstText = cells[0]?.innerText?.trim().toUpperCase();
			const secondText = cells[1]?.innerText?.trim().toUpperCase();

			if (dayOrder.includes(firstText)) {
				currentDay = firstText;
				rowType = secondText === "THEORY" ? "theory" : "lab";
				// The actual slot cells start at index 2
				dayData[currentDay] = dayData[currentDay] || { theory: [], lab: [] };
				dayData[currentDay][rowType] = cells.slice(2);
			} else if (firstText === "THEORY" || firstText === "LAB") {
				rowType = firstText.toLowerCase();
				if (currentDay) {
					dayData[currentDay] = dayData[currentDay] || { theory: [], lab: [] };
					dayData[currentDay][rowType] = cells.slice(1);
				}
			}
		}

		// Now extract course info from pink cells
		// Each cell with bgcolor="#FC6C85" contains text like "A1-ISWE205L-TH-SJT109-ALL"
		const schedule = {}; // { "MON": { theory: [...], lab: [...] } }

		for (const day of dayOrder) {
			if (!dayData[day]) continue;
			schedule[day] = { theory: [], lab: [] };

			for (const type of ["theory", "lab"]) {
				const cells = dayData[day][type] || [];
				for (const cell of cells) {
					const bg = (cell.getAttribute("bgcolor") || "").toUpperCase();
					const text = cell.innerText?.trim() || "";

					if (bg === "#FC6C85" && text && text !== "-") {
						// Parse: "A1-ISWE205L-TH-SJT109-ALL"
						const parts = text.split("-");
						const slot = parts[0]?.trim() || "";
						const code = parts[1]?.trim() || "";
						const classType = parts[2]?.trim() || ""; // TH, LO, SS
						const venue = parts[3]?.trim() || "";

						const courseInfo = courseMap[code];
						const title = courseInfo?.title || code;

						schedule[day][type].push({
							slot, code, classType, venue, title,
							isLab: type === "lab" || classType === "LO",
						});
					} else {
						// Empty or non-assigned slot
						schedule[day][type].push(null);
					}
				}
			}
		}
		return schedule;
	};

	// ── 3. Time row definitions ─────────────────────────────────────────
	// Theory slots are 1-hour each; lab slots come in PAIRS of consecutive
	// 50-min slots forming one ~100-min session.
	// Each row has a type:
	//   "theory" → check daySchedule.theory[idx]
	//   "lab"    → check daySchedule.lab[idxA] OR daySchedule.lab[idxB] (pair = one session)
	//   "lunch"  → separator
	//
	// Theory column indices → actual times:
	//   0=08:00-08:50  1=09:00-09:50  2=10:00-10:50  3=11:00-11:50  4=12:00-12:50
	//   5=(padding)    6=(lunch)
	//   7=14:00-14:50  8=15:00-15:50  9=16:00-16:50  10=17:00-17:50  11=18:00-18:50
	//   12=18:51-19:00 (transition)   13=19:01-19:50
	//
	// Lab column indices → actual times:
	//   0=08:00-08:50  1=08:51-09:40  2=09:51-10:40  3=10:41-11:30
	//   4=11:40-12:30  5=12:31-13:20  6=(lunch)
	//   7=14:00-14:50  8=14:51-15:40  9=15:51-16:40  10=16:41-17:30
	//   11=17:40-18:30 12=18:31-19:20 13=(padding)
	//
	// Lab pairs (each pair = one lab session):
	//   AM:  [0,1]=08:00-09:40  [2,3]=09:51-11:30  [4,5]=11:40-13:20
	//   PM:  [7,8]=14:00-15:40  [9,10]=15:51-17:30  [11,12]=17:40-19:20

	const ALL_TIME_ROWS = [
		// ── Morning slots ──
		{ label: "8:00–8:50",   type: "theory", idx: 0 },
		{ label: "8:00–9:40",   type: "lab",    idxA: 0, idxB: 1 },
		{ label: "9:00–9:50",   type: "theory", idx: 1 },
		{ label: "9:51–11:30",  type: "lab",    idxA: 2, idxB: 3 },
		{ label: "10:00–10:50", type: "theory", idx: 2 },
		{ label: "11:00–11:50", type: "theory", idx: 3 },
		{ label: "11:40–13:20", type: "lab",    idxA: 4, idxB: 5 },
		{ label: "12:00–12:50", type: "theory", idx: 4 },
		// ── Lunch ──
		{ label: "Lunch",       type: "lunch" },
		// ── Afternoon slots ──
		{ label: "14:00–14:50", type: "theory", idx: 7 },
		{ label: "14:00–15:40", type: "lab",    idxA: 7, idxB: 8 },
		{ label: "15:00–15:50", type: "theory", idx: 8 },
		{ label: "15:51–17:30", type: "lab",    idxA: 9, idxB: 10 },
		{ label: "16:00–16:50", type: "theory", idx: 9 },
		{ label: "17:00–17:50", type: "theory", idx: 10 },
		{ label: "17:40–19:20", type: "lab",    idxA: 11, idxB: 12 },
		{ label: "18:00–18:50", type: "theory", idx: 11 },
		{ label: "19:01–19:50", type: "theory", idx: 13 },
	];

	// ── 4. Render the beautiful timetable ───────────────────────────────
	const renderTimetable = (schedule) => {
		const activeDays = ["MON", "TUE", "WED", "THU", "FRI"];
		// Check if SAT has any classes
		if (schedule["SAT"]) {
			const satTheory = (schedule["SAT"].theory || []).some(c => c !== null);
			const satLab = (schedule["SAT"].lab || []).some(c => c !== null);
			if (satTheory || satLab) activeDays.push("SAT");
		}

		// Detect schedule type
		let hasMorning = false, hasEvening = false;
		for (const day of activeDays) {
			const ds = schedule[day];
			if (!ds) continue;
			// Morning: theory indices 0-4 or lab indices 0-5
			if ((ds.theory || []).slice(0, 5).some(c => c !== null)) hasMorning = true;
			if ((ds.lab || []).slice(0, 6).some(c => c !== null)) hasMorning = true;
			// Evening: theory indices 7-13 or lab indices 7-12
			if ((ds.theory || []).slice(7, 14).some(c => c !== null)) hasEvening = true;
			if ((ds.lab || []).slice(7, 13).some(c => c !== null)) hasEvening = true;
		}
		const scheduleType = hasMorning && hasEvening ? "Full Day" : hasMorning ? "Morning Batch" : hasEvening ? "Evening Batch" : "";

		const dayLabels = {
			MON: "Monday", TUE: "Tuesday", WED: "Wednesday",
			THU: "Thursday", FRI: "Friday", SAT: "Saturday",
		};

		// Create container
		const container = document.createElement("div");
		container.id = "vit-ext-timetable";

		// Inject styles
		const style = document.createElement("style");
		style.textContent = `
      #vit-ext-timetable {
        margin: 16px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #vit-ext-timetable .tt-title {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #vit-ext-timetable .tt-title span {
        font-size: 13px;
        font-weight: 400;
        color: #64748b;
      }
      #vit-ext-timetable table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      }
      #vit-ext-timetable th {
        background: #f8fafc;
        color: #334155;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 10px 6px;
        border-bottom: 2px solid #e2e8f0;
        border-right: 1px solid #e2e8f0;
        text-align: center;
      }
      #vit-ext-timetable th:first-child {
        width: 100px;
      }
      #vit-ext-timetable td {
        padding: 6px 5px;
        border-bottom: 1px solid #f1f5f9;
        border-right: 1px solid #f1f5f9;
        text-align: center;
        vertical-align: middle;
        font-size: 11px;
        min-height: 48px;
        transition: background 0.15s;
      }
      #vit-ext-timetable td:first-child {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
        font-size: 11px;
        border-right: 1px solid #e2e8f0;
        white-space: nowrap;
      }
      #vit-ext-timetable td.has-class {
        background: #ffffff;
      }
      #vit-ext-timetable td.has-class:hover {
        background: #f0f9ff;
      }
      #vit-ext-timetable td.is-lab {
        background: #fef2f2;
      }
      #vit-ext-timetable td.is-lab:hover {
        background: #fee2e2;
      }
      #vit-ext-timetable td.is-lunch {
        background: #f8fafc;
        color: #94a3b8;
        font-weight: 500;
        font-style: italic;
        font-size: 11px;
        border-bottom: 1px solid #e2e8f0;
      }
      #vit-ext-timetable td.empty-cell {
        color: #cbd5e1;
      }
      #vit-ext-timetable .course-name {
        font-weight: 600;
        color: #1e293b;
        font-size: 11px;
        line-height: 1.3;
        margin-bottom: 2px;
      }
      #vit-ext-timetable .course-venue {
        color: #64748b;
        font-size: 10px;
        font-weight: 500;
      }
      #vit-ext-timetable .course-type {
        display: inline-block;
        font-size: 9px;
        font-weight: 600;
        padding: 1px 5px;
        border-radius: 3px;
        margin-top: 2px;
      }
      #vit-ext-timetable .type-theory {
        background: #e0f2fe;
        color: #0369a1;
      }
      #vit-ext-timetable .type-lab {
        background: #fee2e2;
        color: #b91c1c;
      }
      #vit-ext-timetable .type-soft {
        background: #f0fdf4;
        color: #15803d;
      }
      #vit-ext-timetable .legend {
        display: flex;
        gap: 16px;
        margin-top: 10px;
        font-size: 11px;
        color: #64748b;
        flex-wrap: wrap;
      }
      #vit-ext-timetable .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      #vit-ext-timetable .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }
      @media (max-width: 700px) {
        #vit-ext-timetable { overflow-x: auto; }
        #vit-ext-timetable table { min-width: 480px; }
        #vit-ext-timetable th:first-child { width: 70px; }
      }
    `;
		container.appendChild(style);

		// Title
		const title = document.createElement("div");
		title.className = "tt-title";
		title.textContent = "📅 Weekly Schedule";
		const subtitle = document.createElement("span");
		subtitle.textContent = scheduleType ? `(${scheduleType} · Enhanced View)` : "(Enhanced View)";
		title.appendChild(subtitle);
		container.appendChild(title);

		// Build table
		const table = document.createElement("table");

		// Header row
		const thead = document.createElement("thead");
		const headerRow = document.createElement("tr");

		const timeHeader = document.createElement("th");
		timeHeader.textContent = "Time";
		headerRow.appendChild(timeHeader);

		for (const day of activeDays) {
			const th = document.createElement("th");
			th.textContent = dayLabels[day];
			headerRow.appendChild(th);
		}
		thead.appendChild(headerRow);
		table.appendChild(thead);

		// Filter to only rows that have content in at least one active day
		// (always keep the lunch row)
		const getCourseForRow = (row, ds) => {
			if (!ds) return null;
			if (row.type === "theory") return ds.theory[row.idx] || null;
			if (row.type === "lab")    return ds.lab[row.idxA] || ds.lab[row.idxB] || null;
			return null;
		};

		const visibleRows = ALL_TIME_ROWS.filter(row => {
			if (row.type === "lunch") return true;
			return activeDays.some(day => getCourseForRow(row, schedule[day]) !== null);
		});

		// Body
		const tbody = document.createElement("tbody");

		for (const timeRow of visibleRows) {
			const tr = document.createElement("tr");

			// Time label cell
			const tdTime = document.createElement("td");
			tdTime.textContent = timeRow.label;
			if (timeRow.type === "lunch") tdTime.className = "is-lunch";
			tr.appendChild(tdTime);

			if (timeRow.type === "lunch") {
				for (const day of activeDays) {
					const td = document.createElement("td");
					td.className = "is-lunch";
					tr.appendChild(td);
				}
				tbody.appendChild(tr);
				continue;
			}

			for (const day of activeDays) {
				const td = document.createElement("td");
				const ds = schedule[day];
				const courseInfo = getCourseForRow(timeRow, ds);

				if (courseInfo) {
					const isLab = courseInfo.isLab;
					td.className = isLab ? "has-class is-lab" : "has-class";

					const nameDiv = document.createElement("div");
					nameDiv.className = "course-name";
					nameDiv.textContent = courseInfo.title;
					td.appendChild(nameDiv);

					const venueDiv = document.createElement("div");
					venueDiv.className = "course-venue";
					venueDiv.textContent = courseInfo.venue;
					td.appendChild(venueDiv);

					const typeSpan = document.createElement("span");
					typeSpan.className = "course-type";
					if (courseInfo.classType === "LO") {
						typeSpan.classList.add("type-lab");
						typeSpan.textContent = "LAB";
					} else if (courseInfo.classType === "SS") {
						typeSpan.classList.add("type-soft");
						typeSpan.textContent = "SOFT";
					} else {
						typeSpan.classList.add("type-theory");
						typeSpan.textContent = "THEORY";
					}
					td.appendChild(typeSpan);
				} else {
					td.className = "empty-cell";
					td.textContent = "—";
				}

				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}

		table.appendChild(tbody);
		container.appendChild(table);

		// Legend
		const legend = document.createElement("div");
		legend.className = "legend";
		const items = [
			{ color: "#e0f2fe", label: "Theory" },
			{ color: "#fee2e2", label: "Lab" },
			{ color: "#f0fdf4", label: "Soft Skill" },
		];
		for (const item of items) {
			const el = document.createElement("div");
			el.className = "legend-item";
			const dot = document.createElement("div");
			dot.className = "legend-dot";
			dot.style.background = item.color;
			dot.style.border = "1px solid #e2e8f0";
			el.appendChild(dot);
			const lbl = document.createElement("span");
			lbl.textContent = item.label;
			el.appendChild(lbl);
			legend.appendChild(el);
		}
		container.appendChild(legend);

		return container;
	};

	// ── 5. Clean up the registration table (L T P J C → Credits) ─────
	const cleanupRegistrationTable = () => {
		const tbody = document.querySelector("tbody");
		if (!tbody) return;

		const rows = tbody.querySelectorAll("tr");
		for (const row of rows) {
			const cells = row.children;
			if (cells.length < 5) continue;

			const cell = cells[3]; // L T P J C column (index 3)
			const text = cell.innerText?.trim() || "";

			// Check if this is the header row
			if (cell.tagName === "TH") {
				// Replace "L T P J C" header with "Credits"
				if (text.includes("L") && text.includes("C")) {
					cell.textContent = "Credits";
					cell.style.width = "5%";
				}
			} else {
				// Data row: "3 0 0 0 3.0" → keep last value "3.0"
				const parts = text.split(/\s+/);
				if (parts.length >= 2) {
					const credit = parts[parts.length - 1];
					const p = cell.querySelector("p");
					if (p) {
						p.textContent = credit;
					} else {
						cell.textContent = credit;
					}
				}
			}
		}
	};

	// ── 6. Main entry point ─────────────────────────────────────────────
	const beautifyTimetable = () => {
		const ttTable = document.getElementById("timeTableStyle");
		if (!ttTable) return;

		// Already injected?
		if (document.getElementById("vit-ext-timetable")) return;

		// Clean up the registration table
		cleanupRegistrationTable();

		const courseMap = parseCourseDetails();
		const schedule = parseGrid(courseMap);
		if (!schedule) return;

		const newView = renderTimetable(schedule);

		// Insert above the original timetable container
		const ttContainer = ttTable.closest(".table-responsive") || ttTable.closest("#ttview") || ttTable.parentElement;
		ttContainer.parentElement.insertBefore(newView, ttContainer);

		// Hide original grid (user can still scroll down to see it)
		ttContainer.style.display = "none";
	};

	// Listen for the extension message
	chrome.runtime.onMessage.addListener((request) => {
		if (request.message === "time_table") {
			// Use a small delay to ensure the dynamic content has loaded
			setTimeout(() => {
				try {
					beautifyTimetable();
				} catch (e) {
					console.error("VIT Extension: Timetable beautifier error", e);
				}
			}, 500);
		}
	});

	// Also try to run on a MutationObserver in case the timetable loads via AJAX
	const ttObserver = new MutationObserver(() => {
		if (document.getElementById("timeTableStyle") && !document.getElementById("vit-ext-timetable")) {
			setTimeout(() => {
				try {
					beautifyTimetable();
				} catch (e) {
					console.error("VIT Extension: Timetable beautifier error", e);
				}
			}, 300);
		}
	});

	ttObserver.observe(document.body, { childList: true, subtree: true });
})();
