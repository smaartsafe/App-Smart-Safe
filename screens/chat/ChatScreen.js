import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Pressable, ActivityIndicator, Animated, Image } from 'react-native';
import { TypingAnimation } from 'react-native-typing-animation';
import api from '../../src/services/http';  // API do seu back-end
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
const ChatScreen = () => {
  const [messages, setMessages] = useState([]);  // Inicia com um array vazio
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [perfilData, setPerfilData] = useState(null);
  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;

    const userMessage = { id: Date.now(), text: inputText, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setIsLoading(true);
    fadeIn();

    try {
      const response = await api.post('/chat', { query: inputText });
      const botAnswer = response.data.response || 'Resposta não encontrada.';
      console.log('Resposta do bot:', botAnswer);

      // Adiciona a resposta completa do bot em um único bloco
      const botMessage = {
        id: Date.now(),
        text: botAnswer,
        sender: 'bot',
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
      fadeOut();
      setIsLoading(false);
    } catch (error) {
      console.error('Erro:', error);
      fadeOut();
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now(), text: 'Erro ao obter resposta.', sender: 'bot' },
      ]);
      setIsLoading(false);
    }
  };

    useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const dbRef = ref(getDatabase(), `users/${user.uid}`);
      const unsubscribe = onValue(dbRef, (snapshot) => {
        if (snapshot.exists()) {
          setPerfilData(snapshot.val());
        } else {
          console.log("Nenhum dado encontrado para o usuário logado");
        }
      });

      return () => unsubscribe();
    } else {
      console.log("Usuário não autenticado");
    }
  }, []);
  const getAvatarUrl = () => {
    const { foto, nome } = perfilData || {};

    if (foto && foto !== "") {
      return foto;
    } else {
      return `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(
        nome || ""
      )}`;
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageRow,
      item.sender === 'user' ? styles.userMessageRow : styles.botMessageRow
    ]}>
      {item.sender === 'bot' && (
        <Image
          source={require('../../src/assets/chatzin.png')}
          style={styles.avatar}
        />
      )}
      <View
        style={[
          styles.messageContainer,
          item.sender === 'user' ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userMessageText : styles.botMessageText,
        ]}>
          {item.text}
        </Text>
      </View>
      {item.sender === 'user' && (
        <Image
          source={{ uri: getAvatarUrl() }}
          style={styles.avatar}
        />
      )}
    </View>
  );

  const renderTypingIndicator = () => (
    <Animated.View 
      style={[
        styles.typingIndicatorContainer,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        },
      ]}
    >
      <View style={styles.messageRow}>
        <Image
          source={require('../../src/assets/chatzin.png')}
          style={styles.avatar}
        />
        <View style={styles.typingIndicatorBubble}>
          <TypingAnimation
            dotColor="#666"
            dotMargin={5}
            dotAmplitude={3}
            dotSpeed={0.15}
            dotRadius={4}
            style={styles.typingAnimation}
          />
        </View>
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />
      
      {isLoading && renderTypingIndicator()}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Digite sua mensagem..."
          multiline
          maxHeight={100}
        />
        <Pressable
          onPress={sendMessage}
          style={({ pressed }) => [
            styles.sendButton,
            pressed && styles.sendButtonPressed,
          ]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={24} color="#fff" style={styles.sendButtonText} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f1f1f1' 
  },
  messagesList: { 
    paddingVertical: 15
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  botMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  messageContainer: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: { 
    backgroundColor: '#9344fa',
    borderBottomRightRadius: 4,
  },
  botMessage: { 
    backgroundColor: '#E9ECEF',
    borderBottomLeftRadius: 4,
  },
  messageText: { 
    fontSize: 16 
  },
  userMessageText: {
    color: '#fff'
  },
  botMessageText: {
    color: '#333'
  },
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  typingIndicatorBubble: {
    backgroundColor: '#E9ECEF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    alignSelf: 'flex-start',
    minWidth: 60, // Garante uma largura mínima para o bubble
    minHeight: 40, // Garante uma altura mínima para o bubble
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#9344fa',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    height: 44,
  },
  sendButtonPressed: { 
    opacity: 0.8 
  },
  sendButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
