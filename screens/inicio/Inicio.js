import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Animated, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { getStorage, uploadBytesResumable, ref as sRef, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { addDoc, getFirestore, collection } from 'firebase/firestore';
import { app } from '../../src/config/firebase';
import utils from '../../src/utils';
import * as Location from 'expo-location';
import { getDatabase, ref, update, child, get } from 'firebase/database';

const Inicio = () => {
  const [recording, setRecording] = useState();
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadProgressAnimation = useRef(new Animated.Value(0)).current;
  const [audioURL, setAudioURL] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [address, setAddress] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissão necessária',
            'Por favor, conceda permissão para acessar a localização do dispositivo.'
          );
          return;
        }
  
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        setUserLocation(location);
        
        let addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
  
        if (addressResponse && addressResponse.length > 0) {
          setAddress(addressResponse[0]);
        } else {
          console.error('Nenhum endereço encontrado para as coordenadas fornecidas.');
        }
  
        console.log('Localização do usuário:', location);
        console.log('Endereço:', addressResponse[0]);
      } catch (error) {
        console.error('Erro ao obter localização atual:', error);
      }
    })();
  }, []);
  

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permissão necessária",
            "Por favor, conceda permissão para acessar a gravação de áudio para usar essa funcionalidade."
          );
        }
      } catch (error) {
        console.error("Erro ao obter permissões de gravação de áudio:", error);
      }
    })();
  }, []);

  async function startRecording() {
    try {
      if (permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); 
      setRecording(recording);
      console.log('Recording started');

      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const dbref = ref(getDatabase());
        const novoPerfil = {
          rua: address?.street || '',
          bairro: address?.subregion || '',
          cidade: address?.city || address?.district || '',
          latitude: userLocation?.coords.latitude || '',
          longitude: userLocation?.coords.longitude || ''
        };

        await update(child(dbref, `users/${user.uid}`), novoPerfil);
      } else {
        console.log("Usuário não autenticado");
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    setUploading(true);
    await uploadRecording(uri);
  }

  const uploadRecording = async (uri) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const uid = user.uid;
      const storage = getStorage();
      const storageRef = sRef(storage, `recordings/${uid}/${Date.now()}.mpeg`);
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(storageRef, blob);
  
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
          setUploadProgress(progress);
          Animated.timing(uploadProgressAnimation, {
            toValue: progress,
            duration: 200,
            useNativeDriver: false,
          }).start();
        },
        (error) => {
          console.error("Error uploading recording:", error);
          setUploading(false);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("Recording uploaded successfully at", downloadURL);
            setUploading(false);
            setUploaded(true);
            setAudioURL(downloadURL);
            setTimeout(() => {
              setUploaded(false);
            }, 3000);
            setUploadProgress(0);
            utils.fetchUserProfile().then((profile) => {
              const { nome, sobrenome, rua, bairro, cidade, estado } = profile
              addDoc(collection(getFirestore(app), "calls"), {
                nome: nome+ " " +sobrenome,
                local: rua+ ", " + bairro + ", " + cidade + ", " + estado , 
                horario: (new Date()).getTime(),
                audio: downloadURL,
                latitude: userLocation?.coords.latitude || '',
                longitude: userLocation?.coords.longitude || ''
              }).then(() => {}).catch(err => {
                console.log("Firestore:", err)
              })
            }).catch(err => {
              console.log(err)
            })

            Animated.timing(uploadProgressAnimation, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }).start();
          });
        }
      );
    } catch (error) {
      console.error("Error uploading recording:", error);
      setUploading(false);
    }
  }; 

  const handleEmergencyCall = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        console.error('Usuário não autenticado');
        Alert.alert('Erro: Usuário não autenticado.');
        return;
      }
  
      const db = getDatabase();
      const userContactsRef = ref(db, `Contatos/${user.uid}`); // Caminho correto para os contatos do usuário
  
      const snapshot = await get(userContactsRef);
      if (!snapshot.exists()) {
        console.error('Nenhum contato encontrado');
        Alert.alert('Nenhum contato encontrado.');
        return;
      }
  
      let favoritedContactFound = false; // Flag para indicar se um contato favorito foi encontrado
      snapshot.forEach((contactSnapshot) => {
        const contact = contactSnapshot.val();
        if (contact.favorited) {
          const phoneNumber = contact.phoneNumber;
  
          // Verifica se a localização está disponível antes de enviar a mensagem
          if (userLocation && userLocation.coords) {
            const { latitude, longitude } = userLocation.coords;
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  
            // Envia a mensagem para o contato favorito
            const message = `Socorro! Estou em uma situação de emergência e preciso de ajuda urgente! Por favor, clique no link abaixo para ver minha localização atual e me encontrar o mais rápido possível: ${mapsLink}`;
            const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
            Linking.openURL(url);
  
            favoritedContactFound = true; // Define a flag como verdadeira após encontrar um contato favorito
            
            // Sai do loop após encontrar um contato favorito
            return true;
          } else {
            console.error('Localização não disponível');
            Alert.alert('Erro ao enviar a mensagem: Localização não disponível.');
          }
        }
      });
  
      // Se nenhum contato favorito foi encontrado, exiba uma mensagem
      if (!favoritedContactFound) {
        console.error('Nenhum contato favorito encontrado');
        Alert.alert('Nenhum contato favorito encontrado.');
      }
    } catch (error) {
      console.error('Erro ao acionar o contato de emergência:', error);
      Alert.alert('Erro ao acionar o contato de emergência. Por favor, tente novamente mais tarde.');
    }
  };
  
  
  
return (
  <View style={styles.container}>
    <TouchableOpacity
      style={[styles.sosButton, recording && styles.sosButtonRecording]}
      onPress={recording ? stopRecording : startRecording}>
      <FontAwesome name="exclamation-triangle" size={60} color="white" />
      <Text style={styles.titleSOS}>SOS</Text>
    </TouchableOpacity>
    {uploading && (
      <View style={styles.progressContainer}>
        <Animated.View
          style={[styles.progressBar, { width: `${uploadProgress}%` }]}
        />
      </View>
    )}
    {uploaded && (
      <Text style={styles.uploadedText}>Pedido de SOS enviado com sucesso!</Text>
    )}
    <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyCall}>
      <FontAwesome name="phone" size={27} color="white" />
      <Text style={styles.emergencyText}>Acionar contato de emergência pessoal</Text>
    </TouchableOpacity>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3c0c7b',
    gap: 20,
  },
  sosButton: {
    backgroundColor: '#9344fa',
    borderRadius: 100,
    height: 200,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 5,
  },
  sosButtonRecording: {
    backgroundColor: 'darkred',
  },
  titleSOS:{
    color: 'white',
    fontSize: 26,
    fontWeight:'bold'
  },
  progressContainer: {
    width: '40%',
    height: 7,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#9344fa',
    borderRadius: 7,
  },
  emergencyButton: {
    backgroundColor: '#9344fa',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop:80,
  },
  emergencyText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  uploadedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
});

export default Inicio;
