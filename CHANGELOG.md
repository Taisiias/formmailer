# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Providing form URL in special field `_formurl` (will show up in email instead of referrer).
- Providing form name in special field `_formname` (will show up in emails).

### Deleted
- ROADMAP (using GitHub milestones instead).

## [0.2.0] - 2017-09-03
### Added
- Manual reCAPTCHA integration support.
- Installing `formmailer` command in $PATH with `npm install -g formmailer`.
- Configuration options: `reCaptchaSecret`, `requireReCaptchaResponse`.
- CHANGELOG & ROADMAP.

### Changed
- Development environment commands and VSCode debugging integration.
- README fixes.
- Default DB file path changed to `./formmailer.db`

## [0.1.1] - 2017-08-26
### Added
- Example config file.
- CircleCI integration.

### Changed
- Fixed development HTML file and subject template.
- README fixes.

## [0.1.0] - 2017-08-24
### Added
- Basic FormMailer functionality.
- Mustache templating for message body and subject.
- Storing all request information to SQLite database.
- Special `_redirect` form field.
- README.
- First NPM publish.