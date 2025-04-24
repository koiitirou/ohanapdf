// app/api/utils/gcsClient.js (例)
import { Storage } from "@google-cloud/storage";

let storageClient = null;

export const getGCSClient = () => {
  if (!storageClient) {
    let credentials;
    if (process.env.NODE_ENV === "production") {
      const credentialsString = process.env.GCS_CREDENTIALS_JSON;
      if (!credentialsString) {
        console.error(
          "GCS_CREDENTIALS_JSON environment variable not set in production."
        );
        throw new Error("GCS credentials not configured in production");
      }
      credentials = JSON.parse(credentialsString);
    } else {
      const credentialsPath = process.env.GCS_CREDENTIALS_JSON; // ローカルでは GCS_KEY_PATH に変更してもOK
      if (!credentialsPath) {
        console.error("GCS credentials path not set locally.");
        throw new Error("GCS credentials not configured locally");
      }
      const fs = require("fs");
      credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    }

    storageClient = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: credentials,
    });
  }
  return storageClient;
};
