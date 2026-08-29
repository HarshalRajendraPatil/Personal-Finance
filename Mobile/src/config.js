import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // If explicitly specified in environment
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If running on web in browser
  if (Platform.OS === 'web') {
    return 'http://192.168.29.192:8080/api';
  }

  // Extract host from Expo constants (works when running in Expo Go on real device or simulator)
  const hostUri = Constants.expoConfig?.hostUri || Constants.experienceUrl;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8080/api`;
    }
  }

  // Fallback for Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  }

  // Default to system local IP
  return 'http://192.168.29.192:8080/api';
};

export const API_URL = getBaseUrl();

export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: 'thomas-shelby',
  UPLOAD_PRESET: 'finance-preset',
};

console.log('[Finora Mobile] API Base URL configured to:', API_URL);
