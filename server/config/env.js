function getEnv(name, { required = false, defaultValue } = {}) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (required) throw new Error(`Missing required env var: ${name}`);
    return defaultValue;
  }
  return value;
}

function loadConfig() {
  return {
    nodeEnv: getEnv("NODE_ENV", { defaultValue: "development" }),
    port: Number(getEnv("PORT", { defaultValue: "5000" })),
    mongoUri: getEnv("MONGO_URI", { required: true }),
    jwtSecret: getEnv("JWT_SECRET", { required: true }),
    publicApiBaseUrl: getEnv("PUBLIC_API_BASE_URL", { defaultValue: "" }),
    chromePath: getEnv("CHROME_PATH", { defaultValue: "" }),
  };
}

module.exports = { loadConfig };

