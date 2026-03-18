import { useAuth } from "@clerk/expo";
import axios from "axios";
import Constants from "expo-constants";
import { useEffect } from "react";



// Dynamically determine the API URL based on the environment
const getBaseUrl = () => {
  // If we have an environment variable, use it (highest priority)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If we're in development, use the local IP
  // if (__DEV__) {
  //   // Constants.expoConfig?.hostUri is the best way to find your machine's IP in Expo
  //   const hostUri = Constants.expoConfig?.hostUri;
  //   const host = hostUri ? hostUri.split(':')[0] : '127.0.0.1';

  //   return `http://${host}:3000/api/`;
  // }

  // Fallback to production URL
  return "https://finalprojecttopup-2533t.sevalla.app/api/";
};
const API_URL = getBaseUrl();

console.log("[API] Using Base URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Add a timeout so it doesn't hang forever
});

// Module-level flag: log the Clerk offline warning only ONCE per session
let hasLoggedOfflineWarning = false;

export const useApi = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // We use a request interceptor to inject the token
    const interceptor = api.interceptors.request.use(async (config) => {
      try {
        // Only attempt to get token if Clerk is loaded and user is signed in
        if (isLoaded && isSignedIn) {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error: any) {
        // If Clerk says we're offline (clerk_offline), log it ONCE to avoid flooding
        // The backend will handle the unauthorized response if a token was strictly required
        if (error?.code === "clerk_offline") {
          if (!hasLoggedOfflineWarning) {
            hasLoggedOfflineWarning = true;
            console.warn("[Clerk] Offline: Proceeding without token (this warning will not repeat)");
          }
        } else {
          console.error("[Clerk] Token error:", error);
        }
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return api;
};

// on every single req, we would like have an auth token so that our backend knows that we're authenticated
// we're including the auth token under the auth headers