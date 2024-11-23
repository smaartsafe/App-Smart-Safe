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
import { Accelerometer } from "expo-sensors";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [shakeDetected, setShakeDetected] = useState(false);

  const handleLogin = async () => {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, senha);
      await SecureStore.setItemAsync("userEmail", email);
      await SecureStore.setItemAsync("userPassword", senha);
      navigation.navigate("MainTabs");
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      Alert.alert("Erro", "Email ou senha incorretos.");
    }
  };

  useEffect(() => {
    Accelerometer.setUpdateInterval(200); // Atualizar a cada 200ms
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const totalForce = Math.sqrt(x * x + y * y + z * z);
      if (totalForce > 1.5) { // Sensibilidade ao movimento
        setShakeDetected(true);
      }
    });

    // Limpar o listener quando o componente for desmontado
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (shakeDetected) {
      handleLogin(); // Realizar login automaticamente
      setShakeDetected(false); // Resetar o estado do shake
    }
  }, [shakeDetected]);

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
