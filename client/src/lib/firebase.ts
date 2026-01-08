import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAilVgG6mO3XYVXOWSXSmJdgFI6WP3FLZo",
    authDomain: "sillo-42acd.firebaseapp.com",
    projectId: "sillo-42acd",
    storageBucket: "sillo-42acd.firebasestorage.app",
    messagingSenderId: "452459402550",
    appId: "1:452459402550:web:5e8194824b51a6794b4f97",
    measurementId: "G-BDBXXEDP0D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
