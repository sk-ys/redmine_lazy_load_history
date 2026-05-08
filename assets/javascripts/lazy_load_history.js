(() => {
    function i18n(key) {
        if (window.lazyLoadHistory?.i18n && window.lazyLoadHistory.i18n[key]) {
            return window.lazyLoadHistory.i18n[key];
        }
        return "";
    }

    function readConfig(container) {
        const d = container.dataset;
        return {
            url: d.lazyLoadHistoryUrlValue,
            cursorId: Number(d.lazyLoadHistoryCursorIdValue || 0),
            hasMore: d.lazyLoadHistoryHasMoreValue === "true",
        };
    }

    function journalEntries(container) {
        return Array.from(container.parentElement.querySelectorAll("div[id^='change-']"));
    }

    function isHistoryTabSelected(container, tabsElement) {
        if (tabsElement) {
            const selectedTab = tabsElement.querySelector(".selected");
            return !!(
                selectedTab &&
                ["history", "note", "properties", "extra_notes"].some((id) =>
                    selectedTab.id.split("-")[1].startsWith(id),
                )
            );
        }

        const tabContent = container.closest(".tab-content");
        if (tabContent) {
            return tabContent.style.display !== "none";
        }

        return true;
    }

    function updateStatus(state, message, isError = false) {
        if (state.statusElement) {
            state.statusElement.textContent = message;
            state.statusElement.classList.toggle("error", isError);
        }
    }

    function updateControls(state) {
        const shouldShow =
            state.hasMore && isHistoryTabSelected(state.container, state.tabsElement);

        if (state.actionsElement) {
            state.actionsElement.hidden = !shouldShow;
        }

        if (state.buttonElement) {
            state.buttonElement.hidden = !state.hasMore;
            state.buttonElement.disabled = state.loading || !shouldShow;
        }

        if (!shouldShow) {
            updateStatus(state, "", false);
        }
    }

    function insertJournals(state, html) {
        const existingEntries = journalEntries(state.container);

        const newEntries = Array.from(new DOMParser().parseFromString(html, "text/html").body.children);

        newEntries.forEach((entry) => {
            entry.classList.add("lazy-load-history-new-journals");
        });

        if (existingEntries.length === 0) {
            newEntries.forEach((entry) => {
                state.container.insertAdjacentElement("beforebegin", entry);
            });
            return;
        }

        if (state.sortOrder === "asc") {
            newEntries.forEach((entry) => {
                existingEntries[0].insertAdjacentElement("beforebegin", entry);
            });
        } else {
            newEntries.forEach((entry) => {
                existingEntries[existingEntries.length - 1].insertAdjacentElement("afterend", entry);
            });
        }

        // Optionally refresh the history tab to ensure correct display of new entries for Extra Notes plugin
        if (typeof window.extraNotes?.refreshHistoryTab === "function") {
            window.extraNotes.refreshHistoryTab();
        }

        // Trigger click on the currently selected tab to refresh the view and ensure new entries are displayed correctly
        $("#history .tabs .selected").trigger("click");

        setTimeout(() => {
            newEntries.forEach((entry) => {
                entry.classList.remove("lazy-load-history-new-journals");
            });
        }, 1500);
    }

    async function loadMore(state, event) {
        if (event) event.preventDefault();
        if (state.loading || !state.hasMore || !state.cursorId) return;

        state.loading = true;
        updateControls(state);
        updateStatus(state, i18n("loading"), false);

        // If Shift key is pressed, load all remaining journals without limit
        const loadJournalCount = event?.shiftKey ? 0 : state.loadJournalCount || 10;

        try {
            const url = new URL(state.url, window.location.origin);
            url.searchParams.set("cursor_id", String(state.cursorId));
            url.searchParams.set("limit", String(loadJournalCount));

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const payload = await response.json();
            const html = payload.html || "";
            if (html.length > 0) insertJournals(state, html);

            state.cursorId = Number(payload.next_cursor_id || state.cursorId);
            state.hasMore = Boolean(payload.has_more);

            // Clear status message on successful load
            updateStatus(state, "", false);
        } catch (error) {
            console.error("[lazy-load-history] load failed", error);
            updateStatus(state, i18n("error") + ": " + error.message, true);
        } finally {
            state.loading = false;
            updateControls(state);
        }
    }

    function initContainer(container) {
        if (!container) return;

        if (container.dataset.lazyLoadHistoryInitialized === "true") return;
        container.dataset.lazyLoadHistoryInitialized = "true";

        const actionsElement = container.querySelector(
            ".lazy-load-history-footer",
        );

        if (!actionsElement) {
            console.warn("[lazy-load-history] Actions element not found in container", container);
            return;
        }

        const buttonElement = actionsElement.querySelector(
            "button[data-action='lazy-load-history#loadMore']",
        );
        const statusElement = container.querySelector(
            "[data-lazy-load-history-target='status']",
        );
        const tabsElement = document.querySelector(
            "#history .tabs",
        );

        const config = readConfig(container);
        const state = {
            container,
            actionsElement,
            buttonElement,
            statusElement,
            tabsElement,
            loading: false,
            url: config.url,
            cursorId: config.cursorId,
            loadJournalCount: window.lazyLoadHistory?.config?.loadJournalCount || 10,
            sortOrder: window.lazyLoadHistory?.config?.sortOrder || "asc",
            hasMore: config.hasMore,
        };

        if (actionsElement && tabsElement) {
            if (state.sortOrder === "asc") {
                // Move the actions element next to the tabs
                tabsElement.insertAdjacentElement("afterend", container);
            }
        }

        if (buttonElement) {
            buttonElement.addEventListener("click", (event) =>
                loadMore(state, event),
            );
        }

        if (tabsElement) {
            tabsElement.addEventListener("click", () => {
                requestAnimationFrame(() => updateControls(state));
            });
        }

        updateControls(state);
    }

    function initAll() {
        document.querySelectorAll(".lazy-load-history").forEach(initContainer);
    }

    document.addEventListener("DOMContentLoaded", initAll);
    document.addEventListener("turbo:load", initAll);
})();
