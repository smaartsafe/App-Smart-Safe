import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      const isBiometricAvailable =
        (await LocalAuthentication.hasHardwareAsync()) &&
        (await LocalAuthentication.isEnrolledAsync());
      let isAuthenticated = false;

      if (isBiometricAvailable) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Autenticação",
        });
        isAuthenticated = result.success;
      } else {
        // Se a autenticação biométrica não estiver disponível, solicite a senha do dispositivo
        isAuthenticated = await LocalAuthentication.authenticateAsync({
          promptMessage: "Autenticação de senha do dispositivo",
        });
      }

      if (isAuthenticated) {
        const auth = getAuth();
        const login = await signInWithEmailAndPassword(auth, email, senha);
        await SecureStore.setItemAsync("userEmail", email);
        await SecureStore.setItemAsync("userPassword", senha);
        navigation.navigate("MainTabs");
      } else {
        Alert.alert(
          "Erro",
          "Autenticação biométrica ou de senha do dispositivo falhou. Por favor, tente novamente."
        );
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      setErrorMessage("Email ou senha incorretos. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync("userEmail");
      await SecureStore.deleteItemAsync("userPassword");
    } catch (error) {
      console.error("Erro ao limpar credenciais:", error);
    }
  };

  useEffect(() => {
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
        clearCredentials();
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Login</Text>
        <View style={styles.inputGroup}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Senha:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!showPassword}
                placeholderTextColor="white"
              />
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                style={styles.icon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("ResetPassword")}
          style={styles.forgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
        </TouchableOpacity>

        <Text style={styles.errorText}>{errorMessage}</Text>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <View style={styles.buttonContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color="black" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
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
    fontSize: 24,
    marginBottom: 20,
    color: "white",
  },
  inputGroup: {
    marginBottom: 5,
    width: "80%",
  },
  formGroup: {
    marginBottom: 10,
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
    marginBottom: 5,
    paddingHorizontal: 10,
    color: "white",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 40,
    left: 20,
  },
  backText: {
    fontSize: 16,
    marginLeft: 5,
  },
  icon: {
    right: 10,
    top: 8,
    position: "absolute",
  },
  forgotPassword: {
    marginBottom: 20,
    alignSelf: "flex-end",
    right: 40,
  },
  forgotPasswordText: {
    fontWeight: "bold",
    textDecorationLine: "underline",
    color: "white",
  },
  button: {
    backgroundColor: "white",
    paddingHorizontal: 25,
    paddingVertical: 7,
    borderRadius: 5,
  },
  buttonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    marginBottom: 5,
  },
});

export default LoginScreen;
