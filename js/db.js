const Supabase = (() => {
  let supabase;
  const bucketName = "files";
  const basePath = `projects/${PROJECT_NAME}`;

  function init() {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      accessToken: async () => {
        if (!currentAuthUser) return null;

        // Get the fresh Firebase JWT
        return await currentAuthUser.getIdToken();
      },
    });
  }

  async function uploadFile(file, path) {
    try {
      path = `${basePath}/${path}`;

      const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // Get the Public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);

      console.log("Supabase: File uploaded successfully.");
      return publicUrlData.publicUrl;
    } catch (error) {
      handleError(error);
    }
  }

  async function removeFile(path = "") {
    try {
      path = `${basePath}/${currentUser.id}${path}`;

      const { data: removeData, error: removeError } = await supabase.storage.from(bucketName).remove([path]);

      if (removeError) throw new Error(removeError.message);

      console.log("Supabase: File removed successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteStorageItem(path) {
    const apiUrl = `https://kgdee-firebase-functions.netlify.app/.netlify/functions/delete-storage-item?path=${encodeURIComponent(path)}`;
    const response = await fetch(apiUrl, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(result.error || "Failed to delete storage item");
    }

    const result = await response.json();

    return result;
  }

  function convertPublicUrl(publicUrl) {
    // Construct the segment to split by based on the public URL structure
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const urlParts = publicUrl.split(marker);

    // Extract and decode the file path
    const filePath = decodeURIComponent(urlParts[1]);
    return filePath;
  }

  return { init, uploadFile, deleteStorageItem };
})();

const Firebase = (() => {
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: CONFIG.FIREBASE_API_KEY,
    authDomain: CONFIG.FIREBASE_AUTH_DOMAIN,
    projectId: CONFIG.FIREBASE_PROJECT_ID,
    storageBucket: CONFIG.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: CONFIG.FIREBASE_MESSAGING_SENDER_ID,
    appId: CONFIG.FIREBASE_APP_ID,
  };

  let app;
  let db;
  let auth;

  let unsubscribe = { user: null };

  // Initialize Firebase
  function init(onAuthStateChanged) {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();

    // Listen for auth state changes
    auth.onAuthStateChanged(onAuthStateChanged);
  }

  function getCollection(name) {
    return db.collection(`projects/${PROJECT_NAME}/${name}`);
  }

  async function docExists(collectionName, id) {
    const docSnap = await getCollection(collectionName).doc(id).get();
    if (!docSnap.exists) return false;
    return true;
  }

  async function getTotalDocuments(collectionPath) {
    try {
      const snapshot = await db.collection(collectionPath).get();

      return snapshot.size;
    } catch (error) {
      handleError(error);
    }
  }

  function getUserName() {
    const user = currentUser;
    return user.name || user.displayName || user.email || "Anonymous User";
  }

  function getUserAvatarUrl() {
    return currentUser.avatarUrl || currentUser.photoURL || null;
  }

  async function login(data) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(data.email, data.password);
      notify("Logged in successfully.");
      return userCredential.user;
    } catch (error) {
      handleError(error);
    }
  }

  async function loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const userCredential = await auth.signInWithPopup(provider);

      notify("Logged in successfully.");
      return userCredential.user;
    } catch (error) {
      handleError(error);
    }
  }

  async function signup(data) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(data.email, data.password);
      const user = userCredential.user;
      await user.sendEmailVerification();

      notify("Account created successfully.");
      return user;
    } catch (error) {
      handleError(error);
    }
  }

  async function logout() {
    try {
      await auth.signOut();
      notify("Logged out successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function applyActionCode() {
    try {
      await auth.applyActionCode(oobCode);
    } catch (error) {
      handleError(error);
    }
  }

  async function sendPasswordResetEmail(email) {
    try {
      await auth.sendPasswordResetEmail(email);
      notify("Password reset email sent.");
    } catch (error) {
      handleError(error);
    }
  }

  async function getTotalAuthUsers() {
    const apiUrl = "https://kgdee-firebase-functions.netlify.app/.netlify/functions/count-auth-users";
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(data.error || "Failed to get total auth users.");
    }

    const data = await response.json();

    return data.totalUsers;
  }

  async function createDocument(documentPath) {
    try {
      await db.doc(documentPath).set({});

      notify("Document created successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function getDocument(path) {
    try {
      const docSnap = await db.doc(path).get();

      if (docSnap.exists) {
        const docData = docSnap.data();
        const document = { id: docSnap.id, ...docData };

        return document;
      }

      return null;
    } catch (error) {
      handleError(error);
    }
  }

  async function getDocuments(collectionPath) {
    try {
      const documentsQS = await db.collection(collectionPath).get();

      const documents = documentsQS.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      return documents;
    } catch (error) {
      handleError(error);
    }
  }

  function loadDocuments(collectionPath, onLoaded) {
    let documentsRef = db.collection(collectionPath);

    if (unsubscribe.documents) unsubscribe.documents();
    unsubscribe.documents = documentsRef.onSnapshot(
      (snapshot) => {
        let documents = [];
        snapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });

        onLoaded(documents);
      },
      (error) => {
        handleError(error);
      },
    );
  }

  async function setDocument(path, data) {
    try {
      const docRef = db.doc(path);

      // Find and upload any property whose value is a File
      const uploadPromises = Object.keys(data).map(async (key) => {
        if (data[key] instanceof File) {
          const userId = data.authorId || currentAuthUser.uid;
          const path = `${userId}/posts/${docRef.id}/image.png`;
          console.log("data[key]", data[key]);
          data[key] = await Supabase.uploadFile(data[key], path);
          console.log("data[key]", data[key]);
        }
      });

      // Wait for all file uploads to complete
      await Promise.all(uploadPromises);

      data.timestamp = firebase.firestore.FieldValue.serverTimestamp();

      await docRef.set(data);

      notify("Document updated successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteDocument(path) {
    try {
      const docRef = db.doc(path);
      await docRef.delete();

      notify("Document deleted successfully.");
      return true;
    } catch (error) {
      handleError(error);
    }
  }

  async function listCollections(documentPath) {
    try {
      const encodedPath = encodeURIComponent(documentPath);
      const apiUrl = `https://kgdee-firebase-functions.netlify.app/.netlify/functions/list-collections?path=${encodedPath}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      return data.collections;
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteItem(path) {
    try {
      if (!currentAuthUser) {
        throw new Error("Failed to delete item: Authentication required.");
      }

      // Get the Firebase ID token (forces a refresh if expired)
      const token = await currentAuthUser.getIdToken();
      const url = `https://kgdee-firebase-functions.netlify.app/.netlify/functions/delete-store-item?path=${encodeURIComponent(path)}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item.");
      }

      notify("Item deleted successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  return {
    auth,
    init,
    login,
    loginWithGoogle,
    signup,
    logout,
    applyActionCode,
    sendPasswordResetEmail,
    getTotalAuthUsers,
    getTotalDocuments,
    createDocument,
    getDocument,
    getDocuments,
    loadDocuments,
    setDocument,
    deleteDocument,
    listCollections,
    deleteItem,
  };
})();
