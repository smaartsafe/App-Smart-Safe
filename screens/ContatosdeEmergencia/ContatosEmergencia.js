import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Platform } from 'react-native';
import Ionicons  from '@expo/vector-icons/Ionicons';

const EmergencyContacts = () => {
  const emergencyContacts = [
    { 
      title: 'Bombeiros', 
      number: '193', 
      icon: 'flame-outline', 
      color: '#FF6347' 
    },
    { 
      title: 'Polícia Civil', 
      number: '197', 
      icon: 'shield-half-outline', 
      color: '#4169E1' 
    },
    { 
      title: 'Delegacia da Mulher', 
      number: '180', 
      icon: 'female-outline', 
      color: '#FF69B4' 
    },
    { 
      title: 'Ambulância', 
      number: '192', 
      icon: 'bandage-outline', 
      color: '#32CD32' 
    },
    { 
      title: 'SAMU', 
      number: '192', 
      icon: 'medkit-outline', 
      color: '#1E90FF' 
    },
    { 
      title: 'Centro da Mulher', 
      number: '180', 
      icon: 'heart-outline', 
      color: '#FF1493' 
    }
  ];

  const makeEmergencyCall = (number) => {
    const phoneUrl = Platform.OS === 'android' 
      ? `tel:${number}` 
      : `telprompt:${number}`;

    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        }
      })
      .catch((err) => console.error('Erro ao fazer a ligação:', err));
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollViewContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity 
            key={index}
            style={[styles.contactButton, { backgroundColor: contact.color }]}
            onPress={() => makeEmergencyCall(contact.number)}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              {contact.icon.startsWith('fa') ? (
                <Ionicons 
                  name={contact.icon.split('-')[1]} 
                  size={40} 
                  color="white" 
                />
              ) : (
                <Ionicons 
                  name={contact.icon} 
                  size={40} 
                  color="white" 
                />
              )}
              <Text style={styles.buttonText}>{contact.title}</Text>
              <Text style={styles.numberText}>{contact.number}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
    backgroundColor: '#0A2342',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  container: {
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactButton: {
    width: '48%', 
    aspectRatio: 1,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  numberText: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  }
});

export default EmergencyContacts;
