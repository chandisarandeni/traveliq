import { registerAs } from '@nestjs/config';

export const GOOGLE_DISTANCE_MATRIX_CONFIG_KEY = 'googleDistanceMatrix';
export const GOOGLE_DISTANCE_MATRIX_API_KEY = 'GOOGLE_DISTANCE_MATRIX_API_KEY';

export default registerAs(GOOGLE_DISTANCE_MATRIX_CONFIG_KEY, () => {
  // ============= Google Distance Matrix =============
  const apiKey = process.env[GOOGLE_DISTANCE_MATRIX_API_KEY];

  if (!apiKey) {
    throw new Error('GOOGLE_DISTANCE_MATRIX_API_KEY is missing in the environment file');
  }

  return {
    apiKey,
  };
});
