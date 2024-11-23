import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

const ResetPassword = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSendEmail = async () => { 
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setResetPasswordMode(true);
      setSuccessMessage("Um e-mail com instruções para redefinir sua senha foi enviado para o seu endereço de e-mail.");
      setErrorMessage("");
    } catch (error) {
      console.error("Erro ao enviar e-mail de redefinição de senha:", error.message);
      setErrorMessage("Ocorreu um erro ao enviar o e-mail de redefinição de senha. Por favor, verifique seu endereço de e-mail e tente novamente.");
      setSuccessMessage("");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.title}> Redefinir Senha</Text>
      {!resetPasswordMode ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Digite seu e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholderTextColor="#cfcfcf"
          />
          <TouchableOpacity style={styles.button} onPress={handleSendEmail}>
            <Ionicons name="send" size={24} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Enviar E-mail</Text>
          </TouchableOpacity>
          {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        </View>
      ) : (
        <Text style={styles.resetPasswordText}>  Verifique seu e-mail para instruções de redefinição de senha.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3c0c7b",
    paddingHorizontal: 20,
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
    color: "white",
  },
  title: {
    fontSize: 26,
    marginBottom: 30,
    color: "white",
    fontWeight: "bold",
  },
  inputContainer: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cfcfcf",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 15,
    backgroundColor: "#ffffff",
  },
  button: {
    backgroundColor: "#6a1b9a",
    paddingHorizontal: 30,
    borderRadius: 5,
    paddingVertical: 12,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  resetPasswordText: {
    fontSize: 16,
    textAlign: "center",
    color: "white",
    marginTop: 20,
  },
  successMessage: {
    color: "#4CAF50",
    textAlign: "center",
    marginTop: 10,
  },
  errorMessage: {
    color: "#ff0000",
    textAlign: "center",
    marginTop: 10,
  },
});

export default ResetPassword;

