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

const AudioScreen = () => {
  const [audioList, setAudioList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userUid, setUserUid] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [soundObject, setSoundObject] = useState(null);

  const deleteAllAudios = async () => {
    try {
      setLoading(true); // Define o estado de carregamento como true ao iniciar a exclusão dos áudios
      const userResponse = await new Promise((resolve, reject) => {
        Alert.alert(
          "Excluir todos os áudios",
          "Tem certeza de que deseja excluir todos os áudios?",
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Sim",
              onPress: async () => {
                try {
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
                  Alert.alert(
                    "Sucesso",
                    "Todos os áudios foram excluídos com sucesso."
                  );
                  setAudioList([]); // Limpa a lista de áudios após a exclusão
                  resolve(true);
                } catch (error) {
                  console.error("Erro ao excluir todos os áudios:", error);
                  Alert.alert("Erro", "Falha ao excluir todos os áudios");
                  reject(error);
                }
              },
            },
          ],
          { cancelable: false }
        );
      });

      if (!userResponse) {
        setLoading(false); // Define o estado de carregamento como false se o usuário cancelar a exclusão
      }
    } catch (error) {
      console.error("Erro ao excluir todos os áudios:", error);
      Alert.alert("Erro", "Falha ao excluir todos os áudios");
    } finally {
      setLoading(false); // Define o estado de carregamento como false em caso de erro ou ao finalizar a exclusão
    }
  };

  const [audioStatus, setAudioStatus] = useState({
    isPlaying: false,
    positionMillis: 0, // Armazena o tempo de reprodução atual
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
          return { item, createdAt, audioNumber };
        })
      );

      // Ordena os áudios pelo mais recente primeiro
      audioListWithMetadata.sort((a, b) => b.createdAt - a.createdAt);

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
      }); // Passa o tempo de reprodução atual
      setSoundObject(newSoundObject);

      // Verifica se o áudio está pausado e se a posição de reprodução é maior que 0
      if (!audioStatus.isPlaying && audioStatus.positionMillis > 0) {
        await newSoundObject.playFromPositionAsync(audioStatus.positionMillis); // Resumindo a reprodução do ponto pausado
      } else {
        await newSoundObject.playAsync();
      }

      setAudioStatus({ ...audioStatus, isPlaying: true });
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      Alert.alert("Erro", "Falha ao reproduzir o áudio");
    }
  };

  const pauseAudio = async () => {
    try {
      if (soundObject) {
        const status = await soundObject.getStatusAsync();
        await soundObject.pauseAsync();
        setAudioStatus({
          ...audioStatus,
          isPlaying: false,
          positionMillis: status.positionMillis,
        }); // Atualiza o tempo de reprodução ao pausar
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
      fetchAudioList(userUid); // Atualiza a lista de áudios após a exclusão
    } catch (error) {
      console.error("Erro ao excluir áudio:", error);
      Alert.alert("Erro", "Falha ao excluir o áudio");
    }
  };

  const AudioItem = ({ createdAt, audioNumber, index }) => {
    const [isPlaying, setIsPlaying] = useState(false);

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

    useEffect(() => {
      if (soundObject) {
        soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      }
      return () => {
        if (soundObject) {
          soundObject.setOnPlaybackStatusUpdate(null);
        }
      };
    }, [soundObject]);

    const onPlaybackStatusUpdate = (status) => {
      if (status.isPlaying) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    };

    const handlePlayPause = async () => {
      if (isPlaying) {
        await pauseAudio();
        setIsPlaying(false);
      } else {
        await playAudio(audioNumber);
        setIsPlaying(true);
      }
    };
    return (
      <View style={styles.audioItem}>
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.audioControls}
            onPress={handlePlayPause}
          >
            <FontAwesome
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.audioControls}
            onPress={confirmDelete}
          >
            <FontAwesome name="trash" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.audioInfo}>{`${formatDate(createdAt)}`}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.Options}>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <FontAwesome name="refresh" size={26} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteAllButton}
          onPress={deleteAllAudios}
        >
          <FontAwesome name="trash" size={26} color="white" />
          <Text style={styles.deleteAllButtonText}>Apagar Todos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={audioList}
        renderItem={({ item, index }) => (
          <AudioItem
            createdAt={item.createdAt}
            audioNumber={item.audioNumber}
            index={index}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={
          <Text style={styles.titleText}>Nenhum áudio disponível</Text>
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
  audioItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#9344fa",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 15,
    justifyContent: "space-between",
  },
  controlsContainer: {
    flexDirection: "row",
  },
  audioControls: {
    marginRight: 15,
  },
  audioInfo: {
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "",
  },
  Options: {
    width: '100%',
    flexDirection: "row-reverse",
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
    padding: 5,
  },
  refreshButton: {
    marginLeft: 10,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  deleteAllButtonText: {
    color: "white",
    marginLeft: 5,
  },
  titleText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});

export default AudioScreen;
