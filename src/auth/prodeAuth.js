import { prodeFirebaseConfig } from "../config/prodeFirebase";

// SDK modular oficial servido desde Google; evita modificar el lockfile de LNA.
let sdkPromise;
async function sdk() {
  if (!sdkPromise) sdkPromise = Promise.all([
    import(/* @vite-ignore */ "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js"),
    import(/* @vite-ignore */ "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js"),
  ]).then(([appSdk, authSdk]) => {
    const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(prodeFirebaseConfig);
    const auth = authSdk.getAuth(app);
    const provider = new authSdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return { authSdk, auth, provider };
  });
  return sdkPromise;
}

export async function watchProdeUser(callback) {
  const { authSdk, auth } = await sdk();
  return authSdk.onAuthStateChanged(auth, callback);
}

export async function signInProdeWithGoogle() {
  const { authSdk, auth, provider } = await sdk();
  return authSdk.signInWithPopup(auth, provider);
}

export async function signOutProde() {
  const { authSdk, auth } = await sdk();
  return authSdk.signOut(auth);
}

export async function getProdeIdToken() {
  const { auth } = await sdk();
  if (!auth.currentUser) throw new Error("Iniciá sesión para continuar");
  return auth.currentUser.getIdToken();
}
