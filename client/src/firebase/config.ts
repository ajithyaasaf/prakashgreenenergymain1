import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBo8D4pTG6oNGg4qy7V4AaC73qfAB0HRcc",
  authDomain: "solar-energy-56bc8.firebaseapp.com",
  databaseURL: "https://solar-energy-56bc8-default-rtdb.firebaseio.com",
  projectId: "solar-energy-56bc8",
  storageBucket: "solar-energy-56bc8.firebasestorage.app",
  messagingSenderId: "833087081002",
  appId: "1:833087081002:web:10001186150884d311d153",
  measurementId: "G-2S9TJM6E3C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Initialize analytics only if supported in the current environment
export let analytics = null;
// Initialize analytics conditionally
const initializeAnalytics = async () => {
  try {
    if (await isSupported()) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized successfully");
    } else {
      console.log("Firebase Analytics not supported in this environment");
    }
  } catch (error) {
    console.error("Error initializing Firebase Analytics:", error);
  }
};

// Call the function but don't wait for it
initializeAnalytics();

export default app;
