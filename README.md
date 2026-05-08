# Redmine Lazy Load History

## Overview

This is a Redmine plugin that progressively loads issue history on demand. Instead of loading all journals at once, it displays only the latest N entries initially and allows users to load older entries by clicking a "Show more" button.

This improves page load performance for issues with many history entries.

## Features

- **Progressive Loading**: Display only the latest N journals initially
- **On-Demand Loading**: Load older journals with a single button click
- **Quick Full Load**: Shift + click on "Show more" to load all remaining journals at once
- **Custom Event Hook**: Emits a `lazyLoadHistory:loaded` event after journals are loaded
- **Configurable**: Set the initial display count and load count per request via Administration
- **RedmineRT Plugin Compatible**: Supports the [RedmineRT](https://github.com/MayamaTakeshi/redmine_rt) plugin's alternative history tab
- **Redmine Extra Notes Plugin Compatible**: Supports the [Redmine Extra Notes](https://github.com/sk-ys/redmine_extra_notes) plugin's extra note tabs

## Requirements

- **Redmine**: 6.1 (Other versions have not been tested.)

## Installation

### 1. Clone the plugin

```bash
cd /path/to/redmine/plugins
git clone https://github.com/sk-ys/redmine_lazy_load_history.git
```

### 2. Restart Redmine

### 3. Configure the plugin (Optional)

1. Log in to Redmine as an administrator
2. Go to **Administration > Plugins**
3. Find **Redmine Lazy Load History** and click **Configure**
4. Adjust settings as needed and save

#### Configuration

| Setting                     | Default | Description                                                     |
| --------------------------- | ------: | --------------------------------------------------------------- |
| Initial journals to display |      10 | Number of journals shown on first page load                     |
| History entries per load    |      10 | Number of journals loaded each time the user clicks "Show more" |

## How to use

1. Open an issue page.
2. Confirm that only the latest N journal entries are shown first.
3. If older entries exist, click **"Show more"** under the history tab.
4. Repeat **"Show more"** to load the next batch of older entries.
5. Continue until the button disappears (all available history entries are loaded).

### Load all remaining journals

- Hold **Shift** and click **"Show more"** to load all remaining journals in a single request.

### Custom event

This plugin dispatches a custom event after journals are successfully loaded.

- Event name: `lazyLoadHistory:loaded`
- Dispatch target: `.lazy-load-history` container
- Trigger timing: After successful fetch and journal insertion
- `event.detail`:
	- `cursorId` (`number`): Next cursor id
	- `hasMore` (`boolean`): Whether more journals remain
	- `loadedJournals` (`Element[]`): Inserted journal DOM elements

Example:

```javascript
document.querySelectorAll(".lazy-load-history").forEach((container) => {
	container.addEventListener("lazyLoadHistory:loaded", (event) => {
		const { cursorId, hasMore, loadedJournals } = event.detail;
		console.log("Loaded journals:", loadedJournals.length, { cursorId, hasMore });
	});
});
```

## Troubleshooting

If the issue is still not resolved after the checks below, please report it via GitHub Issues:
https://github.com/sk-ys/redmine_lazy_load_history/issues

### History not loading

1. Check browser console for JavaScript errors
2. Verify the plugin is enabled in **Administration > Plugins**
3. Check `log/development.log` or `log/production.log` for errors
4. Verify the user has "View issues" permission on the project

### Button not appearing

- Verify `initial_load_count` is less than the total number of journal entries in the issue
- Check plugin settings in Administration
