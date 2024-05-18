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

const Perfil = ({ navigation }) => {
  const [perfilData, setPerfilData] = useState(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

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
          // console.log("Dados do usuário:", userData);
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
      }
    } catch (E) {
      console.log(E);
    }
  };

  const uploadImage = async () => {
    try {
      if (!image) return;
      setUploading(true);

      const auth = getAuth();
      const user = auth.currentUser;
      const storage = getStorage();
      const storageRef = sRef(storage, "fotos/" + Date.now() + user.uid);
      const response = await fetch(image);
      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Handle progress
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          // Handle error
          console.error("Error uploading image:", error);
          setUploading(false);
        },
        () => {
          // Handle successful upload
          const auth = getAuth();
          const user = auth.currentUser;
          const database = getDatabase();

          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("File available at", downloadURL);
            update(ref(database, `users/${user.uid}`), { foto: downloadURL })
              .then(() => {
                setUploading(false);
                setUploaded(true);
                fetchUserProfile(); // Atualiza os dados do perfil após a atualização
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

  const handleGoToMap = () => {
    navigation.navigate("MapScreen");
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={pickImage}>
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
        {image && !uploaded && (
          <TouchableOpacity onPress={uploadImage} style={styles.enviarFoto}>
            <Text style={styles.textEnviarFoto}>CONCLUIR</Text>
          </TouchableOpacity>
        )}
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
        >
          <Icon name="map" size={20} color="white" />
          <Text style={styles.buttonText}>Ir para o Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.button, { backgroundColor: "#FF5722" }]}
        >
          <Icon name="sign-out" size={20} color="white" />
          <Text style={styles.buttonText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
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
});

export default Perfil;
