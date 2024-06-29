import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { getAuth } from "firebase/auth";
import {
  getStorage,
  ref,
  listAll,
  getMetadata,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { FontAwesome } from "@expo/vector-icons";
import { format } from "date-fns";
import { Audio } from "expo-av";
import Slider from '@react-native-community/slider';

const AudioScreen = () => {
  const [audioList, setAudioList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userUid, setUserUid] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [soundObject, setSoundObject] = useState(null);
  const [audioStatus, setAudioStatus] = useState({
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
  });

  useEffect(() => {
    fetchUserUid();
  }, []);

  useEffect(() => {
    if (userUid) {
      fetchAudioList(userUid);
    }
  }, [userUid]);

  const fetchUserUid = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        setUserUid(user.uid);
      } else {
        console.log("Usuário não autenticado");
      }
    } catch (error) {
      console.error("Erro ao obter UID do usuário:", error);
    }
  };

  const fetchAudioList = useCallback(async (userUid) => {
    setRefreshing(true);
    setLoading(true);
    try {
      const storage = getStorage();
      const audioRef = ref(storage, `recordings/${userUid}`);
      const { items } = await listAll(audioRef);

      const audioListWithMetadata = await Promise.all(
        items.map(async (item) => {
          const metadata = await getMetadata(item);
          const createdAt = metadata.timeCreated;
          const audioNumber = item.name.split("_")[0];
          const url = await getDownloadURL(item);
          const sound = new Audio.Sound();
          await sound.loadAsync({ uri: url });
          const status = await sound.getStatusAsync();
          await sound.unloadAsync(); // Unload sound to prevent memory leaks
          return {
            item,
            createdAt,
            audioNumber,
            durationMillis: status.durationMillis,
          };
        })
      );

      // Ordena os áudios pelo mais recente primeiro
      audioListWithMetadata.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setAudioList(audioListWithMetadata);
    } catch (error) {
      console.error("Erro ao buscar lista de áudios:", error);
      Alert.alert("Erro", "Falha ao buscar lista de áudios");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    fetchAudioList(userUid);
  };

  const playAudio = async (audioNumber) => {
    try {
      if (soundObject) {
        await soundObject.unloadAsync();
      }
  
      const storage = getStorage();
      const audioRef = ref(storage, `recordings/${userUid}/${audioNumber}`);
      const url = await getDownloadURL(audioRef);
  
      const newSoundObject = new Audio.Sound();
      await newSoundObject.loadAsync({
        uri: url,
        positionMillis: audioStatus.positionMillis,
      });
  
      setSoundObject(newSoundObject);
  
      if (!audioStatus.isPlaying && audioStatus.positionMillis > 0) {
        await newSoundObject.playFromPositionAsync(audioStatus.positionMillis);
      } else {
        await newSoundObject.playAsync();
      }
  
      newSoundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      Alert.alert("Erro", "Falha ao reproduzir o áudio");
    }
  };
  
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setAudioStatus((prevStatus) => ({
        ...prevStatus,
        isPlaying: status.isPlaying,
        positionMillis: status.positionMillis,
        durationMillis: status.durationMillis,
      }));
  
      if (status.didJustFinish && audioStatus.isPlaying) {
        setAudioStatus({
          isPlaying: false,
          positionMillis: 0,
          durationMillis: 0,
        });
      }
    }
  };
  

  const pauseAudio = async () => {
    try {
      if (soundObject) {
        await soundObject.pauseAsync();
      }
    } catch (error) {
      console.error("Erro ao pausar áudio:", error);
      Alert.alert("Erro", "Falha ao pausar o áudio");
    }
  };

  const deleteAudio = async (audioNumber) => {
    try {
      const storage = getStorage();
      const audioRef = ref(storage, `recordings/${userUid}/${audioNumber}`);
      await deleteObject(audioRef);
      Alert.alert("Sucesso", "Áudio excluído com sucesso.");
      fetchAudioList(userUid);
    } catch (error) {
      console.error("Erro ao excluir áudio:", error);
      Alert.alert("Erro", "Falha ao excluir o áudio");
    }
  };

  const confirmDeleteAll = async () => {
    Alert.alert(
      "Excluir todos os áudios",
      "Tem certeza de que deseja excluir todos os áudios?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Sim",
          onPress: deleteAllAudios,
        },
      ],
      { cancelable: false }
    );
  };

  const deleteAllAudios = async () => {
    try {
      setLoading(true);
      const storage = getStorage();
      await Promise.all(
        audioList.map(async (audio) => {
          const audioRef = ref(
            storage,
            `recordings/${userUid}/${audio.audioNumber}`
          );
          await deleteObject(audioRef);
        })
      );
      Alert.alert("Sucesso", "Todos os áudios foram excluídos com sucesso.");
      setAudioList([]);
    } catch (error) {
      console.error("Erro ao excluir todos os áudios:", error);
      Alert.alert("Erro", "Falha ao excluir todos os áudios");
    } finally {
      setLoading(false);
    }
  };
  
  const formatTime = (millis) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const AudioItem = ({ createdAt, audioNumber, durationMillis }) => {
    const [sliderValue, setSliderValue] = useState(0);

    useEffect(() => {
      if (audioStatus.isPlaying) {
        const interval = setInterval(() => {
          setSliderValue((prevValue) => {
            const newValue = prevValue + 1000; // Incremento de 1000 milissegundos (1 segundo)
            if (newValue > durationMillis) {
              clearInterval(interval);
              return durationMillis;
            }
            return newValue;
          });
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setSliderValue(0);
      }
    }, [audioStatus.isPlaying, durationMillis]);

    const handlePlayPause = async () => {
      if (audioStatus.isPlaying) {
        await pauseAudio();
      } else {
        await playAudio(audioNumber);
      }
    };

    const handleSliderChange = async (value) => {
      try {
        if (soundObject) {
          await soundObject.setPositionAsync(value);
          setAudioStatus((prevStatus) => ({
            ...prevStatus,
            positionMillis: value,
          }));
          setSliderValue(value);
        }
      } catch (error) {
        console.error("Erro ao ajustar posição do áudio:", error);
        Alert.alert("Erro", "Falha ao ajustar a posição do áudio");
      }
    };

    const confirmDelete = () => {
      Alert.alert(
        "Excluir áudio",
        "Tem certeza de que deseja excluir este áudio?",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          { text: "Sim", onPress: () => deleteAudio(audioNumber) },
        ],
        { cancelable: false }
      );
    };

    const formatDate = (createdAt) => {
      return format(new Date(createdAt), "dd/MM/yyyy HH:mm");
    };

    return (
      <View style={styles.audioItem}>
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.audioControls}
            onPress={handlePlayPause}
          >
            <FontAwesome
              name={audioStatus.isPlaying ? "pause" : "play"}
              size={26}
              color="white"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.audioInfoContainer}>
          <Text style={styles.audioInfo}>{formatDate(createdAt)}</Text>
          <Slider
            style={styles.progressBar}
            value={sliderValue}
            maximumValue={durationMillis}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="#000000"
            thumbTintColor="#FFFFFF"
            onValueChange={setSliderValue}
            onSlidingComplete={handleSliderChange}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(sliderValue)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.audioControls}
          onPress={confirmDelete}
        >
          <FontAwesome name="trash" size={26} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9344fa" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.options}>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <FontAwesome name="refresh" size={26} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteAllButton}
          onPress={confirmDeleteAll}
        >
          <FontAwesome name="trash" size={26} color="white" />
          <Text style={styles.deleteAllButtonText}>Apagar Todos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={audioList}
        renderItem={({ item }) => (
          <AudioItem
            createdAt={item.createdAt}
            audioNumber={item.audioNumber}
            durationMillis={item.durationMillis}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>Nenhum áudio disponível</Text>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3c0c7b",
    padding: 10,
  },
  options: {
    width: "100%",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: "#9344fa",
    borderRadius: 50,
  },
  deleteAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#9344fa",
    padding: 10,
    borderRadius: 50,
  },
  deleteAllButtonText: {
    color: "white",
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  audioItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#9344fa",
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    justifyContent: "space-between",
  },
  audioInfoContainer: {
    flex: 1,
  },
  audioInfo: {
    color: "#fff",
    fontSize: 16,
  },
  progressBar: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: "row",
  },
  audioControls: {
    marginLeft: 10,
  },
  emptyListText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});

export default AudioScreen;
