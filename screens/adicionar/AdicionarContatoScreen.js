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
  StatusBar,
  Animated
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
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

    let cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.length === 11) {
      cleaned = cleaned.substring(0, 2) + cleaned.substring(3);
    }

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
      <TouchableOpacity 
        onPress={() => handleAddSelectedContact(item)}
        style={styles.modalContactItem}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.modalContactName}>{item.name}</Text>
          <Text style={styles.modalContactNumber}>{phoneNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const toggleFavorite = (contactIndex) => {
    const updatedContacts = addedContacts.map((contact, index) => ({
      ...contact,
      favorited: index === contactIndex ? !contact.favorited : contact.favorited,
    }));

    setAddedContacts(updatedContacts);
    sendContactsToDatabase(updatedContacts);
  };

  const renderAddedContactItem = ({ item, index }) => {
    return (
      <Animated.View style={styles.contactContainer}>
        <View style={styles.contactItem}>
          <View style={styles.contactMainInfo}>
            <View style={[styles.avatarContainer, ]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactNumber}>{item.phoneNumber}</Text>
            </View>
          </View>
          
          <View style={styles.contactActions}>
            <TouchableOpacity 
              onPress={() => toggleFavorite(index)} 
              style={[styles.actionButton, styles.favoriteButton]}
            >
              <Ionicons
                name={item.favorited ? "heart" : "heart-outline"}
                size={22}
                color={item.favorited ? "#FF4B6E" : "#666"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleCallContact(item.phoneNumber)}
              style={[styles.actionButton, styles.callButton]}
            >
              <Ionicons name="call" size={22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleSendSMS(item.phoneNumber)}
              style={[styles.actionButton, styles.messageButton]}
            >
              <Ionicons name="chatbubble" size={22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleDeleteContact(index)}
              style={[styles.actionButton, styles.deleteButton]}
            >
              <Ionicons name="trash" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A1A2E" barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Contatos</Text>
          <Text style={styles.headerSubtitle}>
            {addedContacts.length} contatos
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowContactListModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar contatos..."
          placeholderTextColor="#666"
          value={searchTerm}
          onChangeText={handleSearch}
        />
      </View>
  
      <View style={styles.addedContactsContainer}>
        {addedContacts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="people-outline" size={64} color="#fff" />
            </View>
            <Text style={styles.emptyStateText}>Sua lista está vazia</Text>
            <Text style={styles.emptyStateSubText}>
              Adicione seus contatos favoritos
            </Text>
          </View>
        ) : (
          <FlatList
            data={addedContacts}
            renderItem={renderAddedContactItem}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contactsList}
          />
        )}
      </View>
  
      <Modal visible={showContactListModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Ionicons name="person-add-outline" size={24} color="#fff" />
              <Text style={styles.modalTitle}>Novo Contato</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setSearchTerm("");
                setShowContactListModal(false);
              }}
            >
              <View style={styles.closeButtonInner}>
                <Ionicons name="close" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.modalSearchIcon} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar contatos..."
              placeholderTextColor="#666"
              value={searchTerm}
              onChangeText={handleSearch}
            />
          </View>
  
          <FlatList
            data={selectedContacts}
            renderItem={renderContactItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3c0c7b",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#3c0c7b',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
  },
  addButton: {
    width: 50,
    height: 50,
    backgroundColor: '#9344fa',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4B50FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#666',
    fontSize: 16,
  },
  addedContactsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contactContainer: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#252542",
  },
  contactItem: {
    padding: 16,
  },
  contactMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#9344fa',  
  },
  avatarText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "600",
    color: '#fff',
    marginBottom: 4,
  },
  contactNumber: {
    fontSize: 14,
    color: "#666",
  },
  contactActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    backgroundColor: '#2A2A42',
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  messageButton: {
    backgroundColor: '#4B50FF',
  },
  deleteButton:{
    backgroundColor: '#FF4B6E',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#9344fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#3c0c7b",
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "400",
    color: '#fff',
  },
  closeButton: {
    marginLeft: 16,

  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9344fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  modalSearchInput: {
    flex: 1,
    height: 50,
    color: '#666',
    fontSize: 16,
  },
  modalContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalList: {
    paddingHorizontal: 20,
    color: '#fff',
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalAvatarText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  contactInfo: {
    gap: 4,
  },
  modalContactName: {
    fontSize: 18,
    fontWeight: "600",
    color: '#fff',
  },
  modalContactNumber: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  modalContactActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFavoriteButton: {
    backgroundColor: '#2A2A42',
  },
  modalCallButton: {
      backgroundColor: '#4CAF50',
  },
  modalMessageButton: {
    backgroundColor: '#4B50FF',
    },
});

export default AdicionarContatoScreen;
  
