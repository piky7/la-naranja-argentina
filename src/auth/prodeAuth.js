import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { prodeFirebaseConfig } from "../config/prodeFirebase";

const app = getApps().length ? getApp() : initializeApp(prodeFirebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export function watchProdeUser(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInProdeWithGoogle() {
  // En navegadores móviles / PWA, redirect puede ser más fiable que popups.
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) {
    return signInWithRedirect(auth, provider);
  }
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/operation-not-supported-in-this-environment") {
      return signInWithRedirect(auth, provider);
    }
    throw error;
  }
}

export const completeProdeRedirect = () => getRedirectResult(auth);
export const signOutProde = () => signOut(auth);
