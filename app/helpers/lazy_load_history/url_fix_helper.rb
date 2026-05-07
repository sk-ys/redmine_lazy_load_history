module LazyLoadHistory
  # Overrides `url_for` in the view context so that controller names in URL
  # option hashes are always resolved as absolute paths (e.g. 'repositories'
  # becomes '/repositories').
  #
  # Without this, Rails' relative-controller resolution qualifies any bare
  # controller name with the current controller's namespace, turning
  # controller: 'repositories' into 'lazy_load_history/repositories', which
  # has no matching route and raises ActionController::UrlGenerationError
  # when Redmine's parse_redmine_links tries to build commit/source/revision
  # links inside journal notes rendered by this plugin's JournalsController.
  module UrlFixHelper
    def url_for(options = nil)
      if options.is_a?(Hash) &&
          options[:controller].is_a?(String) &&
          !options[:controller].start_with?('/')
        options = options.merge(controller: "/#{options[:controller]}")
      end
      super
    end
  end
end
