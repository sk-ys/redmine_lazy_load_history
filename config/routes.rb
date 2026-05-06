get 'lazy_load_history/issues/:issue_id/journals',
	to: 'lazy_load_history/journals#index',
	as: 'lazy_load_history_issue_journals'
