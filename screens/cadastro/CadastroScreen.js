import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CadastroStepOne = ({ navigation }) => {
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpfValido, setCpfValido] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Novos estados para cor e gênero
  const [corIdentificacao, setCorIdentificacao] = useState("");
  const [generoIdentificacao, setGeneroIdentificacao] = useState("");
  const [isCorModalVisible, setIsCorModalVisible] = useState(false);
  const [isGeneroModalVisible, setIsGeneroModalVisible] = useState(false);

  // Opções para cor e gênero
  const coresIdentificacao = [
    "Branca", 
    "Preta", 
    "Parda", 
    "Amarela", 
    "Indígena", 
    "Prefiro não declarar"
  ];

  const generosIdentificacao = [
    "Mulher Cisgênero",
    "Mulher Transgênero",
    "Não Binária",
    "Prefiro não declarar"
  ];

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleNext = () => {
    const allFieldsFilled =
      nome && sobrenome && dataNascimento && telefone && cpf && 
      corIdentificacao && generoIdentificacao;

    if (!allFieldsFilled) {
      setErrorMessage("Preencha todos os campos obrigatórios!");
      return;
    }

    const birthDateParts = dataNascimento.split("/");
    const birthDate = new Date(
      `${birthDateParts[2]}-${birthDateParts[1]}-${birthDateParts[0]}`
    );
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const month = today.getMonth() - birthDate.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 14) {
      setErrorMessage("Você deve ter pelo menos 14 anos para se cadastrar.");
      return;
    }

    const telefoneRegex = /^\([1-9]{2}\)\s?[2-9][0-9]{3,4}[0-9]{4}$/;
    if (!telefone.match(telefoneRegex)) {
      setErrorMessage(
        "Formato de telefone inválido. Utilize o formato (DDD) 000000000."
      );
      return;
    }

    const cpfValido = validarCPF(cpf);
    if (!cpfValido) {
      setCpfValido(false);
      setErrorMessage("CPF inválido. Verifique e tente novamente.");
      return;
    } else {
      setCpfValido(true);
    }

    setErrorMessage("");
    navigation.navigate("SegundaParte", {
      nome,
      sobrenome,
      dataNascimento: birthDate.toISOString().split("T")[0],
      telefone,
      cpf,
      corIdentificacao,
      generoIdentificacao
    });
  };

  const validarCPF = (cpf) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;

    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  };

  const formatarCPF = (input) => {
    let digitos = input.replace(/\D/g, "").substring(0, 11);
    digitos = digitos.replace(/(\d{3})(\d)/, "$1.$2");
    digitos = digitos.replace(/(\d{3})(\d)/, "$1.$2");
    digitos = digitos.replace(/(\d{3})(\d{2})$/, "$1-$2");
    setCpf(digitos);
  };

  const handleTelefoneChange = (input) => {
    let digitos = input.replace(/\D/g, "").substring(0, 11);
    if (digitos.length > 2) {
      digitos = `(${digitos.substring(0, 2)}) ${digitos.substring(2)}`;
    }
    setTelefone(digitos);
  };

  const formatarDataNascimento = (input) => {
    let data = input.replace(/\D/g, "").substring(0, 8);
    if (data.length >= 5) {
      data = data.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
    } else if (data.length >= 3) {
      data = data.replace(/(\d{2})(\d{0,2})/, "$1/$2");
    }
    setDataNascimento(data);
  };

  const renderModalItem = (item, onSelect, onClose) => (
    <TouchableOpacity 
      style={styles.modalItem}
      onPress={() => {
        onSelect(item);
        onClose();
      }}
    >
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={require("../../src/assets/BackgroundNovo.png")}
      style={[styles.backgroundImage, StyleSheet.absoluteFill]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        
        {/* Campos originais mantidos */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Digite seu nome"
            placeholderTextColor="white"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Sobrenome</Text>
          <TextInput
            style={styles.input}
            value={sobrenome}
            onChangeText={setSobrenome}
            placeholder="Digite seu sobrenome"
            placeholderTextColor="white"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInput
            style={styles.input}
            value={dataNascimento}
            onChangeText={formatarDataNascimento}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="white"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={handleTelefoneChange}
            keyboardType="phone-pad"
            placeholder="(00) 00000-0000"
            placeholderTextColor="white"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>CPF</Text>
          <TextInput
            style={styles.input}
            value={cpf}
            onChangeText={(input) => {
              formatarCPF(input);
              setCpfValido(true);
            }}
            keyboardType="numeric"
            placeholder="000.000.000-00"
            placeholderTextColor="white"
          />
        </View>

        {/* Novo campo de Cor de Identificação */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cor de Identificação</Text>
          <TouchableOpacity 
            style={styles.input}
            onPress={() => setIsCorModalVisible(true)}
          >
            <Text style={corIdentificacao ? styles.selectedText : styles.placeholderText}>
              {corIdentificacao || "Selecione a cor"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Novo campo de Gênero de Identificação */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Gênero de Identificação</Text>
          <TouchableOpacity 
            style={styles.input}
            onPress={() => setIsGeneroModalVisible(true)}
          >
            <Text style={generoIdentificacao ? styles.selectedText : styles.placeholderText}>
              {generoIdentificacao || "Selecione o gênero"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal para seleção de Cor */}
        <Modal
          transparent={true}
          visible={isCorModalVisible}
          animationType="slide"
          onRequestClose={() => setIsCorModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecione a Cor</Text>
              <FlatList
                data={coresIdentificacao}
                renderItem={({ item }) => renderModalItem(
                  item, 
                  setCorIdentificacao, 
                  () => setIsCorModalVisible(false)
                )}
                keyExtractor={(item) => item}
              />
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setIsCorModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para seleção de Gênero */}
        <Modal
          transparent={true}
          visible={isGeneroModalVisible}
          animationType="slide"
          onRequestClose={() => setIsGeneroModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecione o Gênero</Text>
              <FlatList
                data={generosIdentificacao}
                renderItem={({ item }) => renderModalItem(
                  item, 
                  setGeneroIdentificacao, 
                  () => setIsGeneroModalVisible(false)
                )}
                keyExtractor={(item) => item}
              />
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setIsGeneroModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {errorMessage !== "" && (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, !cpfValido ? { opacity: 0.5 } : null]}
          onPress={handleNext}
          disabled={!cpfValido}
        >
          <Ionicons name="chevron-forward" size={24} color="black" />
          <Text style={styles.buttonText}>Próximo</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 20,
    alignItems: "center",
  },
  inputContainer: {
    width: "80%",
    marginBottom: 10,
  },
  label: {
    marginBottom: 5,
    fontSize: 16,
    fontWeight: "bold",
    color: "white",

  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    paddingHorizontal: 10,
    color: "white",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#fff",
  },
  selectedText: {
    color: "#fff",
  },
  button: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center", 
  },
  buttonText: {
    color: "black",
    fontSize: 18,
  },
  backButton: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 20,
    marginBottom: 100,
    paddingHorizontal: 15,
  },
  backText: {
    fontSize: 16,
    marginLeft: 5,
  },
  errorMessage: {
    color: "red",
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
  },
  // Novos estilos para os modais
  // Modal styling updates
modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)", // Slightly darker overlay
},
modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    maxHeight: "70%",
},
modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
},
modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0", // Light border for separation
},
modalCancelButton: {
    marginTop: 15,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#f0f0f0", // A soft background for the cancel button
    borderRadius: 5,
},
modalCancelText: {
    fontSize: 16,
    color: "#ff4040", // A red color for the cancel text
},
});

export default CadastroStepOne;

