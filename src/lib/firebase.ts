import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection to Firestore lazily without blocking module execution
setTimeout(async () => {
  try {
    const testDoc = doc(db, "test", "connection");
    await getDocFromServer(testDoc);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error(
        "Firestore is offline. Please check your Firebase configuration or internet connection.",
      );
    }
  }
}, 3000);
