import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getDatabase, get, ref, child, update } from "firebase/database";
import { getAuth } from "firebase/auth";
import { FontAwesome } from "@expo/vector-icons";

const DadosdoUsuario = () => {
  const [perfilData, setPerfilData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Por favor, conceda permissão para acessar a galeria de fotos para carregar uma imagem de perfil."
        );
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const dbref = ref(getDatabase());
        const snapshot = await get(child(dbref, `users/${user.uid}`));
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setPerfilData(userData);
          setFormData(userData); // Initialize formData with fetched userData
          if (userData.profileImage) {
            setProfileImage(userData.profileImage);
          }
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

  const handleInputChange = (field, value) => {
    setFormData(prevState => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleSaveChanges = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const dbref = ref(getDatabase(), `users/${user.uid}`);
        await update(dbref, formData);
        Alert.alert("Sucesso", "Dados atualizados com sucesso.");
        setPerfilData(formData);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Erro ao atualizar dados do perfil:", error);
      Alert.alert("Erro", "Não foi possível atualizar os dados.");
    }
  };

  const renderProfileImage = () => {
    if (profileImage) {
      return <Image source={{ uri: profileImage }} style={styles.profileImage} />;
    }
    return (
      <FontAwesome name="user-circle" size={100} color="white" style={styles.profileImage} />
    );
  };

  if (!perfilData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Dados do perfil não encontrados.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Dados do Usuário</Text>
        {renderProfileImage()}
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={formData.nome}
              onChangeText={(text) => handleInputChange("nome", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Sobrenome"
              value={formData.sobrenome}
              onChangeText={(text) => handleInputChange("sobrenome", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => handleInputChange("email", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Data de Nascimento"
              value={formData.dataNascimento}
              onChangeText={(text) => handleInputChange("dataNascimento", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="CPF"
              value={formData.cpf}
              onChangeText={(text) => handleInputChange("cpf", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Rua"
              value={formData.rua}
              onChangeText={(text) => handleInputChange("rua", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Bairro"
              value={formData.bairro}
              onChangeText={(text) => handleInputChange("bairro", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Cidade"
              value={formData.cidade}
              onChangeText={(text) => handleInputChange("cidade", text)}
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveChanges}>
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setIsEditing(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.userData}>
              <FontAwesome name="user" size={28} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>Nome:</Text>
                <Text style={styles.value}>{perfilData.nome}</Text>
              </View>
            </View>
            <View style={styles.userData}>
              <FontAwesome name="user" size={28} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>Sobrenome:</Text>
                <Text style={styles.value}>{perfilData.sobrenome}</Text>
              </View>
            </View>
            <View style={styles.userData}>
              <FontAwesome name="envelope" size={28} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{perfilData.email}</Text>
              </View>
            </View>
            <View style={styles.userData}>
              <FontAwesome name="calendar" size={26} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>Data de Nascimento:</Text>
                <Text style={styles.value}>{perfilData.dataNascimento}</Text>
              </View>
            </View>
            <View style={styles.userData}>
              <FontAwesome name="id-card" size={24} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>CPF:</Text>
                <Text style={styles.value}>{perfilData.cpf}</Text>
              </View>
            </View>
            <View style={styles.userData}>
              <FontAwesome name="map-marker" size={28} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>Rua:</Text>
                <Text style={styles.value}>{perfilData.rua}</Text>
              </View>
            </View>
            <View style={styles.userData}>
              <FontAwesome name="map-marker" size={28} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>Bairro:</Text>
                <Text style={styles.value}>{perfilData.bairro}</Text>
              </View>
            </View>
            <View style={styles.userData}>
              <FontAwesome name="map-marker" size={28} color="white" style={styles.labelIcon} />
              <View style={styles.labelValueContainer}>
                <Text style={styles.label}>Cidade:</Text>
                <Text style={styles.value}>{perfilData.cidade}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.button} onPress={() => setIsEditing(true)}>
              <Text style={styles.buttonText}>Editar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#3c0c7b",
    padding: 20,
  },
  innerContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  userData: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    width: "100%",
    padding: 10,
    backgroundColor: "#9344fa",
    borderRadius: 10,
  },
  labelIcon: {
    marginRight: 10,
  },
  labelValueContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  value: {
    fontSize: 16,
    color: "white",
    marginLeft: 10,
  },
  input: {
    width: "100%",
    padding: 10,
    marginVertical: 5,
    backgroundColor: "white",
    borderRadius: 5,
  },
  button: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#6200ee",
    borderRadius: 5,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    marginTop: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
});

export default DadosdoUsuario;
