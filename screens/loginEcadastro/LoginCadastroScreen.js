import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ImageBackground,
  Linking,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { useFonts } from "expo-font";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CheckBox = ({ checked, onChange }) => (
  <TouchableOpacity style={styles.checkbox} onPress={onChange}>
    <View style={[styles.checkboxIcon, checked && styles.checked]} />
  </TouchableOpacity>
);

const LoginCadastroScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [hideWelcomeModal, setHideWelcomeModal] = useState(false);
  const [modalShown, setModalShown] = useState(false);

  const handleOk = () => {
    setShowWelcomeModal(false);
    AsyncStorage.setItem("welcomeModalShown", "true");
    navigation.navigate("LoginCadastro"); // Redireciona para a tela principal após o login
  };

  const [fontsLoaded] = useFonts({
    Roboto: require("../../src/fonts/Roboto-Thin.ttf"),
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    checkUserLoggedIn();

    AsyncStorage.getItem("welcomeModalShown").then((value) => {
      if (!value) {
        setShowWelcomeModal(true);
      } else {
        setHideWelcomeModal(true);
      }
    });
  }, []);

  const checkUserLoggedIn = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync("userEmail");
      const savedSenha = await SecureStore.getItemAsync("userPassword");
      if (savedEmail && savedSenha) {
        // Verificar se a autenticação biométrica está disponível
        const isBiometricAvailable =
          (await LocalAuthentication.hasHardwareAsync()) &&
          (await LocalAuthentication.isEnrolledAsync());
        let isAuthenticated = false;

        if (isBiometricAvailable) {
          // Se disponível, solicitar autenticação biométrica
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Autenticação",
          });
          isAuthenticated = result.success;
        } else {
          // Se autenticação biométrica não estiver disponível, solicitar autenticação de senha do dispositivo
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Autenticação de senha do dispositivo",
          });
          isAuthenticated = result.success;
        }

        if (isAuthenticated) {
          setShowWelcomeModal(true);
          navigation.navigate("MainTabs");
        } else {
          // Se a autenticação falhar, navegar para a tela de login
          navigation.navigate("Login");
        }
      }
    } catch (error) {
      console.error("Erro ao verificar o estado de autenticação:", error);
    }
  };

  const handleEntrar = () => {
    navigation.navigate("Login");
  };

  const handleCadastrar = () => {
    if (isChecked) {
      navigation.navigate("Cadastro");
    } else {
      setError("Você precisa aceitar os Termos e Condições.");
    }
  };

  const handleTermsAndConditions = () => {
    // Abrir o link para os termos e condições em um navegador
    Linking.openURL("https://www.exemplo.com/termos-e-condicoes");
  };

  if (!fontsLoaded) {
    return null; // ou uma tela de carregamento, ou null se preferir
  }

  return (
    <ImageBackground
      source={require("../../src/assets/BackgroundInicio2.png")}
      style={styles.backgroundImage}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.ContainerLogo}>
          <Image
            source={require("../../src/assets/FundoSplash.png")}
            style={styles.logo}
          ></Image>
        </View>
        <View style={styles.containerText}>
          <Text style={styles.TextTitle}>Smart Safe</Text>
          <Text style={styles.TextDescription}>
            A segurança imediata na palma da sua mão!
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.buttonCadastro}
            onPress={handleCadastrar}
          >
            <Text style={styles.buttonTextCadastro}>Cadastra-se</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonLogin} onPress={handleEntrar}>
            <Text style={styles.buttonTextLogin}>Entrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <CheckBox
            checked={isChecked}
            onChange={() => {
              setIsChecked(!isChecked);
              setError(""); // Limpa o erro quando o usuário marca ou desmarca o checkbox
            }}
          />
          <TouchableOpacity onPress={handleTermsAndConditions}>
            <Text style={styles.termsText}>
              Li e aceito os Termos e Condições
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Modal de boas-vindas */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showWelcomeModal && !hideWelcomeModal && !modalShown} // Condição para exibir o modal
        onRequestClose={() => {
          setShowWelcomeModal(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bem-vindo ao Smart Safe!</Text>
            <ScrollView style={styles.descriptionScrollView}>
              <Text style={styles.modalDescription}>
                • O aplicativo está em fase de desenvolvimento e pode conter
                bugs e erros.{"\n"}• Estamos trabalhando para melhorar a
                experiência do usuário e corrigir quaisquer problemas
                encontrados durante o uso.{"\n"}• Agradecemos sua paciência e
                colaboração enquanto continuamos a desenvolver e aprimorar o
                aplicativo.{"\n"}• Se você encontrar algum bug ou tiver alguma
                sugestão de melhoria, por favor, nos informe para que possamos
                abordá-lo o mais rápido possível.{"\n"}
              </Text>
            </ScrollView>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleOk}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 30,
  },
  logo: {
    width: 180,
    height: 180,
  },

  containerText: {
    width: "90%",
    alignItems: "center",
    gap: 10,
  },
  TextTitle: {
    fontSize: 34,
    fontWeight: "500",
    color: "white",
  },
  TextDescription: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    fontWeight: "200",
  },
  buttonsContainer: {
    alignItems: "center",
    gap: 20,
  },
  buttonCadastro: {
    backgroundColor: "white",
    paddingVertical: 7,
    paddingHorizontal: 50,
    borderRadius: 5,
  },
  buttonTextCadastro: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 22,
    color: "#3c0c7b",
  },
  buttonTextLogin: {
    textAlign: "center",
    fontSize: 20,
    color: "white",
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 3,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxIcon: {
    width: 14,
    height: 14,
    backgroundColor: "white",
    borderRadius: 2,
    opacity: 0,
  },
  checked: {
    opacity: 1,
  },
  termsText: {
    color: "white",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    bottom: 20,
    textAlign: "center",
    width: "100%",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    height: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
  },
  modalButton: {
    backgroundColor: "#3c0c7b",
    paddingVertical: 5,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: "45%",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
});

export default LoginCadastroScreen;
