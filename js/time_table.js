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

	// ── 3. Build the slot-index to time-label mapping ───────────────────
	// Theory has these time columns (matching VTOP grid order):
	const theoryTimes = [
		"8:00 - 8:50", "9:00 - 9:50", "10:00 - 10:50",
		"11:00 - 11:50", "12:00 - 12:50",
		"-",       // padding column
		"LUNCH",
		"2:00 - 2:50", "3:00 - 3:50", "4:00 - 4:50",
		"5:00 - 5:50", "6:00 - 6:50", "6:51 - 7:00", "7:01 - 7:50",
	];

	const labTimes = [
		"8:00 - 8:50", "8:51 - 9:40", "9:51 - 10:40",
		"10:41 - 11:30", "11:40 - 12:30", "12:31 - 1:20",
		"LUNCH",
		"2:00 - 2:50", "2:51 - 3:40", "3:51 - 4:40",
		"4:41 - 5:30", "5:40 - 6:30", "6:31 - 7:20",
		"-",
	];

	// Unified time rows for the compact view. We combine theory + lab into
	// logical blocks. Each entry: { label, theoryIdx, labIdx }
	// theoryIdx/labIdx = index into the theory/lab cell arrays for that day
	const timeRows = [
		{ label: "8:00 - 8:50", theoryIdx: 0, labIdxStart: 0, labIdxEnd: 0 },
		{ label: "9:00 - 9:50", theoryIdx: 1, labIdxStart: 1, labIdxEnd: 1 },
		{ label: "10:00 - 10:50", theoryIdx: 2, labIdxStart: 2, labIdxEnd: 2 },
		{ label: "11:00 - 11:50", theoryIdx: 3, labIdxStart: 3, labIdxEnd: 3 },
		{ label: "12:00 - 12:50", theoryIdx: 4, labIdxStart: 4, labIdxEnd: 5 },
		{ label: "LUNCH", isLunch: true },
		{ label: "2:00 - 2:50", theoryIdx: 7, labIdxStart: 7, labIdxEnd: 7 },
		{ label: "3:00 - 3:50", theoryIdx: 8, labIdxStart: 8, labIdxEnd: 8 },
		{ label: "4:00 - 4:50", theoryIdx: 9, labIdxStart: 9, labIdxEnd: 9 },
		{ label: "5:00 - 5:50", theoryIdx: 10, labIdxStart: 10, labIdxEnd: 10 },
		{ label: "6:00 - 6:50", theoryIdx: 11, labIdxStart: 11, labIdxEnd: 11 },
		{ label: "7:00 - 7:50", theoryIdx: 13, labIdxStart: null, labIdxEnd: null },
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
    `;
		container.appendChild(style);

		// Title
		const title = document.createElement("div");
		title.className = "tt-title";
		title.textContent = "📅 Weekly Schedule";
		const subtitle = document.createElement("span");
		subtitle.textContent = "(Enhanced View)";
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

		// Body
		const tbody = document.createElement("tbody");

		for (const timeRow of timeRows) {
			const tr = document.createElement("tr");

			// Time label cell
			const tdTime = document.createElement("td");
			tdTime.textContent = timeRow.label;
			if (timeRow.isLunch) tdTime.className = "is-lunch";
			tr.appendChild(tdTime);

			if (timeRow.isLunch) {
				// Span across all day columns
				for (const day of activeDays) {
					const td = document.createElement("td");
					td.className = "is-lunch";
					td.textContent = "";
					tr.appendChild(td);
				}
				tbody.appendChild(tr);
				continue;
			}

			for (const day of activeDays) {
				const td = document.createElement("td");

				const daySchedule = schedule[day];
				if (!daySchedule) {
					td.className = "empty-cell";
					td.textContent = "—";
					tr.appendChild(td);
					continue;
				}

				// Check theory slot at this index
				let courseInfo = null;
				if (timeRow.theoryIdx !== undefined && timeRow.theoryIdx !== null) {
					const theorySlot = daySchedule.theory[timeRow.theoryIdx];
					if (theorySlot) courseInfo = theorySlot;
				}

				// If no theory hit, check lab slots in this range
				if (!courseInfo && timeRow.labIdxStart !== undefined && timeRow.labIdxStart !== null) {
					const start = timeRow.labIdxStart;
					const end = timeRow.labIdxEnd !== undefined && timeRow.labIdxEnd !== null ? timeRow.labIdxEnd : start;
					for (let li = start; li <= end; li++) {
						const labSlot = daySchedule.lab[li];
						if (labSlot) {
							courseInfo = labSlot;
							break;
						}
					}
				}

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
