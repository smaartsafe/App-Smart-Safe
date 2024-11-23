import React, { useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Pressable, ActivityIndicator, Animated, Image } from 'react-native';
import { TypingAnimation } from 'react-native-typing-animation';
import api from '../../src/services/http';
import Ionicons from '@expo/vector-icons/Ionicons';
const ChatScreen = () => {
  // Mensagem inicial do bot
  const initialMessage = {
    id: Date.now(),
    text: "Olá! Sou seu assistente virtual. Como posso ajudar você hoje?",
    sender: 'bot'
  };

  const [messages, setMessages] = useState([initialMessage]); // Inicializando com a mensagem
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
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
      
      const sentences = botAnswer.split('. ');

      let messageIndex = 0;
      const intervalId = setInterval(() => {
        if (messageIndex < sentences.length) {
          const botMessage = {
            id: Date.now() + messageIndex + 1,
            text: sentences[messageIndex] + (sentences[messageIndex].endsWith('.') ? '' : '.'),
            sender: 'bot',
          };
          setMessages((prevMessages) => [...prevMessages, botMessage]);
          messageIndex++;
        } else {
          clearInterval(intervalId);
          fadeOut();
          setIsLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Erro:', error);
      fadeOut();
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now() + 1, text: 'Erro ao obter resposta.', sender: 'bot' },
      ]);
      setIsLoading(false);
    }
  };

  // Resto do código permanece igual...
  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageRow,
      item.sender === 'user' ? styles.userMessageRow : styles.botMessageRow
    ]}>
      {item.sender === 'bot' && (
        <Image
          source={{ uri: 'https://ui-avatars.com/api/?name=Bot&background=007AFF&color=fff' }}
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
          source={{ uri: 'https://ui-avatars.com/api/?name=User&background=E9ECEF&color=333' }}
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
          source={{ uri: 'https://ui-avatars.com/api/?name=Bot&background=007AFF&color=fff' }}
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
  // Estilos permanecem os mesmos...
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
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
    marginHorizontal: 8,
  },
  messageContainer: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  sendButtonTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  userMessage: { 
    backgroundColor: '#007AFF',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingAnimation: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
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
    backgroundColor: '#007AFF',
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