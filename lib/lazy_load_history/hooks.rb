module LazyLoadHistory
  class Hooks < Redmine::Hook::ViewListener
    render_on :view_my_account_preferences,
              partial: 'lazy_load_history/my_account_preferences'
  end
end
