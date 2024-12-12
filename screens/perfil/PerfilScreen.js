import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getDatabase, get, ref, child, update, remove } from "firebase/database";
import { getAuth, signOut, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import { Linking } from "react-native";
import {
  getStorage,
  uploadBytesResumable,
  getDownloadURL,
  ref as sRef,
} from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { ProgressBar } from "react-native-paper";

const Perfil = ({ navigation }) => {
  const route = useRoute();
  const [perfilData, setPerfilData] = useState(
    route.params?.perfilData || null
  );
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [location, setLocation] = useState("Carregando localização...");
  const [watchingLocation, setWatchingLocation] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
  (async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Por favor, conceda permissão para acessar a galeria de fotos para carregar uma imagem de perfil."
        );
      }
    } catch (error) {
      console.error("Erro ao obter permissões da biblioteca de mídia:", error);
    }
  })();
}, []);

  useEffect(() => {
    fetchUserProfile();
    startLocationUpdates(); // Start watching location updates
    return () => {
      if (watchingLocation) {
        watchingLocation.remove(); // Cleanup location updates
      }
    };
  }, []);

  const startLocationUpdates = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permissão de localização não concedida");
      }

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        (location) => {
          setLocation(
            `${location.coords.latitude}, ${location.coords.longitude}`
          );
        }
      );

      setWatchingLocation(locationSubscription);
    } catch (error) {
      console.error("Erro ao iniciar atualizações de localização:", error);
      setLocation("Localização não disponível");
    }
  };
  const getLocationCoordinates = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permissão de localização não concedida");
      }

      let location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error("Erro ao obter coordenadas do usuário:", error);
      throw error;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const dbref = ref(getDatabase());
        const snapshot = await get(child(dbref, `users/${user.uid}`));
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setPerfilData(userData);
          navigation.navigate("Perfil", { perfilData: userData });
        } else {
          console.log("Nenhum dado encontrado para o usuário logado");
        }
      } else {
        console.log("Usuário não autenticado");
      }
    } catch (error) {
      console.error("Erro ao obter dados do perfil:", error);
    }
  };

const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permissão negada', 'O aplicativo precisa de permissão para acessar a galeria.');
        return;
    }
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled) {
            setImage(result.assets[0].uri);
            await uploadImage(result.assets[0].uri);
        }
    } catch (error) {
        console.log(error);
    }
};


const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiss o negada', 'O aplicativo precisa de permiss o para acessar a c mera.');
    return;
  }
  try {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      await uploadImage(result.assets[0].uri);
    }
  } catch (error) {
    console.error("Error taking photo:", error);
  }
};

  const uploadImage = async (uri) => {
  try {
    if (!uri) return;
    setUploading(true);
    const auth = getAuth();
    const user = auth.currentUser;
    const storage = getStorage();
    const storageRef = sRef(storage, "fotos/" + Date.now() + user.uid);
    const response = await fetch(uri);
    const blob = await response.blob();

    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress / 100);
      },
      (error) => {
        console.error("Error uploading image:", error);
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          update(ref(getDatabase(), `users/${user.uid}`), {
            foto: downloadURL,
          })
            .then(() => {
              setUploading(false);
              setUploaded(true);
              fetchUserProfile();
            })
            .catch((error) => {
              console.error("Error updating user data:", error);
              setUploading(false);
            });
        });
      }
    );
  } catch (error) {
    console.error("Error uploading image:", error);
    setUploading(false);
  }
};

