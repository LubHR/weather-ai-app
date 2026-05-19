import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { startChatSession, resumeChatSession } from '../services/weatherService';
import { ChatMessage } from '../types/weather';

export default function ChatAssistant() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: 'Привіт! Я твій розумний погодний асистент.\n\nЗапитай мене будь-що про погоду в конкретному місті або порадься щодо планів чи одягу. Наприклад: "Яка погода у Києві і чи потрібна парасолька?"',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessageText = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      let response;
      if (!sessionId) {
        // Start new session
        response = await startChatSession(userMessageText);
      } else {
        // Resume session
        response = await resumeChatSession(sessionId, userMessageText);
      }

      // Add AI reply
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Вибач, сталася помилка з\'єднання. Будь ласка, перевір інтернет або спробуй ще раз.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = () => {
    setSessionId(null);
    setMessages([
      {
        id: Date.now().toString(),
        text: 'Сесію оновлено! Я готовий до нових запитань про погоду.',
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color="#c084fc" />
          </View>
        )}
        {isUser ? (
          <LinearGradient
            colors={['#8b5cf6', '#6d28d9']}
            style={[styles.bubble, styles.userBubble]}
          >
            <Text style={styles.userMessageText}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.aiMessageText}>{item.text}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 + insets.bottom : 0}
      style={styles.container}
    >
      {/* Header with Clear Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
          </View>
          <Text style={styles.title}>ШІ-Помічник</Text>
        </View>
        {sessionId && (
          <TouchableOpacity onPress={handleClearSession} style={styles.clearButton}>
            <Ionicons name="refresh-outline" size={16} color="#c084fc" />
            <Text style={styles.clearButtonText}>Новий діалог</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingRow}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color="#c084fc" />
          </View>
          <View style={[styles.bubble, styles.aiBubble, styles.loadingBubble]}>
            <ActivityIndicator size="small" color="#c084fc" />
            <Text style={styles.loadingText}>ШІ думає...</Text>
          </View>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Спробуй: Яка погода в Одесі завтра?"
          placeholderTextColor="#64748b"
          value={inputText}
          onChangeText={setInputText}
          style={styles.input}
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !inputText.trim()}
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}
        >
          <Ionicons name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(11, 15, 25, 0.5)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseContainer: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(167, 139, 250, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a78bfa',
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.2)',
  },
  clearButtonText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  aiRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  bubble: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  userMessageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  aiMessageText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#c084fc',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#f8fafc',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendButton: {
    backgroundColor: '#8b5cf6',
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
});
