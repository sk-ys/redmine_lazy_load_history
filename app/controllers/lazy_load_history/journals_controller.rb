module LazyLoadHistory
  class JournalsController < ApplicationController
    helper :journals
    helper :issues
    helper :custom_fields
    helper LazyLoadHistory::UrlFixHelper
    helper :attachments

    before_action :find_issue
    before_action :authorize_view_issue

    def index
      cursor_id = params[:cursor_id].to_i
      if cursor_id <= 0
        render json: {error: l('lazy_load_history.error')}, status: :unprocessable_content
        return
      end

      limit = params[:limit]&.to_i
      limit = Setting.plugin_redmine_lazy_load_history['load_count'].to_i if limit.nil?
      # limit = 1 if limit <= 0
      # limit = 100 if limit > 100

      change_id = params[:change_id]&.to_i
      note_id = params[:note_id]&.to_i

      journals = ordered_journals
      chunk, next_cursor_id = older_journals_chunk(journals, cursor_id, limit, change_id, note_id)

      remaining_size = if User.current.wants_comments_in_reverse_order?
        journals.size - journals.index { |journal| journal.id == next_cursor_id } - chunk.size
      else
        journals.index { |journal| journal.id == next_cursor_id }
      end

      html = render_to_string(
        partial: 'lazy_load_history/journals',
        formats: [:html],
        locals: {issue: @issue, journals: chunk}
      )

      render json: {
        html: html,
        next_cursor_id: next_cursor_id,
        total_size: journals.size,
        loaded_size: chunk.size,
        remaining_size: remaining_size
      }
    end

    private

    def find_issue
      @issue = Issue.visible.find_by(id: params[:issue_id])
      render_404 unless @issue
    end

    def authorize_view_issue
      @project = @issue.project
      render_403 unless User.current.allowed_to?(:view_issues, @project)
    end

    def ordered_journals
      journals = @issue.visible_journals_with_index
      journals.reverse! if User.current.wants_comments_in_reverse_order?
      journals
    end

    def older_journals_chunk(journals, cursor_id, limit, change_id = nil, note_id = nil)
      cursor_index = journals.index { |journal| journal.id == cursor_id }
      return [[], cursor_id] unless cursor_index

      if change_id || note_id
        if change_id
          change_index = journals.index { |journal| journal.id == change_id }
        elsif note_id
          change_index = journals.index { |journal| journal.indice == note_id }
        end
        
        if change_index && change_index < cursor_index
          limit = cursor_index - change_index
        else
          # Abort if the specified change_id or note_id is not found
          return [[], cursor_id]
        end
      end

      if User.current.wants_comments_in_reverse_order?
        if limit <= 0
          chunk = journals[(cursor_index + 1)..-1] || []
        else
          chunk = journals[(cursor_index + 1), limit] || []
        end
      else
        if limit <= 0
          chunk = journals[0...cursor_index] || []
        else
          from = [cursor_index - limit, 0].max
          chunk = journals[from...cursor_index] || []
        end
      end

      return [[], cursor_id] if chunk.empty?

      next_cursor_id = if User.current.wants_comments_in_reverse_order?
        chunk.last.id
      else
        chunk.first.id
      end

      [chunk, next_cursor_id]
    end
  end
end
