# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Railway Deployment CSS:** Resolved an issue where CSS styles were missing in the production deployment on Railway. The root cause was that `tailwind.config.ts`, `postcss.config.js`, and `components.json` were not being copied into the Docker build context. The `Dockerfile` has been updated to include these files, ensuring Tailwind CSS is processed correctly during the build.
