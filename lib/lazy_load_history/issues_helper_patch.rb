module LazyLoadComments
  module IssuesHelperPatch
    def self.apply
      if defined?(IssuesHelper) && !IssuesHelper.included_modules.include?(LazyLoadComments::IssuesHelperPatch)
        IssuesHelper.include LazyLoadComments::IssuesHelperPatch
      end

      # Support for Redmine RT plugin if it's present
      if defined?(RedmineRt::IssuesControllerHelper) && !RedmineRt::IssuesControllerHelper.included_modules.include?(LazyLoadComments::IssuesHelperPatch)
        RedmineRt::IssuesControllerHelper.include LazyLoadComments::IssuesHelperPatch
      end
    end

    def self.included(base)
      base.class_eval do
        def replace_history_tab_partial_with_lazy_load_history(tabs)
          if respond_to?(:request) && request
            return tabs unless request.format.html?
          end

          tabs.each do |tab|
            if tab[:name] == 'history'
              # Replace the history tab partial with our lazy load comments partial
              tab[:partial] = 'lazy_load_history/history'
              break
            end
          end

          tabs
        end

        if method_defined?(:issue_history_tabs) && !method_defined?(:issue_history_tabs_without_lazy_load_history)
          def issue_history_tabs_with_lazy_load_history
            replace_history_tab_partial_with_lazy_load_history(issue_history_tabs_without_lazy_load_history)
          end

          alias_method :issue_history_tabs_without_lazy_load_history, :issue_history_tabs
          alias_method :issue_history_tabs, :issue_history_tabs_with_lazy_load_history
        end

        # Support for Redmine RT plugin's issue history tabs if the method is defined
        if method_defined?(:issue_history_tabs_for_redmine_rt) && !method_defined?(:issue_history_tabs_for_redmine_rt_without_lazy_load_history)
          def issue_history_tabs_for_redmine_rt_with_lazy_load_history
            replace_history_tab_partial_with_lazy_load_history(issue_history_tabs_for_redmine_rt_without_lazy_load_history)
          end

          alias_method :issue_history_tabs_for_redmine_rt_without_lazy_load_history, :issue_history_tabs_for_redmine_rt
          alias_method :issue_history_tabs_for_redmine_rt, :issue_history_tabs_for_redmine_rt_with_lazy_load_history
        end
      end
    end
  end
end

LazyLoadComments::IssuesHelperPatch.apply
Rails.configuration.to_prepare { LazyLoadComments::IssuesHelperPatch.apply } if defined?(Rails)
