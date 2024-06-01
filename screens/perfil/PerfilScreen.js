import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
} from "react-native";
import { getDatabase, get, ref, child, update } from "firebase/database";
import { getAuth, signOut } from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import Icon from "react-native-vector-icons/FontAwesome";
import {
  getStorage,
  uploadBytesResumable,
  getDownloadURL,
  ref as sRef,
} from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

const Perfil = ({ navigation }) => {
  const [perfilData, setPerfilData] = useState(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log("Status das permissões:", status);
        if (status !== "granted") {
          Alert.alert(
            "Permissão necessária",
            "Por favor, conceda permissão para acessar a galeria de fotos para carregar uma imagem de perfil."
          );
        }
      } catch (error) {
        console.error(
          "Erro ao obter permissões da biblioteca de mídia:",
          error
        );
      }
    })();
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        console.log("Usuário autenticado:", user.uid);
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
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.cancelled) {
        console.log(result.assets[0].uri);
        setImage(result.assets[0].uri);
        await uploadImage(result.assets[0].uri); // Chama a função de upload diretamente
      }
    } catch (E) {
      console.log(E);
    }
  };
  
  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.cancelled) {
        setImage(result.assets[0].uri);
        await uploadImage(result.assets[0].uri); // Chama a função de upload diretamente
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
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          console.error("Error uploading image:", error);
          setUploading(false);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("File available at", downloadURL);
            update(ref(getDatabase(), `users/${user.uid}`), { foto: downloadURL })
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
  const removePhoto = () => {
    setImage(null);
    setPerfilData((prevData) => ({ ...prevData, foto: "" }));
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
      console.error("Erro ao abrir o Google Maps:", error);
      Alert.alert("Erro", "Não foi possível abrir o Google Maps.");
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
                `https://avatar.iran.liara.run/username?username=${
                  perfilData && perfilData.nome + "+" + perfilData.sobrenome
                } `,
            }}
            style={{
              width: 120,
              height: 120,
              borderRadius: 100,
              borderWidth: 2,
              borderColor: "#fff",
            }}
          />
        </TouchableOpacity>
        {uploading && <ActivityIndicator />}
        {perfilData == null ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {perfilData ? `${perfilData.nome} ${perfilData.sobrenome}` : ""}
            </Text>
            <Text style={styles.email}>{perfilData && perfilData.email}</Text>
          </View>
        )}

        <View style={styles.rowContainer}>
          <TouchableOpacity
            onPress={handleDataUser}
            style={styles.rowContainer}
          >
            <Text style={styles.dataUser}>Ver Dados Completos</Text>
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleGoToMap}
          style={[styles.button, { backgroundColor: "#4CAF50" }]}
          disabled={loadingMap}
        >
          <Icon name="map" size={20} color="white" />
          <Text style={styles.buttonText}>
            {loadingMap ? "Carregando o mapa..." : "Ir para o Mapa"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.button, { backgroundColor: "#FF5722" }]}
        >
          <Icon name="sign-out" size={20} color="white" />
          <Text style={styles.buttonText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Pressable
              style={[styles.modalButton, styles.buttonClose]}
              onPress={() => {
                takePhoto();
                setModalVisible(!modalVisible);
              }}
            >
              <Text style={styles.textStyle}>Tirar Foto Agora</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.buttonClose]}
              onPress={() => {
                pickImage();
                setModalVisible(!modalVisible);
              }}
            >
              <Text style={styles.textStyle}>Escolher Foto da Galeria</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.buttonClose]}
              onPress={() => {
                removePhoto();
                setModalVisible(!modalVisible);
              }}
            >
              <Text style={styles.textStyle}>Remover Foto de Perfil</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.buttonClose]}
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Text style={styles.textStyle}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#3c0c7b",
  },
  profileContainer: {
    display: "flex",
    backgroundColor: "#9344fa",
    gap: 15,
    flexDirection: "column",
    padding: 20,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderColor: "#0008",
  },
  dataUser: {
    fontWeight: "bold",
    color: "white",
    marginRight: 5,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  profileInfo: {
    alignItems: "center",
  },
  enviarFoto: {
    backgroundColor: "black",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: "center",
  },
  textEnviarFoto: {
    color: "white",
    fontSize: 14,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    color: "white",
  },
  email: {
    fontSize: 18,
    color: "white",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    marginLeft: 10,
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalView: {
    width: "100%",
    backgroundColor: "#222",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
    // shadowColor: "#000",
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.25,
    // shadowRadius: 4,
    // elevation: 5,
  },
  modalButton: {
    borderRadius: 10,
    padding: 10,
    width: "90%",
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'white'
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default Perfil;
