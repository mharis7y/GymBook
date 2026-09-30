// Centralized image imports per AGENTS.md Image Rule
// All brand images now live in assets/images/ — old Expo template images removed.

// Main Taj Fitness logo (1024×1024, full icon with Emerald Ink + Champagne)
const appIcon = require('../../assets/images/icon.png');

// Design reference — internal use only, never rendered in production UI
const designSystem = require('../../assets/images/design-system.png');

export const images = {
  // Use appIcon wherever the Taj Fitness logo is needed (login, onboarding, dashboard header, etc.)
  appIcon,
  // Design reference — do not use in production UI
  designSystem,
};
