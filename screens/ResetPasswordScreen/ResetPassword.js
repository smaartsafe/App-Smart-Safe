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
      setErrorMessage(""); // Limpar mensagem de erro se houver
    } catch (error) {
      console.error("Erro ao enviar e-mail de redefinição de senha:", error.message);
      setErrorMessage("Ocorreu um erro ao enviar o e-mail de redefinição de senha. Por favor, verifique seu endereço de e-mail e tente novamente.");
      setSuccessMessage(""); // Limpar mensagem de sucesso se houver erro
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Redefinir Senha</Text>
      {!resetPasswordMode ? (
        <View style={styles.inputContainer}>
          <View style={styles.input}>
            <TextInput
              placeholder="Digite seu e-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholderTextColor="#cfcfcf"
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleSendEmail}>
            <Text style={styles.buttonText}>Enviar E-mail</Text>
          </TouchableOpacity>
          {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        </View>
      ) : (
        <Text style={styles.resetPasswordText}>Verifique seu e-mail para instruções de redefinição de senha.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3c0c7b", // Cor roxa
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
    fontSize: 24,
    marginBottom: 20,
    color: "white",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    height: 40,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cfcfcf",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 10,
    maxWidth: 250,
    backgroundColor: "#ffffff", // Cor de fundo do input
  },
  button: {
    backgroundColor: "#6a1b9a", // Cor roxa mais escura
    paddingHorizontal: 15,
    borderRadius: 5,
    paddingVertical: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  resetPasswordText: {
    fontSize: 16,
    textAlign: "center",
    color: "white",
  },
  successMessage: {
    color: "#4CAF50", // Verde
    textAlign: "center",
    marginTop: 10,
  },
  errorMessage: {
    color: "#ff0000", // Vermelho
    textAlign: "center",
    marginTop: 10,
  },
});

export default ResetPassword;
