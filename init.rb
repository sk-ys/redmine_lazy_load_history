unless Rails.application.config.eager_load
  require_relative 'lib/lazy_load_history'
end

Redmine::Plugin.register :redmine_lazy_load_history do
  name 'Redmine Lazy Load History'
  author 'sk-ys'
  description 'This plugin modifies the issue history tab to load history entries lazily, improving performance for issues with a large number of history entries.'
  version '0.0.1'
  url 'http://github.com/sk-ys/redmine_lazy_load_history'
  author_url 'http://github.com/sk-ys'

  settings :default => {
    'initial_load_count' => 10,
    'load_count' => 10
  }, :partial => 'settings/lazy_load_history_settings'
end
