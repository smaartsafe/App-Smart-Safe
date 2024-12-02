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
} from "firebase/storage";
import Ionicons from "@expo/vector-icons/Ionicons";
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

          return {
            createdAt,
            audioNumber,
            durationMillis: 0, // Será definido quando o áudio for carregado
            url,
          };
        })
      );

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

  const formatTime = (millis) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

const AudioItem = ({ createdAt, audioNumber, url }) => {
  const [soundObject, setSoundObject] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [audioStatus, setAudioStatus] = useState({
    positionMillis: 0,
    durationMillis: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Carrega o áudio na primeira renderização
  useEffect(() => {
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        const newSound = new Audio.Sound();
        await newSound.loadAsync(
          { uri: url },
          { shouldPlay: false, isLooping: false }
        );
        const status = await newSound.getStatusAsync();
        setAudioStatus({
          positionMillis: status.positionMillis,
          durationMillis: status.durationMillis,
        });
        setSoundObject(newSound);
      } catch (error) {
        console.error("Erro ao carregar áudio:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (soundObject) {
        soundObject.unloadAsync(); // Descarrega o áudio ao desmontar
      }
    };
  }, [url]); // Só executa quando a URL muda

  // Atualiza o estado do áudio durante a reprodução
  useEffect(() => {
  if (soundObject) {
    soundObject.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setAudioStatus({
          positionMillis: status.positionMillis,
          durationMillis: status.durationMillis,
        });
        setSliderValue(status.positionMillis);

        // Quando o áudio terminar, apenas pare e não reinicie
        if (status.didJustFinish) {
          setIsPlaying(false);
          setSliderValue(status.durationMillis); // Ajusta o slider para o final
          soundObject.stopAsync(); // Para a reprodução
        }
      }
    });
  }

  return () => {
    if (soundObject) {
      soundObject.setOnPlaybackStatusUpdate(null); // Remove callback ao desmontar
    }
  };
}, [soundObject]);


  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await soundObject.pauseAsync();
      } else if (!isLoading) {
        await soundObject.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error("Erro ao alternar play/pause:", error);
      Alert.alert("Erro", "Falha ao reproduzir ou pausar o áudio.");
    }
  };

  const handleSliderChange = async (value) => {
    try {
      if (soundObject) {
        await soundObject.setPositionAsync(value);
        setSliderValue(value);
      }
    } catch (error) {
      console.error("Erro ao ajustar posição do áudio:", error);
    }
  };

  const formatTime = (millis) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
  <View style={styles.audioItem}>
    <Text style={styles.audioTitle}>
      Áudio {audioNumber} - {format(new Date(createdAt), "dd/MM/yyyy")}
    </Text>
    <View style={styles.controlsContainer}>
      <TouchableOpacity
        onPress={handlePlayPause}
        disabled={isLoading}
        style={styles.playPauseButton}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={24}
          color={isLoading ? "gray" : "#9344fad"}
        />
      </TouchableOpacity>
      <Slider
  style={styles.slider}
  minimumValue={0}
  maximumValue={audioStatus.durationMillis || 1}
  value={sliderValue}
  onSlidingComplete={handleSliderChange}
  thumbTintColor="#9344fa" // Cor do ponto
  minimumTrackTintColor="#9344fa" // Cor da parte já reproduzida
  maximumTrackTintColor="#ddd" // Cor da parte não reproduzida
/>
    </View>
    <Text style={styles.time}>
      {formatTime(audioStatus.positionMillis)} /{" "}
      {formatTime(audioStatus.durationMillis)}
    </Text>
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
        <ActivityIndicator size="large" color="#9344fa" />
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
    shadowColor: "#9344fa",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    width: "100%", // Garante que o slider e o botão ocupem toda a largura
  },
  playPauseButton: {
    marginRight: 8, // Espaçamento entre o botão de play e o slider
  },
  slider: {
    flex: 1, // Faz com que o slider ocupe o máximo de espaço disponível
    
  },
  time: {
    fontSize: 14,
    color: "#333",
    textAlign: "right",
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

});

export default AudioScreen;
