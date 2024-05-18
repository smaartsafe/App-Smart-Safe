import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage'; // Importe apenas uma vez a função getStorage
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDOr0RJ7rQYtJfzpnXccJevPmcJ-EFZooc",
  authDomain: "app-react-native-853b9.firebaseapp.com",
  databaseURL: "https://app-react-native-853b9-default-rtdb.firebaseio.com",
  projectId: "app-react-native-853b9",
  storageBucket: "app-react-native-853b9.appspot.com",
  messagingSenderId: "596018882387",
  appId: "1:596018882387:web:90b5f03d93b64d473363a6"
};

// Obtenha uma referência para o banco de dados e para o sistema de autenticação (caso necessário)
const app = initializeApp(firebaseConfig);

// Inicialize o Firebase Auth com AsyncStorage para persistência
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Obtenha uma referência para o Firestore
const db = getFirestore();

// Obtenha uma referência para o Firebase Storage
const storage = getStorage(app);

export { app, auth, getAuth, db, storage }; // Adicione "storage" à exportação
