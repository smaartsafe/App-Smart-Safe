import React, { useState, useEffect, useCallback } from "react";
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
import { getDatabase, ref, set, get, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import * as SMS from "expo-sms";
import { useFocusEffect } from "@react-navigation/native";

const AdicionarContatoScreen = () => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [addedContacts, setAddedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactListModal, setShowContactListModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [allContacts, setAllContacts] = useState([]);
  const [userId, setUserId] = useState(null);

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "";

    // Remove caracteres não numéricos
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Verifica se o número possui 11 dígitos (indicando o nono dígito)
    if (cleaned.length === 11) {
      // Remove o nono dígito
      cleaned = cleaned.substring(0, 2) + cleaned.substring(3);
    }

    // Adiciona o código do país se não estiver presente
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }

    return cleaned;
  };

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
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadContactsFromDatabase();
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadContactsFromDatabase();
      }
    }, [userId])
  );

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
        id: addedContacts.length,
        name,
        phoneNumber:
          phoneNumbers && phoneNumbers.length > 0
            ? formatPhoneNumber(phoneNumbers[0].number)
            : "",
      };
      setAddedContacts([...addedContacts, formattedContact]);
      sendContactToDatabase(formattedContact);
      setShowContactListModal(false);
    }
  };

  const loadContactsFromDatabase = async () => {
    try {
      const db = getDatabase();
      const contactsRef = ref(db, `Contatos/${userId}`);
      const snapshot = await get(contactsRef);
      if (snapshot.exists()) {
        setAddedContacts(Object.values(snapshot.val()));
      }
    } catch (error) {
      console.error("Error loading contacts from database:", error);
    }
  };

  const sendContactToDatabase = (contact) => {
    const db = getDatabase();
    const contactRef = ref(db, `Contatos/${userId}/${contact.id}`);
    set(contactRef, contact);
  };

  const handleDeleteContact = (contactIndex) => {
    const contactToDelete = addedContacts[contactIndex];
    const updatedContacts = addedContacts.filter(
      (_, index) => index !== contactIndex
    );
    setAddedContacts(updatedContacts);
    removeContactFromDatabase(contactToDelete.id);
    sendContactsToDatabase(updatedContacts);
  };

  const removeContactFromDatabase = (contactId) => {
    const db = getDatabase();
    const contactRef = ref(db, `Contatos/${userId}/${contactId}`);
    remove(contactRef);
  };

  const sendContactsToDatabase = (contacts) => {
    const db = getDatabase();
    const contactsRef = ref(db, `Contatos/${userId}`);
    set(contactsRef, contacts);
  };

  const handleCallContact = (phoneNumber) => {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    Linking.openURL(`tel:${formattedPhoneNumber}`);
  };

  const handleSendSMS = async (phoneNumber) => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        await SMS.sendSMSAsync(formattedPhoneNumber, "Sua mensagem aqui");
        console.log("Mensagem enviada com sucesso para:", formattedPhoneNumber);
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
      if (isNaN(text)) {
        return a.name.localeCompare(b.name);
      }
      return a.phoneNumbers[0].number.localeCompare(b.phoneNumbers[0].number);
    });

    setSelectedContacts(sortedContacts);
  };

  const renderContactItem = ({ item }) => {
    if (
      !item.name ||
      item.name.trim() === "" ||
      item.name.toLowerCase() === "null"
    ) {
      return null;
    }

    const phoneNumber =
      item.phoneNumbers && item.phoneNumbers.length > 0
        ? item.phoneNumbers[0].number
        : "";

    if (!phoneNumber) {
      return null;
    }

    return (
      <TouchableOpacity onPress={() => handleAddSelectedContact(item)}>
        <View style={styles.contactItem}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactNumber}>{phoneNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const toggleFavorite = (contactIndex) => {
    const contact = addedContacts[contactIndex];
    const updatedContact = { ...contact, favorited: !contact.favorited };

    const updatedContacts = addedContacts.map((c, index) => ({
      ...c,
      favorited: index === contactIndex ? !c.favorited : false,
    }));

    setAddedContacts(updatedContacts);
    sendContactsToDatabase(updatedContacts);
  };

  const renderAddedContactItem = ({ item, index }) => {
    const phoneNumber = item.phoneNumber;

    return (
      <View style={styles.contactContainer}>
        <View style={styles.contactItem}>
          <Text style={styles.contactName}>{item.name.substring(0, 14)}</Text>
          <Text style={styles.contactNumber}>{phoneNumber}</Text>
          <View style={styles.contactActions}>
            <Ionicons
              name={item.favorited ? "star" : "star-outline"}
              size={24}
              color={item.favorited ? "#FFD700" : "#ccc"}
              onPress={() => toggleFavorite(index)}
            />
            {phoneNumber ? (
              <>
                <TouchableOpacity
                  onPress={() => handleCallContact(phoneNumber)}
                >
                  <Ionicons
                    name="call"
                    size={24}
                    color="#008080"
                    style={styles.actionIcon}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSendSMS(phoneNumber)}>
                  <Ionicons
                    name="chatbubble"
                    size={24}
                    color="#008080"
                    style={styles.actionIcon}
                  />
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity onPress={() => handleDeleteContact(index)}>
              <Ionicons
                name="trash-bin"
                size={24}
                color="#ff0000"
                style={styles.actionIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.addedContactsContainer}>
        <Text style={styles.title}>Contatos Adicionados</Text>
        <FlatList
          data={addedContacts}
          renderItem={renderAddedContactItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      <TouchableOpacity
        style={styles.addContactButton}
        onPress={() => setShowContactListModal(true)}
      >
        <Text style={styles.addContactButtonText}>Adicionar Contato</Text>
      </TouchableOpacity>

      <Modal visible={showContactListModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar contatos"
              placeholderTextColor={"white"}
              color={"white"}
              value={searchTerm}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setSearchTerm("");
                setShowContactListModal(false);
              }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={selectedContacts}
            renderItem={renderContactItem}
            keyExtractor={(item, index) => index.toString()}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showConfirmationModal} animationType="slide">
        <View style={styles.confirmationModal}>
          <Text style={styles.confirmationText}>{confirmationMessage}</Text>
          <TouchableOpacity
            style={styles.confirmationButton}
            onPress={() => setShowConfirmationModal(false)}
          >
            <Text style={styles.confirmationButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3c0c7b",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
    marginBottom: 20,
  },
  addedContactsContainer: {
    flex: 1,
    backgroundColor: "#3c0c7b",
  },
  addContactButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  addContactButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  contactContainer: {
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F5",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  contactNumber: {
    fontSize: 14,
    color: "#888888",
  },
  contactActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
    marginLeft: 15,
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#3c0c7b",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderColor: "#CCCCCC",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  closeButton: {
    padding: 10,
  },
  confirmationModal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  confirmationText: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  confirmationButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmationButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AdicionarContatoScreen;