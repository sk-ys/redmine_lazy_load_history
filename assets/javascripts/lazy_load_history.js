(() => {
  window.lazyLoadHistory = window.lazyLoadHistory || {};

  function i18n(key, variables = {}) {
    if (window.lazyLoadHistory?.i18n && window.lazyLoadHistory.i18n[key]) {
      let translation = window.lazyLoadHistory.i18n[key];
      Object.keys(variables).forEach((varKey) => {
        translation = translation.replace(`%{${varKey}}`, variables[varKey]);
      });
      return translation;
    }
    return "";
  }

  function readConfig(container) {
    const d = container.dataset;
    return {
      url: d.lazyLoadHistoryUrlValue,
      cursorId: Number(d.lazyLoadHistoryCursorIdValue || 0),
      totalSize: Number(d.lazyLoadHistoryTotalSizeValue || 0),
      loadedSize: Number(d.lazyLoadHistoryLoadedSizeValue || 0),
      remainingSize: Number(d.lazyLoadHistoryRemainingSizeValue || 0),
    };
  }

  function journalEntries(container) {
    return Array.from(
      container.parentElement.querySelectorAll("div[id^='change-']"),
    );
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
    const { statusElement } = getContainerElements(state.container);
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.classList.toggle("error", isError);
    }
  }

  function updateControls(state) {
    const shouldShow =
      state.remainingSize > 0 &&
      isHistoryTabSelected(state.container, state.tabsElement);
      
    const { actionsElement, buttonElement } =
      getContainerElements(state.container);

    if (actionsElement) {
      actionsElement.hidden = !shouldShow;
    }

    if (buttonElement) {
      buttonElement.hidden = state.remainingSize <= 0;
      buttonElement.disabled = state.loading || !shouldShow;
    }

    if (!shouldShow) {
      updateStatus(state, "", false);
    }

    if (!state.loading) {
      state.container.dataset.lazyLoadHistoryCursorIdValue = String(
        state.cursorId,
      );
      state.container.dataset.lazyLoadHistoryTotalSizeValue = String(
        state.totalSize,
      );
      state.container.dataset.lazyLoadHistoryLoadedSizeValue = String(
        state.loadedSize,
      );
      state.container.dataset.lazyLoadHistoryRemainingSizeValue = String(
        state.remainingSize,
      );

      document.querySelector(".lazy-load-history-remaining-count").textContent =
        i18n("remainingItemsCount", {
          count: state.remainingSize,
        });
    }
  }

  function insertJournals(state, html) {
    const existingEntries = journalEntries(state.container);

    const newEntries = Array.from(
      new DOMParser().parseFromString(html, "text/html").body.children,
    );

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
        existingEntries[existingEntries.length - 1].insertAdjacentElement(
          "afterend",
          entry,
        );
      });
    }

    // Optionally refresh the history tab to ensure correct display of new entries for Extra Notes plugin
    if (typeof window.extraNotes?.refreshHistoryTab === "function") {
      window.extraNotes.refreshHistoryTab();
    }

    // Trigger click on the currently selected tab to refresh the view and ensure new entries are displayed correctly
    const urlHash = location.hash;
    $("#history .tabs .selected").trigger("click");
    if (urlHash) location.hash = urlHash; // Restore hash

    setTimeout(() => {
      newEntries.forEach((entry) => {
        entry.classList.remove("lazy-load-history-new-journals");
      });
    }, 1500);

    return newEntries;
  }

  async function loadMore(state, event) {
    if (event) event.preventDefault();
    if (state.loading || state.remainingSize <= 0 || !state.cursorId) return;

    // Remove title attribute
    const { buttonElement } = getContainerElements(state.container);
    if ($(buttonElement).tooltip("instance")) {
      $(buttonElement).tooltip("close").removeAttr("title");
      setTimeout(() => {
        $(buttonElement).tooltip("instance") &&
          $(buttonElement).tooltip("destroy").removeAttr("title");
      }, 500);
    }

    state.loading = true;
    updateControls(state);
    updateStatus(state, i18n("loading"), false);

    // If Shift key is pressed, load all remaining journals without limit
    const loadJournalCount = event?.shiftKey ? 0 : state.loadJournalCount || 10;

    try {
      const url = new URL(state.url, window.location.origin);
      url.searchParams.set("cursor_id", String(state.cursorId));
      url.searchParams.set("limit", String(loadJournalCount));

      if (state.changeId) {
        url.searchParams.set("change_id", state.changeId);
      } else if (state.noteId) {
        url.searchParams.set("note_id", state.noteId);
      }

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
      state.cursorId = Number(
        payload.next_cursor_id == null
          ? state.cursorId
          : payload.next_cursor_id,
      );
      state.totalSize = Number(
        payload.total_size == null ? state.totalSize : payload.total_size,
      );
      state.loadedSize = Number(
        payload.loaded_size == null ? state.loadedSize : payload.loaded_size,
      );
      state.remainingSize = Number(
        payload.remaining_size == null
          ? state.remainingSize
          : payload.remaining_size,
      );

      const html = payload.html || "";
      if (html.length > 0) {
        const loadedJournals = insertJournals(state, html);

        if (loadedJournals?.length > 0) {
          state.container.dispatchEvent(
            new CustomEvent("lazyLoadHistory:loaded", {
              detail: {
                cursorId: state.cursorId,
                totalSize: state.totalSize,
                loadedSize: state.loadedSize,
                remainingSize: state.remainingSize,
                loadedJournals: loadedJournals,
              },
            }),
          );
        }
      }

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
  
  function getContainerElements(container) {
    if (!container) return {};
    
    const actionsElement = container.querySelector(".lazy-load-history-footer");
    const buttonElement = actionsElement?.querySelector(
      "button[data-action='lazy-load-history#loadMore']",
    );
    const statusElement = container.querySelector(
      "[data-lazy-load-history-target='status']",
    );
    const tabsElement = document.querySelector("#history .tabs");
    
    return {
      actionsElement,
      buttonElement,
      statusElement,
      tabsElement,
    };
  }
  
  function loadStateFromContainer(container) {
    const config = readConfig(container);
    return {
      container,
      loading: false,
      url: config.url,
      cursorId: config.cursorId,
      loadJournalCount: window.lazyLoadHistory?.config?.loadJournalCount || 10,
      sortOrder: window.lazyLoadHistory?.config?.sortOrder || "asc",
      totalSize: config.totalSize,
      loadedSize: config.loadedSize,
      remainingSize: config.remainingSize,
    };
  }

  function initContainer(container) {
    if (!container) return;

    if (container.dataset.lazyLoadHistoryInitialized === "true") return;
    container.dataset.lazyLoadHistoryInitialized = "true";

    const { actionsElement, buttonElement, tabsElement } = getContainerElements(container);

    if (!actionsElement) {
      console.warn(
        "[lazy-load-history] Actions element not found in container",
        container,
      );
      return;
    }

    const state = loadStateFromContainer(container);

    if (actionsElement && tabsElement) {
      if (state.sortOrder === "asc") {
        // Move the actions element next to the tabs
        tabsElement.insertAdjacentElement("afterend", container);
      }
    }

    if (buttonElement) {
      buttonElement.addEventListener("click", (event) => {
        const state = loadStateFromContainer(container);
        loadMore(state, event);
      });
    }

    if (tabsElement) {
      tabsElement.addEventListener("click", () => {
        const state = loadStateFromContainer(container);
        requestAnimationFrame(() => updateControls(state));
      });
    }

    updateControls(state);
  }

  function loadContentFromHash(container) {
    if (!container) return;
    
    const state = loadStateFromContainer(container);

    const changeHashMatch = location.hash.match("#change-([0-9]+)");
    if (changeHashMatch) {
      const changeId = parseInt(changeHashMatch[1]);
      const targetEntry = container.parentElement.querySelector(
        `#change-${changeId}`,
      );
      if (!targetEntry) {
        loadMore(
          {
            ...state,
            ...{
              loadJournalCount: 0,
              changeId: changeId,
            },
          },
          null,
        );
      }
    }

    const noteHashMatch = location.hash.match("#note-([0-9]+)");
    if (noteHashMatch) {
      const noteId = parseInt(noteHashMatch[1]);
      const targetEntry = container.parentElement.querySelector(
        `#note-${noteId}`,
      );
      if (!targetEntry) {
        loadMore(
          {
            ...state,
            ...{
              loadJournalCount: 0,
              noteId: noteId,
            },
          },
          null,
        );
      }
    }
  }

  function initAll() {
    const container =
      document.getElementById("lazy-load-history");
    if (!container) return;

    initContainer(container);
    loadContentFromHash(container);
  }

  // Expose initContainer and initAll to the global scope for external usage
  window.lazyLoadHistory.initContainer = initContainer;
  window.lazyLoadHistory.initAll = initAll;

  document.addEventListener("DOMContentLoaded", initAll);
  document.addEventListener("turbo:load", initAll);
  window.addEventListener("popstate", initAll);
})();
