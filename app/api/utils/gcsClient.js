import { Storage } from "@google-cloud/storage";

let storageClient = null;

export const getGCSClient = () => {
  if (!storageClient) {
    let credentials;
    // Try GCS_CREDENTIALS_JSON first
    let credentialsData = process.env.GCS_CREDENTIALS_JSON;

    // Fallback to GOOGLE_CREDENTIALS
    if (!credentialsData) {
      console.log("GCS_CREDENTIALS_JSON not found, using GOOGLE_CREDENTIALS");
      credentialsData = process.env.GOOGLE_CREDENTIALS;
    } else {
      console.log("Using GCS_CREDENTIALS_JSON for GCS authentication");
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
