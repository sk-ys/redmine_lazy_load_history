module LazyLoadHistory
  module UserPreferencePatch
    def self.included(base)
      base.safe_attributes('initial_load_count')
      base.safe_attributes('load_count')
    end

    def initial_load_count
      self[:initial_load_count]
    end

    def initial_load_count=(value)
      self[:initial_load_count] = value.to_i
    end

    def load_count
      self[:load_count]
    end

    def load_count=(value)
      self[:load_count] = value.to_i
    end
  end
end

unless UserPreference.included_modules.include?(LazyLoadHistory::UserPreferencePatch)
  UserPreference.include LazyLoadHistory::UserPreferencePatch
end
