/**
 * VIT Extension — Dashboard Enhancements
 * 1. Removes "Last Five Feedback Details" section
 * 2. Adds toggle button to hide/show CGPA section
 * 3. Replaces feedback section with "Class Messages"
 */

(() => {
    const MARKER_ID = "vit-ext-dashboard-done";
    const TOGGLE_ID = "vit-ext-cgpa-toggle";

    const customizeDashboard = () => {
        // Prevent double-injection within the same page load
        if (document.getElementById(MARKER_ID)) return;

        const cgpaCard = findCardByTitle("CGPA and CREDIT Status");
        const proctorCard = findCardByTitle("PROCTOR Message");

        if (!cgpaCard && !proctorCard) return; // Dashboard not loaded yet

        // Place marker INSIDE #b5-pagewrapper so it's cleared on SPA navigation
        const pageWrapper = document.getElementById("b5-pagewrapper");
        const marker = document.createElement("div");
        marker.id = MARKER_ID;
        marker.style.display = "none";
        (pageWrapper || document.body).appendChild(marker);

        // Note: persistent observer keeps running — deduplication is handled by the marker

        // ── Global Aesthetic Upgrades ──
        const vitExtStyle = document.getElementById("vit-ext-dashboard-styles") || document.createElement("style");
        vitExtStyle.id = "vit-ext-dashboard-styles";
        vitExtStyle.textContent = `
            .card {
                border: 1px solid #dee2e6 !important;
                border-radius: 8px !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
                margin-bottom: 20px !important;
                overflow: hidden !important;
                background: #fff !important;
            }
            .card-header {
                background: #f8fafc !important;
                border-bottom: 1px solid #f1f5f9 !important;
                padding: 12px 16px !important;
            }
            .primaryBorderTop {
                border-top: none !important;
            }
            /* Reduce top gap between navbar and content */
            .content-wrapper, section.content, #page-wrapper {
                padding-top: 0px !important;
                margin-top: 0 !important;
            }
            .breadcrumb, .nav-breadcrumb {
                margin-bottom: 2px !important;
                padding-top: 0px !important;
                padding-bottom: 0px !important;
            }
            .container-fluid {
                padding-top: 0 !important;
            }
            /* Tighten the gap between quick-links bar and cards */
            .row:first-child, .content > .row:first-child {
                margin-top: 0 !important;
            }
            section.content > .container-fluid > .row {
                margin-top: 0 !important;
            }
            /* Reduce padding on dashboard main row container */
            #b5-pagewrapper > .row {
                padding-top: 4px !important;
                padding-left: 16px !important;
                padding-right: 16px !important;
            }
            @media (min-width: 992px) {
                #b5-pagewrapper > .row {
                    padding-left: 24px !important;
                    padding-right: 24px !important;
                }
            }
            #b5-pagewrapper {
                margin-bottom: 0 !important;
            }
            /* Clean up semester text (WINSEM...) */
            .bg-warning, [style*="background-color: yellow"], [style*="background: yellow"] {
                background-color: transparent !important;
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
            }
            .text-black, [style*="color: black"] {
                color: inherit !important;
            }
        `;
        if (!vitExtStyle.parentElement) document.head.appendChild(vitExtStyle);

        // ── 0. Expand course registration card ──
        const courseCard = document.getElementById("course-data");
        if (courseCard) {
            const courseBody = courseCard.querySelector(".card-body");
            if (courseBody) {
                courseBody.classList.remove("overflow-scroll");
                courseBody.style.overflow = "visible";
                courseBody.style.maxHeight = "none";
                courseBody.style.height = "auto";
            }
        }

        // ── 0.1 Clean up Semester Text (WINSEM...) ──
        const semesterTextEls = [...document.querySelectorAll('span, b, div')].filter(el =>
            el.textContent.includes('WINSEM') && el.children.length === 0
        );
        semesterTextEls.forEach(el => {
            el.style.backgroundColor = 'transparent';
            el.style.background = 'transparent';
            el.style.boxShadow = 'none';
            el.style.border = 'none';
            el.classList.remove('bg-warning', 'text-black', 'badge', 'bg-dark');
            el.classList.add('fontcolor3', 'fw-bold');

            // Also check parent if it's a small box
            const parent = el.parentElement;
            if (parent && (parent.classList.contains('bg-dark') || getComputedStyle(parent).backgroundColor === 'rgb(0, 0, 0)')) {
                parent.style.backgroundColor = 'transparent';
                parent.style.background = 'transparent';
                parent.style.boxShadow = 'none';
            }
        });

        // ── 1. Remove Action Plan - Academic Performance card ──
        const actionPlanH5 = Array.from(document.querySelectorAll("h5.card-title")).find(
            (el) => el.textContent.trim().includes("Action Plan")
        );
        if (actionPlanH5) {
            const actionCard = actionPlanH5.closest(".card");
            if (actionCard) actionCard.style.display = "none";
        }

        // ── 2. Remove feedback section ──
        const feedbackCard = findCardByTitle("Last Five Feedback Details");
        if (feedbackCard) {
            feedbackCard.style.display = "none";
        }

        // ── 3. Add toggle to CGPA section ──
        if (cgpaCard && !document.getElementById(TOGGLE_ID)) {
            const cgpaHeader = cgpaCard.querySelector(".card-header");
            const cgpaBody = cgpaCard.querySelector(".card-body");

            if (cgpaHeader && cgpaBody) {
                const toggleBtn = document.createElement("button");
                toggleBtn.id = TOGGLE_ID;
                toggleBtn.type = "button";
                toggleBtn.title = "Hide CGPA";
                toggleBtn.textContent = "👁";
                Object.assign(toggleBtn.style, {
                    background: "none",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    marginLeft: "auto",
                    transition: "all 0.2s",
                });

                chrome.storage.sync.get(["vtopHideCGPA"], (result) => {
                    if (result.vtopHideCGPA) {
                        cgpaBody.style.display = "none";
                        toggleBtn.textContent = "👁‍🗨";
                        toggleBtn.title = "Show CGPA";
                    }
                });

                toggleBtn.addEventListener("click", () => {
                    const isHidden = cgpaBody.style.display === "none";
                    cgpaBody.style.display = isHidden ? "" : "none";
                    toggleBtn.textContent = isHidden ? "👁" : "👁‍🗨";
                    toggleBtn.title = isHidden ? "Hide CGPA" : "Show CGPA";
                    chrome.storage.sync.set({ vtopHideCGPA: !isHidden });
                });

                cgpaHeader.style.display = "flex";
                cgpaHeader.style.alignItems = "center";
                cgpaHeader.appendChild(toggleBtn);
            }
        }

        // ── 4. Create Class Messages card next to Proctor Message ──
        let msgBody = document.getElementById("vit-ext-class-messages");
        let msgCard = msgBody ? msgBody.closest(".card") : null;

        if (proctorCard && !msgCard) {
            msgCard = document.createElement("div");
            msgCard.className = "card mb-3";
            const msgHeader = document.createElement("div");
            msgHeader.className = "card-header";
            msgHeader.innerHTML = '<span class="fs-6 fontcolor3 fw-bold">Class Messages</span>';
            msgBody = document.createElement("div");
            msgBody.className = "card-body";
            msgBody.id = "vit-ext-class-messages";
            msgBody.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:20px;color:#6c757d;"><span>Loading messages...</span></div>';
            msgCard.appendChild(msgHeader);
            msgCard.appendChild(msgBody);

            // Insert above the CGPA card if it exists, otherwise at the end
            if (cgpaCard) {
                cgpaCard.insertAdjacentElement("beforebegin", msgCard);
            } else {
                proctorCard.insertAdjacentElement("afterend", msgCard);
            }
            loadClassMessages(msgBody);
        } else if (msgCard && cgpaCard && msgCard.nextElementSibling !== cgpaCard) {
            // Ensure it's correctly positioned if it already exists
            cgpaCard.insertAdjacentElement("beforebegin", msgCard);
        }

        // ── 5. Move Proctor Message + Class Messages below Digital Assignments ──
        // ── 5. Move Proctor Message below Digital Assignments ──
        const daCard = findCardByTitle("Forthcoming Digital Assignments");
        if (daCard && proctorCard) {
            // Move proctor card after the DA card
            daCard.insertAdjacentElement("afterend", proctorCard);
        }

        // ── 6. Remove '<' text from Digital Assignments card ──
        const cleanDaSymbols = (container) => {
            if (!container) return;
            // Walk through ALL text nodes and remove bare '<' text
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
            const toRemove = [];
            while (walker.nextNode()) {
                const txt = walker.currentNode.textContent.trim();
                if (txt === '<' || txt === '<<' || txt === '< <') {
                    toRemove.push(walker.currentNode);
                }
            }
            toRemove.forEach(node => node.remove());

            // Also handle elements that only contain '<' characters
            const allEls = container.querySelectorAll('*');
            allEls.forEach(el => {
                if (el.children.length === 0) {
                    const t = el.textContent.trim();
                    if (t === '<' || t === '<<') {
                        el.style.display = 'none';
                    }
                }
            });
        };

        // Clean now (in case content is already loaded)
        if (daCard) cleanDaSymbols(daCard);

        // Also observe #digital-assignments for dynamic content loading (AJAX)
        const daDiv = document.getElementById('digital-assignments');
        if (daDiv) {
            const daObserver = new MutationObserver(() => {
                cleanDaSymbols(daDiv);
                daObserver.disconnect();
            });
            daObserver.observe(daDiv, { childList: true, subtree: true });
        }

        // ── 7. Tighten gap between navbar and content ──
        const wrapperEl = document.getElementById('b5-pagewrapper');
        if (wrapperEl) {
            const mainRow = wrapperEl.querySelector(':scope > .row');
            if (mainRow) {
                // Only reduce top padding, keep symmetrical side padding
                mainRow.classList.remove('p-1', 'p-md-2', 'p-lg-3');
                mainRow.style.paddingTop = '4px';
                mainRow.style.paddingBottom = '16px';
                mainRow.style.paddingLeft = '16px';
                mainRow.style.paddingRight = '16px';
            }
        }
    };

    // ── Load class messages from VTOP ──
    let isFetchingMessages = false;
    const loadClassMessages = async (container) => {
        if (isFetchingMessages) return;
        try {
            isFetchingMessages = true;
            // Extract CSRF and auth info from the page scripts
            const pageScripts = document.querySelectorAll("script:not([src])");
            let authorizedID = "";
            let csrfName = "_csrf";
            let csrfValue = "";

            for (const script of pageScripts) {
                const text = script.textContent || "";
                const idMatch = text.match(/const\s+id\s*=\s*"([^"]+)"/);
                const csrfValMatch = text.match(/const\s+csrfValue\s*=\s*"([^"]+)"/);
                if (idMatch) authorizedID = idMatch[1];
                if (csrfValMatch) csrfValue = csrfValMatch[1];
            }

            if (!authorizedID || !csrfValue) {
                container.innerHTML = noMsgHtml("Unable to load messages.");
                return;
            }

            const now = new Date();
            const params = `authorizedID=${encodeURIComponent(authorizedID)}&${csrfName}=${encodeURIComponent(csrfValue)}&x=${encodeURIComponent(now.toUTCString())}`;

            const response = await fetch("academics/common/StudentClassMessage", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                credentials: "same-origin",
                body: params,
            });

            if (!response.ok) throw new Error("Failed to fetch");

            const html = await response.text();

            if (!html || html.trim().length < 20) {
                container.innerHTML = noMsgHtml("No class messages at this time.");
                return;
            }

            // Parse the returned HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // The class messages page has accordion-style items:
            // Each message has a header link with "Course: ... Message: ..."
            // and an expanded panel with Faculty, Class Number, Expiry Date, Date Posted

            // Try to find message items — look for anchor tags or collapse panels
            const messageLinks = doc.querySelectorAll("a[data-bs-toggle='collapse'], a[data-toggle='collapse'], a.collapsed, a[href^='#collapse']");
            const tables = doc.querySelectorAll("table");

            let messages = [];

            // Strategy 1: Parse accordion-style links
            if (messageLinks.length > 0) {
                for (const link of messageLinks) {
                    const linkText = link.textContent?.trim() || "";
                    // Extract course and message from "Course: ABC - XYZ Message: Some text"
                    const courseMatch = linkText.match(/Course:\s*(.+?)\s*Message:\s*(.+)/i);

                    let course = "";
                    let message = "";

                    if (courseMatch) {
                        course = courseMatch[1].trim();
                        message = courseMatch[2].trim();
                    } else {
                        message = linkText;
                    }

                    // Try to find the associated detail panel
                    const targetId = link.getAttribute("href")?.replace("#", "") ||
                        link.getAttribute("data-bs-target")?.replace("#", "");
                    let faculty = "", expiryDate = "", datePosted = "";

                    if (targetId) {
                        const panel = doc.getElementById(targetId);
                        if (panel) {
                            const detailCells = panel.querySelectorAll("td");
                            for (let i = 0; i < detailCells.length; i++) {
                                const cellText = detailCells[i]?.textContent?.trim() || "";
                                if (cellText === "Faculty" && detailCells[i + 1]) {
                                    faculty = detailCells[i + 1].textContent?.trim() || "";
                                } else if (cellText === "Expiry Date" && detailCells[i + 1]) {
                                    expiryDate = detailCells[i + 1].textContent?.trim() || "";
                                } else if (cellText === "Date Posted" && detailCells[i + 1]) {
                                    datePosted = detailCells[i + 1].textContent?.trim() || "";
                                }
                            }
                        }
                    }

                    if (message) {
                        messages.push({ course, message, faculty, expiryDate, datePosted });
                    }
                }
            }

            // Strategy 2: Fallback — try parsing the raw HTML for any recognizable structure
            if (messages.length === 0) {
                // Just inject the raw HTML from VTOP, cleaned up
                container.innerHTML = html;
                container.style.maxHeight = "400px";
                container.style.overflowY = "auto";
                return;
            }

            // Render messages
            container.innerHTML = "";
            container.style.maxHeight = "400px";
            container.style.overflowY = "auto";

            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const item = document.createElement("div");
                Object.assign(item.style, {
                    borderBottom: "1px solid #f1f5f9",
                    padding: "10px 8px",
                });

                // Course + message header
                const headerDiv = document.createElement("div");
                Object.assign(headerDiv.style, {
                    marginBottom: "4px",
                });

                if (msg.course) {
                    const courseSpan = document.createElement("span");
                    Object.assign(courseSpan.style, {
                        fontWeight: "700",
                        color: "#0f172a",
                        fontSize: "14px",
                    });
                    courseSpan.textContent = msg.course;
                    headerDiv.appendChild(courseSpan);
                }

                const msgDiv = document.createElement("div");
                Object.assign(msgDiv.style, {
                    color: "#334155",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    marginTop: "3px",
                });
                msgDiv.textContent = msg.message;
                item.appendChild(headerDiv);
                item.appendChild(msgDiv);

                // Details row (faculty, date)
                if (msg.faculty || msg.datePosted) {
                    const detailDiv = document.createElement("div");
                    Object.assign(detailDiv.style, {
                        display: "flex",
                        gap: "12px",
                        marginTop: "4px",
                        fontSize: "12px",
                        color: "#64748b",
                    });
                    if (msg.faculty) {
                        const f = document.createElement("span");
                        f.textContent = msg.faculty;
                        detailDiv.appendChild(f);
                    }
                    if (msg.datePosted) {
                        const d = document.createElement("span");
                        d.textContent = "Posted: " + msg.datePosted;
                        detailDiv.appendChild(d);
                    }
                    if (msg.expiryDate) {
                        const e = document.createElement("span");
                        e.textContent = "Expires: " + msg.expiryDate;
                        detailDiv.appendChild(e);
                    }
                    item.appendChild(detailDiv);
                }

                container.appendChild(item);
            }

            if (messages.length === 0) {
                container.innerHTML = noMsgHtml("No class messages at this time.");
            }
        } finally {
            isFetchingMessages = false;
        }
    };

    // ── Helpers ──
    const findCardByTitle = (title) => {
        const allSpans = document.querySelectorAll(".card-header span.fw-bold");
        for (const span of allSpans) {
            if (span.textContent.trim().includes(title)) {
                return span.closest(".card");
            }
        }
        return null;
    };

    const noMsgHtml = (text) =>
        `<div style="padding:12px;color:#6c757d;text-align:center;font-size:13px;">${text}</div>`;

    // ── Re-apply logic: remove old marker so customizeDashboard can re-run ──
    const resetAndApply = () => {
        // Remove old marker so customizeDashboard can detect it needs to run
        const oldMarker = document.getElementById(MARKER_ID);
        if (oldMarker) oldMarker.remove();

        // Try immediately, then once after a short delay for AJAX content
        requestAnimationFrame(() => {
            try { customizeDashboard(); } catch (_) { }
        });
        setTimeout(() => { try { customizeDashboard(); } catch (_) { } }, 500);
        setTimeout(() => { try { customizeDashboard(); } catch (_) { } }, 1500);
    };

    // ── Message listener ──
    chrome.runtime.onMessage.addListener((request) => {
        if (request.message === "dashboard" || request.message === "nav_bar_change") {
            // Small delay to let VTOP inject the dashboard HTML first
            setTimeout(() => resetAndApply(), 200);
        }
    });

    // ── Persistent observer: watches for dashboard elements appearing ──
    // This NEVER disconnects, so it catches SPA navigation back to dashboard
    let debounceTimer = null;
    const persistentObserver = new MutationObserver(() => {
        // If marker exists, dashboard is already customized — do nothing
        if (document.getElementById(MARKER_ID)) return;

        // Check if dashboard-specific elements are in the DOM
        const hasDashboard = document.getElementById("edu-status") ||
            document.getElementById("course-data") ||
            document.getElementById("last-five-feedbacks") ||
            document.getElementById("proctor-message") ||
            document.getElementById("digital-assignments");

        if (hasDashboard) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Double-check marker hasn't been set in the meantime
                if (!document.getElementById(MARKER_ID)) {
                    try { customizeDashboard(); } catch (_) { }
                }
            }, 200);
        }
    });

    persistentObserver.observe(document.body, { childList: true, subtree: true });
})();
