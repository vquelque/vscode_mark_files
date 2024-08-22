# Change Log

All notable changes to the "Mark Files" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2023-03-12

## [1.1.0] - 2023-04-11

### Added

- Mark/Unmark multiple files from the file explorer (Thanks @UsmannK)
- Switch to '.gitignore format' for the `scope.txt` file (Thanks @DavidBDiligence)
- Switch from disk-based storage to workspace memory (for future web compatibility)
- Add a feature to export marked files to a custom file on disk

## [1.1.1] - 2023-05-11

### Added

- Mark/Unmark folders from the file explorer (this will mark/unmark every subfile/subfolder)

### Changed

- Formatted files using Prettier.

## [1.1.2] - 2024-06-03

- Fix: empty decoration errors in last vscode builds
- Bump dependencies

### [1.1.3] - 2024-07-02

- Fix: Import/Export marked files from scope file on Windows systems.

### [1.1.4] - 2024-08-22

- Fix: Support relative paths starting with `./` in scope file (Thanks @X1pherW0lf)
