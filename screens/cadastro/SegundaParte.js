import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { getDatabase, ref, set } from "firebase/database";
import { useRoute } from "@react-navigation/native";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const SegundaParte = () => {
  const [cep, setCep] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const navigation = useNavigation();
  const route = useRoute();
  const { nome, sobrenome, dataNascimento, cpf } = route.params;
  const successTextRef = useRef(null);

  useEffect(() => {
    getLocationPermission();
  }, []);

  const validateEmail = (email) => {
    const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;
    return regex.test(String(email).toLowerCase());
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permissão de localização negada",
          "Você precisa conceder permissão para acessar sua localização."
        );
      } else {
        getLocation();
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão de localização:", error);
      Alert.alert(
        "Erro",
        "Ocorreu um erro ao solicitar permissão de localização."
      );
    }
  };

  const getLocation = async () => {
    try {
      let location = await Location.getCurrentPositionAsync({});
      retryReverseGeocodeAsync(
        location.coords.latitude,
        location.coords.longitude
      );
    } catch (error) {
      console.error("Erro ao obter localização:", error);
      Alert.alert("Erro", "Ocorreu um erro ao obter a localização.");
    }
  };

  const retryReverseGeocodeAsync = async (latitude, longitude, retries = 3) => {
    try {
      console.log(`Tentando obter endereço: tentativa ${4 - retries}`);
      let address = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (address.length > 0) {
        setCep(address[0].postalCode || "");
        setEstado(address[0].region || "");
        
        // Se a cidade for definida, usa ela, caso contrário, usa o distrito
        const cityName = address[0].city || address[0].district || "";
        setCidade(cityName);
    
        setRua(address[0].street || "");
        
        // Define o bairro, garantindo que ele não será igual ao nome da cidade
        const districtName = address[0].district && address[0].district !== cityName ? address[0].district : "";
        setBairro(districtName);
        
        console.log("Endereço obtido com sucesso:", address[0]);
    }
    
      
    } catch (error) {
      console.error("Erro ao obter endereço:", error);
      if (retries > 0) {
        console.warn("Retrying reverse geocode...");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Espera 5 segundos antes de tentar novamente
        retryReverseGeocodeAsync(latitude, longitude, retries - 1);
      } else {
        console.error("Erro ao obter endereço após várias tentativas:", error);
        Alert.alert("Erro", "Ocorreu um erro ao obter o endereço.");
      }
    }
  };

  const handleFinalizarCadastro = async () => {
    try {
      setIsLoading(true);

      const emailLowerCase = email.toLowerCase();
      if (!validateEmail(emailLowerCase)) {
        Alert.alert("Erro", "Por favor, insira um email válido.");
        setIsLoading(false);
        return;
      }

      if (!validatePassword(senha)) {
        Alert.alert("Erro", "A senha deve conter pelo menos 8 caracteres.");
        setIsLoading(false);
        return;
      }

      if (senha !== confirmarSenha) {
        Alert.alert("Erro", "As senhas não coincidem. Por favor, verifique.");
        setIsLoading(false);
        return;
      }

      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        emailLowerCase,
        senha
      );
      const user = userCredential.user;

      if (user) {
        const cadastroData = {
          cep,
          estado,
          cidade,
          rua,
          bairro,
          email: user.email,
          nome,
          sobrenome,
          dataNascimento,
          cpf,
        };

        await SecureStore.setItemAsync(
          "cadastro",
          JSON.stringify(cadastroData)
        );

        const database = getDatabase();

        await set(ref(database, `users/${user.uid}`), cadastroData);

        Animated.timing(animation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          Animated.timing(animation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }).start();
        }, 3000);

        setTimeout(() => {
          navigation.navigate("Login");
        }, 2000);
      }
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      Alert.alert("Erro", "Ocorreu um erro ao salvar os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../src/assets/fundoSegundaTela.png")}
      style={styles.backgroundImage}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.groupContainer}>
          <View style={styles.inputGroup}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>CEP:</Text>
              <TextInput
                style={styles.input}
                value={cep}
                onChangeText={setCep}
                keyboardType="numeric"
                editable={true}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Estado:</Text>
              <TextInput
                style={styles.input}
                value={estado}
                onChangeText={setEstado}
                editable={true}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cidade:</Text>
              <TextInput
                style={styles.input}
                value={cidade}
                onChangeText={setCidade}
                editable={true}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bairro:</Text>
              <TextInput
                style={styles.input}
                value={bairro}
                onChangeText={setBairro}
                editable={true}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Rua:</Text>
              <TextInput
                style={styles.input}
                value={rua}
                onChangeText={setRua}
                editable={true}
              />
            </View>
          </View>
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
              <Text style={styles.label}>Criar Senha:</Text>
              <TextInput
                style={styles.input}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!showPassword}
              />
              <Text style={styles.placeholder}>(pelo menos 8 caracteres)</Text>
            </View>
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
          <View style={styles.inputGroup}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirmar Senha:</Text>
              <TextInput
                style={styles.input}
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                secureTextEntry={!showPassword}
              />
              <Text style={styles.placeholder}>(Use a mesma senha)</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={handleFinalizarCadastro}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.buttonText}>Finalizar Cadastro</Text>
          )}
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.successContainer,
            {
              opacity: animation,
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text ref={successTextRef} style={styles.successText}>
            Cadastro finalizado com sucesso!
          </Text>
        </Animated.View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 20,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
  },
  groupContainer: {
    width: "80%",
  },
  inputGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  formGroup: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    marginBottom: 5,
    fontWeight: "bold",
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    padding: 7,
    width: "100%",
    color: "white",
  },
  backButton: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 40,
    marginBottom: 50,
    paddingHorizontal: 15,
  },
  backText: {
    fontSize: 16,
    marginLeft: 5,
  },
  button: {
    backgroundColor: "white",
    paddingHorizontal: 25,
    borderRadius: 5,
    marginTop: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: "black",
    fontSize: 18,
  },
  placeholder: {
    color: "gray",
    fontStyle: "italic",
  },
  icon: {
    position: "absolute",
    right: 15,
    top: 35,
  },
  successContainer: {
    marginTop: 20,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "green",
    alignSelf: "center",
  },
  successText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default SegundaParte;
