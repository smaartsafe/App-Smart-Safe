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
import Slider from "@react-native-community/slider";

const AudioScreen = () => {
  const [audioList, setAudioList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userUid, setUserUid] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
            url,
          };
        })
      );

      // Ordena os áudios pelo mais recente primeiro
      audioListWithMetadata.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

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

  const AudioItem = ({ createdAt, audioNumber, durationMillis, url }) => {
    const [sliderValue, setSliderValue] = useState(0);
    const [soundObject, setSoundObject] = useState(null);
    const [audioStatus, setAudioStatus] = useState({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: durationMillis,
    });

    useEffect(() => {
      return () => {
        if (soundObject) {
          soundObject.unloadAsync();
        }
      };
    }, [soundObject]);

    useEffect(() => {
      if (audioStatus.isPlaying) {
        const interval = setInterval(async () => {
          if (soundObject) {
            const status = await soundObject.getStatusAsync();
            if (status.isPlaying) {
              setSliderValue(status.positionMillis);
              setAudioStatus((prevStatus) => ({
                ...prevStatus,
                positionMillis: status.positionMillis,
              }));
            } else {
              clearInterval(interval);
            }
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setSliderValue(0); // Reset slider when not playing
      }
    }, [audioStatus.isPlaying, soundObject]);

    const playAudio = async () => {
      try {
        let newSoundObject = soundObject;

        if (!newSoundObject) {
          newSoundObject = new Audio.Sound();
          await newSoundObject.loadAsync({
            uri: url,
            positionMillis: audioStatus.positionMillis,
          });
          setSoundObject(newSoundObject);
        }

        await newSoundObject.playAsync();
        newSoundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        setAudioStatus((prevStatus) => ({
          ...prevStatus,
          isPlaying: true,
        }));
      } catch (error) {
        console.error("Erro ao reproduzir áudio:", error);
        Alert.alert("Erro", "Falha ao reproduzir o áudio");
      }
    };

    const pauseAudio = async () => {
      try {
        if (soundObject) {
          await soundObject.pauseAsync();
          setAudioStatus((prevStatus) => ({
            ...prevStatus,
            isPlaying: false,
          }));
        }
      } catch (error) {
        console.error("Erro ao pausar áudio:", error);
        Alert.alert("Erro", "Falha ao pausar o áudio");
      }
    };

    const onPlaybackStatusUpdate = (status) => {
      if (status.isLoaded) {
        if (status.didJustFinish) {
          setAudioStatus((prevStatus) => ({
            ...prevStatus,
            isPlaying: false,
            positionMillis: 0,
          }));
          setSliderValue(0); // Reset slider on finish
        } else {
          setAudioStatus((prevStatus) => ({
            ...prevStatus,
            positionMillis: status.positionMillis,
          }));
          setSliderValue(status.positionMillis);
        }
      }
    };

    const handlePlayPause = async () => {
      if (audioStatus.isPlaying) {
        await pauseAudio();
      } else {
        await playAudio();
      }
    };

    const handleSliderChange = async (value) => {
      try {
        if (soundObject) {
          await soundObject.setPositionAsync(value);
          setSliderValue(value);
          setAudioStatus((prevStatus) => ({
            ...prevStatus,
            positionMillis: value,
          }));
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
              size={24}
              color="#4CAF50"
            />
          </TouchableOpacity>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={audioStatus.durationMillis}
            value={sliderValue}
            onValueChange={handleSliderChange}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#000000"
            thumbTintColor="#4CAF50"
          />
          <TouchableOpacity
            style={styles.audioControls}
            onPress={confirmDelete}
          >
            <FontAwesome name="trash" size={24} color="red" />
          </TouchableOpacity>
        </View>
        <View style={styles.audioInfo}>
          <Text style={styles.audioDate}>{formatDate(createdAt)}</Text>
          <Text style={styles.audioDuration}>
            {formatTime(audioStatus.durationMillis)}
          </Text>
        </View>
      </View>
    );
  };

  const renderAudioItem = ({ item }) => (
    <AudioItem
      createdAt={item.createdAt}
      audioNumber={item.audioNumber}
      durationMillis={item.durationMillis}
      url={item.url}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seus Áudios Gravados</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" />
      ) : (
        <FlatList
          data={audioList}
          renderItem={renderAudioItem}
          keyExtractor={(item) => item.audioNumber}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <Text style={styles.noAudioText}>Nenhum áudio encontrado</Text>
          }
        />
      )}
      <TouchableOpacity
        style={styles.deleteAllButton}
        onPress={confirmDeleteAll}
      >
        <Text style={styles.deleteAllButtonText}>Excluir Todos os Áudios</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#3c0c7b",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "white",
  },
  audioItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  audioControls: {
    marginHorizontal: 8,
  },
  slider: {
    flex: 1,
  },
  audioInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  audioDate: {
    fontSize: 14,
    color: "#666",
  },
  audioDuration: {
    fontSize: 14,
    color: "#666",
  },
  noAudioText: {
    textAlign: "center",
    color: "#666",
    marginTop: 16,
  },
  deleteAllButton: {
    backgroundColor: "#9344fa",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  deleteAllButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default AudioScreen;
