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
import { useFocusEffect } from '@react-navigation/native';

const AdicionarContatoScreen = () => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [addedContacts, setAddedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactListModal, setShowContactListModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [allContacts, setAllContacts] = useState([]);
  const [userId, setUserId] = useState(null);

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
        phoneNumber: phoneNumbers && phoneNumbers.length > 0 ? phoneNumbers[0].number : "",
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
      if (isNaN(text)) {
        return a.name.localeCompare(b.name);
      }
      return a.phoneNumbers[0].number.localeCompare(b.phoneNumbers[0].number);
    });

    setSelectedContacts(sortedContacts);
  };

  const renderContactItem = ({ item }) => {
    if (!item.name || item.name.trim() === "" || item.name.toLowerCase() === "null") {
      return null;
    }

    const phoneNumber = item.phoneNumbers && item.phoneNumbers.length > 0
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
            name={item.favorited ? "star" : "star-outline"}
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
    setAddedContacts([]);
    sendContactsToDatabase([]);
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
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderColor: 'white',
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