const handleDeleteAccount = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      // Confirm deletion with the user
      Alert.alert(
        "Deletar Conta",
        "Tem certeza de que deseja deletar sua conta? Esta ação não pode ser desfeita.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Deletar",
            onPress: async () => {
              try {
                // Reautenticar o usuário, se necessário
                const credential = EmailAuthProvider.credential(
                  user.email,
                  "suaSenha" // Substitua por uma forma de capturar a senha do usuário
                );
                await reauthenticateWithCredential(user, credential);

                // Remover dados do Realtime Database
                const dbref = ref(getDatabase(), `users/${user.uid}`);
                await remove(dbref);

                // Deletar a conta do usuário
                await user.delete();

                Alert.alert("Conta deletada", "Sua conta foi deletada com sucesso.");
                navigation.navigate("LoginScreen");
              } catch (deleteError) {
                console.error("Erro ao deletar conta:", deleteError);
                Alert.alert("Erro", "Não foi possível deletar a conta. Tente novamente.");
              }
            },
            style: "destructive",
          },
        ],
        { cancelable: false }
      );
    } else {
      console.log("Usuário não autenticado");
    }
  } catch (error) {
    console.error("Erro ao deletar conta:", error);
    Alert.alert("Erro", "Não foi possível completar a ação.");
  }
};

  const handleDataUser = () => {
    navigation.navigate("Dados do Usúario");
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("userEmail");
      await SecureStore.deleteItemAsync("userPassword");
      await signOut(getAuth());

      const userEmail = await SecureStore.getItemAsync("userEmail");
      const userPassword = await SecureStore.getItemAsync("userPassword");

      if (!userEmail && !userPassword) {
        navigation.navigate("LoginCadastro", {
          email: "",
          senha: "",
          errorMessage: "",
        });
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const removePhoto = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const dbref = ref(getDatabase(), `users/${user.uid}`);
        await update(dbref, { foto: "" });
        setImage(null);
        setPerfilData((prevData) => ({ ...prevData, foto: "" }));
        fetchUserProfile();
        console.log("Foto de perfil removida com sucesso.");
      } else {
        console.log("Usuário não autenticado");
      }
    } catch (error) {
      console.error("Erro ao remover foto de perfil:", error);
    }
  };

  const handleGoToMap = async () => {
    try {
      setLoadingMap(true);
      const coords = await getLocationCoordinates();
      const { latitude, longitude } = coords;
      if (latitude && longitude) {
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Coordenadas não encontradas",
          "Não foi possível obter as coordenadas do usuário."
        );
      }
    } catch (error) {
      console.error("Erro ao abrir o mapa:", error);
      Alert.alert("Erro", "Não foi possível abrir o mapa.");
    } finally {
      setLoadingMap(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Image
            source={{
              uri:
                image ||
                (perfilData && perfilData.foto !== "" && perfilData.foto) ||
                `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(
                  perfilData?.nome || ""
                )}`,
            }}
            style={{
              width: 150,
              height: 150,
              borderRadius: 200 / 2,
              borderWidth: 5,
              borderColor: "#ccc",
            }}
          />
        </TouchableOpacity>
        <Text style={styles.profileName}>
          {perfilData
            ? `${perfilData.nome} ${perfilData.sobrenome}`
            : "Carregando..."}
        </Text>
        <Text style={styles.profileInfo}>
          {perfilData ? perfilData.email : "Carregando..."}
        </Text>
      </View>

      <View style={styles.profileDataContainer}>
        <Text style={styles.profileLabel}>Dados Pessoais:</Text>
        {perfilData && (
          <View style={styles.profileDataList}>
            <View style={styles.profileDataItem}>
              <Ionicons name="person-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>
                Nome: {perfilData.nome} {perfilData.sobrenome}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="mail-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>
                Email: {perfilData.email}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>CPF: {perfilData.cpf}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="call-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>CPF: {perfilData.telefone}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="color-palette-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>Cor: {perfilData.corIdentificacao}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="transgender-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>Gênero: {perfilData.generoIdentificacao}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="location-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>
                Cidade: {perfilData.cidade} - {perfilData.estado}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="home-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>Rua: {perfilData.rua}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="mail-open-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>CEP: {perfilData.cep}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.profileDataText}>
                Data de Nascimento: {perfilData.dataNascimento}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={handleDataUser}>
          <Ionicons name="pencil-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Editar Informações</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Log out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Deletar Conta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleGoToMap}>
          {loadingMap ? (
            <ProgressBar style={{ flex: 1 }} progress={progress} color="#fff" />
          ) : (
            <>
              <Ionicons name="map-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Ver no Mapa</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      
<Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(!modalVisible)}
>
  <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Escolha uma opção: </Text>
        <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={24} color="#fff" />
          <Text style={styles.modalOptionText}>Tirar Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
          <Ionicons name="images-outline" size={24} color="#fff" />
          <Text style={styles.modalOptionText}>Escolher da Galeria</Text>
        </TouchableOpacity>
        {image && (
          <Pressable
            style={[styles.modalOption, styles.modalOptionRemove]}
            onPress={() => {
              setModalVisible(!modalVisible);
              removePhoto();
            }}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={styles.modalOptionText}>Remover Foto</Text>
          </Pressable>
        )}
      </View>
    </View>
  </TouchableWithoutFeedback>
</Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#3c0c7b",
  },
  profileContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    color: "white",
  },
  profileInfo: {
    fontSize: 16,
    color: "#666",
    color: "white",
  },
  profileDataContainer: {
    width: "100%",
    padding: 20,
    backgroundColor: "#9344fa",
    borderRadius: 10,
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  profileDataList: {
    marginTop: 10,
  },
  profileDataItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  profileDataText: {
    fontSize: 16,
    color: "white",
    marginLeft: 10,
  },
  buttonsContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#9344fa",
    width: "100%",
    padding: 13,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    gap: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fundo escuro translúcido
  },
  modalContent: {
    backgroundColor: "#9344fa",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#fff",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: "#fff",
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 10,
    color: "#fff",
  },
});

export default Perfil;
