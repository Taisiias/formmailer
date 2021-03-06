# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2019-03-31
### Fixed
- Issue #53. Web interface loads indefinitely when accessing email history.

## [1.0.1] - 2018-08-07
### Fixed
- Restored formmailer.js runtime.

## [1.0.0] - 2018-08-07
### Added
- Changed config settings names.
- Default HTTP port is 80.
- Automated testing.

## [0.7.1] - 2018-01-11
### Changed
- Fix: ReCAPTCHA for AJAX requests.
- Fix: Encoding when sending Unicode messages.

## [0.7.0] - 2017-12-18
### Added
- Web interface for viewing email history.
- `enableWebInterface` config setting.
- `webInterfaceIP` config setting.
- `webInterfacePort` config setting.

## [0.6.2] - 2017-11-28
### Changed
- Fix: incorrect package assets folder path.

## [0.6.1] - 2017-11-28
### Added
- Basic sent email history view.

### Changed
- Fix: using package assets if no user assets found.

## [0.6.0] - 2017-11-20
### Added
- Automatic reCaptcha.
- `reCaptchaSiteKey` config setting.
- `disableRecaptcha` config setting.

### Deleted
- `requireReCaptchaResponse` config setting.

## [0.5.0] - 2017-10-23
### Added
- Nodemailer `smtpTransport.SmtpOptions` config setting.
- HTML emails support.

### Deleted
- `smtpPort` config setting.
- `smtpHost` config setting.

## [0.4.0] - 2017-10-6
### Added
- AJAX data request support

## [0.3.3] - 2017-09-19
### Added
- HTTPS support.
- Ability to disable HTTP.

### Changed
- RefererUrl encoding fix.

## [0.3.2] - 2017-09-14
### Changed
- FIX: Start up failure because of incorrect version of node-static dependency.

## [0.3.1] - 2017-09-14
### Added
- Sending different forms to different recipients with `formTargets`.
- Test forms to `index.html`.
- Development config file in `test/config.test.json`.

## [0.3.0] - 2017-09-06
### Added
- Providing form URL in special field `_formurl` (will show up in email instead of referrer).
- Providing form name in special field `_formname` (will show up in emails).
- CONTRIBUTING.

### Changed
- Default URL path for submit handler is `/submit` instead of `/`.

### Deleted
- `httpServerPath` config setting.
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
