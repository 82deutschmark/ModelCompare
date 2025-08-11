# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Modular Prompt System:** Implemented a dynamic prompt template system for the main compare mode.
    - Prompts are now stored in `client/public/docs/compare-prompts.md` for easy user extension.
    - A new utility `client/src/lib/promptParser.ts` loads and parses prompts at runtime.
    - The UI in the main compare page (`client/src/pages/home.tsx`) now features dropdowns to select prompt categories and templates, appearing directly under the prompt input area.
- **UI Enhancements:**
    - Moved the prompt template selection UI from the sidebar to a more intuitive position under the prompt input.
    - Added a "Clear" button to easily revert to a custom prompt.
    - Toast notifications now confirm when a prompt template is applied.

### Changed
- **Component Refactoring:** Removed hardcoded prompt examples from `home.tsx` in favor of the new dynamic system.
- **Project Structure:** The prompt markdown file is now located in the `client/public/docs/` directory to ensure it's accessible via HTTP for fetching.

### Fixed
- Resolved an issue where the prompt template UI would not render because the markdown file was not in a publicly served directory.

### Documentation
- Updated `README.md` with a "Features" section detailing the new modular prompt system.
