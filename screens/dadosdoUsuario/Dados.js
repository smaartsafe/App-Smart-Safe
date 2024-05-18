import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getDatabase, get, ref, child, update } from "firebase/database";
import { getAuth, updateEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { FontAwesome } from "@expo/vector-icons";

const DadosdoUsuario = ({ route }) => {
  const [perfilData, setPerfilData] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoSobrenome, setNovoSobrenome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaRua, setNovaRua] = useState("");
  const [novoBairro, setNovoBairro] = useState("");
  const [novaCidade, setNovaCidade] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Status das permissões:", status);
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Por favor, conceda permissão para acessar a galeria de fotos para carregar uma imagem de perfil."
        );
      } else {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          console.log("Usuário autenticado:", user.uid);
          const dbref = ref(getDatabase());
          const snapshot = await get(child(dbref, `users/${user.uid}`));
          if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log("Dados do usuário:", userData);
            setPerfilData(userData);
          } else {
            console.log("Nenhum dado encontrado para o usuário logado");
          }
        } else {
          console.log("Usuário não autenticado");
        }
      }
    } catch (error) {
      console.error("Erro ao obter dados do perfil:", error);
    }
  };

  const handleAtualizarPerfil = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const dbref = ref(getDatabase());
        const novoPerfil = {};
        if (novoNome.trim() !== "") novoPerfil.nome = novoNome;
        if (novoSobrenome.trim() !== "") novoPerfil.sobrenome = novoSobrenome;
        if (novoEmail.trim() !== "") novoPerfil.email = novoEmail;
        if (novaRua.trim() !== "") novoPerfil.rua = novaRua;
        if (novoBairro.trim() !== "") novoPerfil.bairro = novoBairro;
        if (novaCidade.trim() !== "") novoPerfil.cidade = novaCidade;

        // Verificar se o novo email é válido
        if (!isValidEmail(novoEmail)) {
          Alert.alert("Email Inválido", "Por favor, insira um email válido.");
          return;
        }

        // Verificar se o novo email é diferente do email atual
        if (novoEmail.trim() === perfilData.email) {
          Alert.alert("Email Existente", "O novo email é o mesmo que o email atual.");
          return;
        }

        // Verificar se o novo email já está em uso
        const methods = await fetchSignInMethodsForEmail(auth, novoEmail);
        if (methods && methods.length > 0) {
          Alert.alert("Email em Uso", "O novo email já está sendo usado por outra conta.");
          return;
        }

        // Solicitar ao usuário que verifique o novo email
        Alert.alert(
          "Verificação de Email",
          "Um email de verificação foi enviado para o novo endereço de email. Por favor, verifique o email e siga as instruções para concluir a alteração."
        );

        // Atualizar o perfil no banco de dados em tempo real
        await update(child(dbref, `users/${user.uid}`), novoPerfil);

        setShowSuccessMessage(true); // Exibir mensagem de sucesso
        setEditingField(null); // Limpar campo de edição após salvar
        fetchUserProfile(); // Atualizar os dados do perfil após a atualização
        setTimeout(() => {
          setShowSuccessMessage(false); // Remover mensagem após 3 segundos
        }, 3000); // 3000 milissegundos = 3 segundos
      } else {
        console.log("Usuário não autenticado");
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      Alert.alert(
        "Erro ao atualizar perfil. Por favor, tente novamente mais tarde."
      );
    }
  };

  const handleEditField = (fieldName) => {
    setEditingField(fieldName);
  };
  

  const isValidEmail = (email) => {
    // Expressão regular para validar o formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (!perfilData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Dados do perfil não encontrados.</Text>
      </View>
    );
  }

  const limitarTexto = (texto) => {
    if (texto.length > 27) {
      return texto.substring(0, 27) + '...';
    }
    return texto;
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Dados do Usuário:</Text>
        <View style={styles.userData}>
          <FontAwesome
            name="user"
            size={28}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>Nome:</Text>
            {editingField === "nome" ? (
              <TextInput
                style={styles.input}
                value={novoNome}
                onChangeText={setNovoNome}
                placeholder={perfilData.nome}
              />
            ) : (
              <Text style={styles.value}>{perfilData.nome}</Text>
            )}
            {editingField !== "nome" && (
              <TouchableOpacity onPress={() => handleEditField("nome")}>
                <FontAwesome
                  name="pencil"
                  size={20}
                  color="white"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.userData}>
          <FontAwesome
            name="user"
            size={28}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>Sobrenome:</Text>
            {editingField === "sobrenome" ? (
              <TextInput
                style={styles.input}
                value={novoSobrenome}
                onChangeText={setNovoSobrenome}
                placeholder={perfilData.sobrenome}
              />
            ) : (
              <Text style={styles.value}>{perfilData.sobrenome}</Text>
            )}
            {editingField !== "sobrenome" && (
              <TouchableOpacity onPress={() => handleEditField("sobrenome")}>
                <FontAwesome
                  name="pencil"
                  size={20}
                  color="white"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.userData}>
          <FontAwesome
            name="user"
            size={28}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>Email:</Text>
            {editingField === "email" ? (
              <TextInput
                style={styles.input}
                value={novoEmail}
                onChangeText={setNovoEmail}
                placeholder={limitarTexto(perfilData.email)}

              />
            ) : (
              <Text style={styles.value}>{limitarTexto(perfilData.email)}</Text>
            )}
            {editingField !== "email" && (
              <TouchableOpacity onPress={() => handleEditField("email")}>
                <FontAwesome
                  name="pencil"
                  size={20}
                  color="white"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.userData}>
          <FontAwesome
            name="calendar"
            size={26}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>Data de Nascimento:</Text>
            <Text style={styles.value}>{perfilData.dataNascimento}</Text>
          </View>
        </View>
        <View style={styles.userData}>
          <FontAwesome
            name="id-card"
            size={24}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>CPF:</Text>
            <Text style={styles.value}>{perfilData.cpf}</Text>
          </View>
        </View>
        <View style={styles.userData}>
          <FontAwesome
            name="map-marker"
            size={28}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>Rua:</Text>
            {editingField === "rua" ? (
              <TextInput
                style={styles.input}
                value={novaRua}
                onChangeText={setNovaRua}
                placeholder={perfilData.rua}
              />
            ) : (
              <Text style={styles.value}>{perfilData.rua}</Text>
            )}
            {editingField !== "rua" && (
              <TouchableOpacity onPress={() => handleEditField("rua")}>
                <FontAwesome
                  name="pencil"
                  size={20}
                  color="white"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.userData}>
          <FontAwesome
            name="map-marker"
            size={28}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>Bairro:</Text>
            {editingField === "bairro" ? (
              <TextInput
                style={styles.input}
                value={novoBairro}
                onChangeText={setNovoBairro}
                placeholder={perfilData.bairro}
              />
            ) : (
              <Text style={styles.value}>{perfilData.bairro}</Text>
            )}
            {editingField !== "bairro" && (
              <TouchableOpacity onPress={() => handleEditField("bairro")}>
                <FontAwesome
                  name="pencil"
                  size={20}
                  color="white"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.userData}>
          <FontAwesome
            name="map-marker"
            size={28}
            color="white"
            style={styles.labelIcon}
          />
          <View style={styles.labelValueContainer}>
            <Text style={styles.label}>Cidade:</Text>
            {editingField === "cidade" ? (
              <TextInput
                style={styles.input}
                value={novaCidade}
                onChangeText={setNovaCidade}
                placeholder={perfilData.cidade}
              />
            ) : (
              <Text style={styles.value}>{perfilData.cidade}</Text>
            )}
            {editingField !== "cidade" && (
              <TouchableOpacity onPress={() => handleEditField("cidade")}>
                <FontAwesome
                  name="pencil"
                  size={20}
                  color="white"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.saveButtonContainer}>
          {editingField && (
            <TouchableOpacity onPress={handleAtualizarPerfil}>
              <Text style={styles.label}>Salvar</Text>
            </TouchableOpacity>
          )}
          {showSuccessMessage && (
            <Text style={styles.successText}>Dados atualizados com sucesso!</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#3c0c7b", // cor de fundo do Facebook
    paddingVertical: 20,
    paddingHorizontal: 10,
    gap: 5,
  },
  innerContainer: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff", // azul do Facebook
  },
  userData: {
    flexDirection: "row",
    marginBottom: 10,
    borderRadius: 10, // bordas arredondadas
    padding: 10, // espaço interno
    alignItems: "center", // alinhamento vertical
    borderWidth: 1,
    borderColor: "white",
  },
  labelIcon: {
    marginRight: 15, // Adicionando margem direita ao ícone
  },
  labelValueContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontWeight: "bold",
    color: "#fff", // azul do Facebook
    fontSize: 18,
  },
  value: {
    color: "#fff", // cor do texto
    fontSize: 18,
    fontWeight: "100",
    marginLeft: 5,
  },
  editIcon: {
    marginLeft: 5,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 5,
    padding: 5,
    marginTop: 5,
    marginRight: 5,
    flex: 1,
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    color: "red",
  },
  saveButtonContainer: {
    alignItems: "center",
    marginTop: 20,
    
  },
  successText:{
    color: "white",

  }
});

export default DadosdoUsuario;
