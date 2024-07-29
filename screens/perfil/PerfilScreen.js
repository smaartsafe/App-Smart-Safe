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
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getDatabase, get, ref, child, update } from "firebase/database";
import { getAuth, signOut } from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import { Linking } from "react-native";

import {
  getStorage,
  uploadBytesResumable,
  getDownloadURL,
  ref as sRef,
} from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
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
  const fetchCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permissão de localização não concedida");
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(`${location.coords.latitude}, ${location.coords.longitude}`);
    } catch (error) {
      console.error("Erro ao obter coordenadas do usuário:", error);
      setLocation("Localização não disponível");
    }
  };

  // Use this function when you need to fetch the location
  const handleFetchLocation = () => {
    fetchCurrentLocation();
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

  const fetchLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permissão de localização não concedida");
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(`${location.coords.latitude}, ${location.coords.longitude}`);
    } catch (error) {
      console.error("Erro ao obter coordenadas do usuário:", error);
      setLocation("Localização não disponível");
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
        await uploadImage(result.assets[0].uri);
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
          setProgress(progress / 100); // Update progress
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          console.error("Error uploading image:", error);
          setUploading(false);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("File available at", downloadURL);
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
              width: 200,
              height: 200,
              borderRadius: 200 / 2,
              borderWidth: 5,
              borderColor: "#ccc",
            }}
          />
        </TouchableOpacity>
        <Text style={styles.profileName}>
          {perfilData ? perfilData.nome : "Carregando..."}
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
              <Ionicons name="person" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>
                Nome: {perfilData.nome}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="person-outline" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>
                Sobrenome: {perfilData.sobrenome}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="mail" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>
                Email: {perfilData.email}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="card" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>CPF: {perfilData.cpf}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="location-outline" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>
                Estado: {perfilData.estado}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="location-sharp" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>
                Cidade: {perfilData.cidade}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="home" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>Rua: {perfilData.rua}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="mail-open" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>CEP: {perfilData.cep}</Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="calendar" size={20} color="#6200ee" />
              <Text style={styles.profileDataText}>
                Data de Nascimento: {perfilData.dataNascimento}
              </Text>
            </View>
            <View style={styles.profileDataItem}>
              <Ionicons name="location" size={20} color="#6200ee" />
              <Text style={styles.dataLabel}>Localização:</Text>
              <Text style={styles.dataValue}>{location}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={handleDataUser}>
          <Ionicons name="person" size={20} color="#fff" />
          <Text style={styles.buttonText}>Editar Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.buttonText}>Sair</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleGoToMap}>
          {loadingMap ? (
            <ProgressBar style={{ flex: 1 }} progress={progress} color="#fff" />
          ) : (
            <>
              <Ionicons name="map" size={20} color="#fff" />
              <Text style={styles.buttonText}>Ver no Mapa</Text>
            </>
          )}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolha uma opção:</Text>
            <Pressable style={styles.modalOption} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#6200ee" />
              <Text style={styles.modalOptionText}>Tirar Foto</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#6200ee" />
              <Text style={styles.modalOptionText}>Escolher da Galeria</Text>
            </Pressable>
            <Pressable
              style={[styles.modalOption, styles.modalOptionCancel]}
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Ionicons name="close" size={24} color="#6200ee" />
              <Text style={styles.modalOptionText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.modalOption, styles.modalOptionRemove]}
              onPress={() => {
                setModalVisible(!modalVisible);
                removePhoto();
              }}
            >
              <Ionicons name="trash" size={24} color="#fff" />
              <Text style={styles.modalOptionText}>Remover Foto</Text>
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
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
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
    color: "#333",
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
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fundo escuro translúcido
  },
  modalContent: {
    backgroundColor: "white",
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
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: "100%",
    backgroundColor: "#f5f5f5",
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 10,
    color: "#333",
  },
  modalOptionCancel: {
    backgroundColor: "#ccc",
  },
  modalOptionRemove: {
    backgroundColor: "#ff4444",
  },
});

export default Perfil;
