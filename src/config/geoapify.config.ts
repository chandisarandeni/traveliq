import { registerAs } from '@nestjs/config';

export const GEOAPIFY_CONFIG_KEY = 'geoapify';
export const GEOAPIFY_API_KEY = 'GEOAPIFY_API_KEY';

export default registerAs(GEOAPIFY_CONFIG_KEY, () => {
  // ============= Geoapify =============
  const apiKey = process.env[GEOAPIFY_API_KEY];

  if (!apiKey) {
    throw new Error('GEOAPIFY_API_KEY is missing in the environment file');
  }

  return {
    apiKey,
  };
});
