const path = require('node:path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');

// ============= Environment Setup =============
dotenv.config({ path: envPath, quiet: true });

const checks = {
  dmapi: checkDistanceMatrixApi,
};

const checkName = process.argv[2];

if (!checkName || !checks[checkName]) {
  console.error(`Unknown check "${checkName ?? ''}". Available checks: ${Object.keys(checks).join(', ')}`);
  process.exit(1);
}

checks[checkName]();

function checkDistanceMatrixApi() {
  // ============= Distance Matrix API =============
  const apiKey = process.env.GOOGLE_DISTANCE_MATRIX_API_KEY;

  if (!apiKey) {
    console.error('Distance Matrix API check failed: GOOGLE_DISTANCE_MATRIX_API_KEY is missing in .env');
    process.exit(1);
  }

  // --------------------- Local Key Validation ------------------
  if (!apiKey.startsWith('AIza')) {
    console.error('Distance Matrix API check failed: GOOGLE_DISTANCE_MATRIX_API_KEY does not look like a Google API key');
    process.exit(1);
  }

  console.log(`Distance Matrix API check passed: GOOGLE_DISTANCE_MATRIX_API_KEY is configured (${maskValue(apiKey)})`);
}

function maskValue(value) {
  // ============= Secret Masking =============
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
