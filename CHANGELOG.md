# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Export Functionality:** Added comprehensive markdown export and clipboard copy features across all pages (home/compare, battle-chat, debate, creative-combat) with consistent UI controls and safe filename generation
- **Raw Prompt Preview:** Implemented prompt transparency widgets on all pages allowing users to view the exact prompts sent to AI models via toggle buttons with Eye icon
- **Enhanced User Experience:** Users can now select the same model for both sides in debates, providing more flexibility for testing scenarios

### Fixed
- **Railway Deployment CSS:** Resolved an issue where CSS styles were missing in the production deployment on Railway. The root cause was that `tailwind.config.ts`, `postcss.config.js`, and `components.json` were not being copied into the Docker build context. The `Dockerfile` has been updated to include these files, ensuring Tailwind CSS is processed correctly during the build
- **Prompt Variable Substitution:** Fixed template variable replacement in debate.tsx ensuring dynamic values (topics, intensity levels, roles) are properly substituted in debate prompts
- **Missing Prompt Files:** Copied battle-prompts.md and creative-combat-prompts.md to client/public/docs/ directory to ensure all pages can load their respective prompt templates

### Changed
- **Debate Model Selection:** Removed restriction preventing users from selecting the same model for both debate sides, allowing for self-debate scenarios
- **UI Consistency:** Standardized export button placement and styling across all comparison modes
- **Code Organization:** Enhanced component structure with clear authorship attribution and improved code documentation

*Author: Claude 4 Sonnet Thinking BYOK*
