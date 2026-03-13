import { useAuth } from "@clerk/expo";
import axios from "axios";
import { useEffect } from "react";

import Constants from "expo-constants";

// Dynamically determine the API URL based on the environment
const getBaseUrl = () => {
  // If we're in production, return the production URL
  // return "https://finalprojecttopup-2533t.sevalla.app/api";

  // For development:
  // Constants.expoConfig?.hostUri is the best way to find your machine's IP in Expo
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  
  return `http://${host}:3000/api`;
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
        // If Clerk says we're offline (clerk_offline), we log it but don't crash the request
        // The backend will handle the unauthorized response if a token was strictly required
        if (error?.code === "clerk_offline") {
          console.warn("[Clerk] Offline: Proceeding without token");
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