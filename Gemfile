# frozen_string_literal: true

source "https://rubygems.org"

# Overwatch UI 테마는 gem 없이 이 저장소 안에 직접 들어 있습니다.
# (jekyll-theme-chirpy 의존성은 제거했습니다.)
gem "jekyll", "~> 4.3"
gem "jekyll-paginate", "~> 1.1"
gem "jekyll-archives", "~> 2.2"
gem "jekyll-seo-tag", "~> 2.8"
gem "jekyll-sitemap", "~> 1.4"

# Ruby 3 이상에서 jekyll serve 에 필요
gem "webrick", "~> 1.8"

gem "html-proofer", "~> 5.0", group: :test

platforms :windows, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.2.0", :platforms => [:windows]
