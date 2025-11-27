import { Storage } from "@google-cloud/storage";

let storageClient = null;

export const getGCSClient = () => {
  if (!storageClient) {
    let credentials;
    // Try GOOGLE_CREDENTIALS2 first (as requested by user)
    let credentialsData = process.env.GOOGLE_CREDENTIALS2;

    // Fallback to GCS_CREDENTIALS_JSON or GOOGLE_CREDENTIALS
    if (!credentialsData) {
      console.log("GOOGLE_CREDENTIALS2 not found, checking other variables");
      credentialsData = process.env.GCS_CREDENTIALS_JSON || process.env.GOOGLE_CREDENTIALS;
    } else {
      console.log("Using GOOGLE_CREDENTIALS2 for GCS authentication");
    }

    if (!credentialsData) {
      console.error("GCS credentials not found in environment variables.");
      throw new Error("GCS credentials not configured");
    }

    // Check if it's a file path or JSON string
    if (credentialsData.trim().startsWith("{")) {
      try {
        credentials = JSON.parse(credentialsData);
      } catch (e) {
        console.error("Failed to parse credentials JSON string. Length:", credentialsData.length);
        console.error("First 20 chars:", credentialsData.substring(0, 20));
        console.error("Last 20 chars:", credentialsData.substring(credentialsData.length - 20));
        console.error("Error details:", e.message);
        throw new Error("Invalid credentials JSON");
      }
    } else {
      // Assume it's a path
      const fs = require("fs");
      try {
        credentials = JSON.parse(fs.readFileSync(credentialsData, "utf8"));
      } catch (e) {
        console.error("Failed to read credentials file from path", e);
        throw new Error("Invalid credentials file path");
      }
    }

    storageClient = new Storage({
      projectId: process.env.GCS_PROJECT_ID || credentials.project_id || "api1-346604",
      credentials: credentials,
    });

    console.log("GCS Client initialized with email:", credentials.client_email);
  }
  return storageClient;
};
