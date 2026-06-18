require_relative 'lib/lazy_load_history'

Redmine::Plugin.register :redmine_lazy_load_history do
  name 'Redmine Lazy Load History'
  author 'sk-ys'
  description 'This plugin lazily loads issue history entries, improving performance for issues with many history entries.'
  version '0.3.0'
  url 'http://github.com/sk-ys/redmine_lazy_load_history'
  author_url 'http://github.com/sk-ys'

  settings :default => {
    'initial_load_count' => 10,
    'load_count' => 10
  }, :partial => 'settings/lazy_load_history_settings'
end
