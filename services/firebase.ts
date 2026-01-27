import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAkBkZd56gRLePRwugO0UTiSiLZJD7CJ6w",
  authDomain: "starsmmpanel-529dd.firebaseapp.com",
  databaseURL: "https://starsmmpanel-529dd-default-rtdb.firebaseio.com",
  projectId: "starsmmpanel-529dd",
  storageBucket: "starsmmpanel-529dd.firebasestorage.app",
  messagingSenderId: "713788727686",
  appId: "1:713788727686:web:f2bc3522975f504b7fcc07",
  measurementId: "G-TX1P5C8RRY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
