import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  SafeAreaView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase, ref, set } from "firebase/database";
import { getAuth } from "firebase/auth";
import * as SMS from "expo-sms";

const AdicionarContatoScreen = () => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [addedContacts, setAddedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactListModal, setShowContactListModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [allContacts, setAllContacts] = useState([]);
  const [userId, setUserId] = useState(null); // Armazenar o ID do usuário
  const [favoritedContact, setFavoritedContact] = useState(null);

  useEffect(() => {
    const requestContactsPermission = async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === "granted") {
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            sort: Contacts.SortTypes.FirstName,
          });
          setAllContacts(data);
        } else {
          console.log("Permission denied for contacts");
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    requestContactsPermission();
    loadContacts();
    fetchUserId(); // Obter o ID do usuário ao carregar o componente
  }, []);

  useEffect(() => {
    saveContacts();
  }, [addedContacts]);

  const fetchUserId = () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);
    }
  };

  const handleAddSelectedContact = (contact) => {
    const isContactAlreadyAdded = addedContacts.some(
      (addedContact) => addedContact.name === contact.name
    );

    if (!isContactAlreadyAdded) {
      const { name, phoneNumbers } = contact;
      const formattedContact = {
        id: addedContacts.length, // Usando o índice como identificador único temporário
        name,
        phoneNumber:
          phoneNumbers && phoneNumbers.length > 0 ? phoneNumbers[0].number : "",
      };
      setAddedContacts([...addedContacts, formattedContact]);
      sendContactToDatabase(formattedContact);
      setShowContactListModal(false);
    }
  };

  const loadContacts = async () => {
    try {
      const savedContacts = await AsyncStorage.getItem("addedContacts");
      if (savedContacts !== null) {
        setAddedContacts(JSON.parse(savedContacts));
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const saveContacts = async () => {
    try {
      await AsyncStorage.setItem(
        "addedContacts",
        JSON.stringify(addedContacts)
      );
    } catch (error) {
      console.error("Error saving contacts:", error);
    }
  };

  const sendContactToDatabase = (contact) => {
    const db = getDatabase();
    const contactRef = ref(db, `Contatos/${userId}/${contact.id}`);
    set(contactRef, contact);
  };

  const handleDeleteContact = (contactIndex) => {
    const updatedContacts = addedContacts.filter(
      (_, index) => index !== contactIndex
    );
    setAddedContacts(updatedContacts);
    sendContactsToDatabase(updatedContacts); // Atualiza os contatos no banco de dados
  };

  const sendContactsToDatabase = (contacts) => {
    const db = getDatabase();
    const contactsRef = ref(db, `Contatos/${userId}`);
    set(contactsRef, contacts); // Substitui todos os contatos no banco de dados pelo array fornecido
  };

  const handleCallContact = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleSendSMS = async (phoneNumber) => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(phoneNumber, "Sua mensagem aqui");
        console.log("Mensagem enviada com sucesso para:", phoneNumber);
      } else {
        console.log("SMS is not available on this device");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleSearch = (text) => {
    setSearchTerm(text);

    if (!text) {
      setSelectedContacts([]);
      return;
    }

    const filteredContacts = allContacts.filter((contact) => {
      const validName =
        contact.name && contact.name.toLowerCase().includes(text.toLowerCase());
      const validPhoneNumber =
        contact.phoneNumbers &&
        contact.phoneNumbers.some((phone) =>
          phone.number.toLowerCase().includes(text.toLowerCase())
        );

      return validName || validPhoneNumber;
    });

    const sortedContacts = filteredContacts.sort((a, b) => {
      // Priorizar a ordenação por nome se o texto de pesquisa for alfabético
      if (isNaN(text)) {
        return a.name.localeCompare(b.name);
      }
      // Caso contrário, priorizar a ordenação por número
      return a.phoneNumbers[0].number.localeCompare(b.phoneNumbers[0].number);
    });

    setSelectedContacts(sortedContacts);
  };

  const renderContactItem = ({ item }) => {
    if (!item.name || item.name === "null" || item.name === "null null") {
      return null; // Retorna null para não renderizar nada
    }

    return (
      <TouchableOpacity onPress={() => handleAddSelectedContact(item)}>
        <View style={styles.contactItem}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.phoneNumbers && item.phoneNumbers.length > 0 && (
            <Text style={styles.contactNumber}>
              {item.phoneNumbers[0].number}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const toggleFavorite = (contactIndex) => {
    const contact = addedContacts[contactIndex];
    const updatedContact = { ...contact, favorited: !contact.favorited };
  
    // Desfavoritar todos os contatos
    const updatedContacts = addedContacts.map((c) => ({ ...c, favorited: false }));
    
    // Favoritar o contato selecionado
    updatedContacts[contactIndex] = updatedContact;
  
    // Atualiza o estado local
    setAddedContacts(updatedContacts);
  
    // Envia o contato atualizado para o banco de dados
    sendContactToDatabase(updatedContact);
  };
  

  const renderAddedContactItem = ({ item, index }) => (
    <View style={styles.contactContainer}>
      <View style={styles.contactItem}>
        <Text style={styles.contactName}>{item.name.substring(0, 14)}</Text>
        {item.phoneNumbers && item.phoneNumbers.length > 0 && (
          <Text style={styles.contactNumber}>
            {item.phoneNumbers[0].number}
          </Text>
        )}
        <View style={styles.contactActions}>
          <Ionicons
            name={
              favoritedContact && favoritedContact.id === item.id
                ? "star"
                : "star"
            }
            size={24}
            color={item.favorited ? "#FFD700" : "#ccc"}
            onPress={() => toggleFavorite(index)}
          />

          <TouchableOpacity
            onPress={() => handleCallContact(item.phoneNumbers[0].number)}
          >
            <Ionicons
              name="call"
              size={24}
              color="#008080"
              style={styles.actionIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSendSMS(item.phoneNumbers[0].number)}
          >
            <Ionicons
              name="chatbox"
              size={24}
              color="#008080"
              style={styles.actionIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteContact(index)}>
            <Ionicons name="trash-outline" size={24} color="#ff0000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const handleDeleteAllContacts = () => {
    setAddedContacts([]); // Limpa a lista de contatos adicionados
    sendContactsToDatabase([]); // Limpar os contatos no banco de dados
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setShowContactListModal(true)}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>Adicionar Contatos</Text>
        <Ionicons name="person-add" size={28} color="white" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDeleteAllContacts}>
        <Text style={styles.deleteAllButton}>Apagar Todos</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Contatos Adicionados</Text>
      <FlatList
        data={addedContacts}
        renderItem={renderAddedContactItem}
        keyExtractor={(item, index) => index.toString()}
        style={styles.contactList}
      />
      <Modal
        visible={showContactListModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowContactListModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar Contatos"
            value={searchTerm}
            onChangeText={handleSearch}
          />
          {selectedContacts.length === 0 && (
            <View style={styles.noContactsContainer}>
              <Text style={styles.noContactsText}>Adicione algum contato</Text>
            </View>
          )}
          {selectedContacts.length > 0 && (
            <FlatList
              data={selectedContacts}
              renderItem={renderContactItem}
              keyExtractor={(item, index) => index.toString()}
              style={styles.contactList}
            />
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={() => setShowContactListModal(false)}>
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showConfirmationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <View style={styles.confirmationModalContainer}>
          <Text style={styles.confirmationText}>{confirmationMessage}</Text>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3c0c7b",
    paddingVertical: 25,
    paddingHorizontal: 10,
  },
  addButton: {
    backgroundColor: "#9344fa",
    padding: 20,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 18,
    color: "white",
    marginRight: 10,
  },
  searchInput: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  contactList: {
    flex: 1,
    width: "100%",
  },
  contactItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomColor: "#ccc",
    paddingHorizontal: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  contactContainer: {
    backgroundColor: "#9995",
    borderRadius: 10,
    marginVertical: 10,
  },
  contactNumber: {
    fontSize: 14,
    color: "#ccc",
  },
  contactActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionIcon: {},
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#3c0c7b",
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  confirmationModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    margin: 10,
    elevation: 5,
  },
  confirmationText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#008080",
    marginBottom: 10,
  },
  deleteAllButton: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff0000",
    marginBottom: 10,
  },
  noContactsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noContactsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default AdicionarContatoScreen;
