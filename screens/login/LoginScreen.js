import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const handleLogin = async () => {
    try {
      // Verifica se a biometria é suportada
      const isBiometricAvailable = await LocalAuthentication.hasHardwareAsync();
      if (isBiometricAvailable) {
        const { success } = await LocalAuthentication.authenticateAsync({
          promptMessage: "Autentique-se para continuar",
          fallbackLabel: "Usar senha",
        });

        if (success) {
          const auth = getAuth();
          await signInWithEmailAndPassword(auth, email, senha);
          await SecureStore.setItemAsync("userEmail", email);
          await SecureStore.setItemAsync("userPassword", senha);
          navigation.navigate("MainTabs");
        } else {
          Alert.alert("Erro", "Falha na autenticação biométrica");
        }
      } else {
        // Se biometria não estiver disponível, realiza o login com email e senha
        const auth = getAuth();
        await signInWithEmailAndPassword(auth, email, senha);
        await SecureStore.setItemAsync("userEmail", email);
        await SecureStore.setItemAsync("userPassword", senha);
        navigation.navigate("MainTabs");
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      Alert.alert("Erro", "Email ou senha incorretos.");
    }
  };

  useEffect(() => {
    // Verificar se o dispositivo suporta biometria
    const checkBiometricSupport = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
    };
    checkBiometricSupport();
  }, []);

  useEffect(() => {
    // Carregar as credenciais salvas (se houver) quando o componente for montado
    const loadCredentials = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync("userEmail");
        const savedSenha = await SecureStore.getItemAsync("userPassword");
        if (savedEmail && savedSenha) {
          setEmail(savedEmail);
          setSenha(savedSenha);
        }
      } catch (error) {
        console.error("Erro ao carregar credenciais:", error);
      }
    };

    loadCredentials();
  }, []);

  return (
    <ImageBackground
      source={require("../../src/assets/BackgroundNovo.png")}
      style={styles.background}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="white"
            placeholder="Digite seu email"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha:</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={true}
            placeholderTextColor="white"
            placeholder="Digite sua senha"
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <View style={styles.buttonContent}>
            <Ionicons name="log-in" size={24} color="black" />
            <Text style={styles.buttonText}>Entrar</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    color: "white",
    fontWeight: "bold",
  },
  inputGroup: {
    marginBottom: 20,
    width: "80%",
  },
  label: {
    marginBottom: 5,
    fontWeight: "bold",
    color: "white",
  },
  input: {
    width: "100%",
    height: 40,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    paddingHorizontal: 10,
    color: "white",
  },
  button: {
    backgroundColor: "white",
    paddingHorizontal: 25,
    paddingVertical: 7,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonContent: {
    flexDirection: "row",
    gap: 3,
  },
  buttonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default LoginScreen;
