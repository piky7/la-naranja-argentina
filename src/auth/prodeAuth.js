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

// Un único observador Firebase para toda la aplicación. Los componentes se
// suscriben a este emisor compartido en lugar de abrir listeners independientes.
const authSubscribers = new Set();
let authObserverPromise = null;
let latestAuthUser = null;
let hasAuthState = false;

async function ensureSharedAuthObserver() {
  if (authObserverPromise) return authObserverPromise;
  authObserverPromise = (async () => {
    const { authSdk, auth } = await sdk();
    return authSdk.onAuthStateChanged(auth, user => {
      latestAuthUser = user;
      hasAuthState = true;
      for (const subscriber of [...authSubscribers]) {
        try { subscriber(user); } catch (error) {
          console.error("LNA: error notificando sesión Google", error);
        }
      }
    });
  })().catch(error => {
    authObserverPromise = null;
    throw error;
  });
  return authObserverPromise;
}

export async function watchProdeUser(callback) {
  if (typeof callback !== "function") throw new TypeError("Se requiere una función para observar la sesión");
  authSubscribers.add(callback);
  try {
    await ensureSharedAuthObserver();
    if (hasAuthState && authSubscribers.has(callback)) callback(latestAuthUser);
  } catch (error) {
    authSubscribers.delete(callback);
    throw error;
  }
  return () => authSubscribers.delete(callback);
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

// Devuelve null si no hay sesión: las votaciones anónimas de Mi Carrera siguen funcionando.
export async function getOptionalProdeIdToken() {
  const { auth } = await sdk();
  await auth.authStateReady();
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}
