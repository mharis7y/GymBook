const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Map the @/ alias to the src/ directory so Metro can resolve imports like @/store/AuthContext
config.resolver.alias = {
  "@": path.resolve(__dirname, "src"),
};

module.exports = withNativeWind(config);
