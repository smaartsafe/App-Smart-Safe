import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Ionicons  from "@expo/vector-icons/Ionicons";
import { TouchableOpacity, StyleSheet, Image, StatusBar } from "react-native";
import LoginCadastroScreen from "./screens/loginEcadastro/LoginCadastroScreen";
import LoginScreen from "./screens/login/LoginScreen";
import Inicio from "./screens/inicio/Inicio";
import AdicionarContatoScreen from "./screens/adicionar/AdicionarContatoScreen";
import PerfilScreen from "./screens/perfil/PerfilScreen";
import ChatScreen from "./screens/chat/ChatScreen";
import SegundaParte from "./screens/cadastro/SegundaParte";
import ResetPasswordScreen from "./screens/ResetPasswordScreen/ResetPassword";
import DadosdoUsuario from "./screens/dadosdoUsuario/Dados";
import MapScreen from "./screens/mapa/mapaScreen";
import Cadastro from "./screens/cadastro/CadastroScreen";
import Audio from "./screens/audio/Audio";
import Emergencia from "./screens/ContatosdeEmergencia/ContatosEmergencia";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const MainTabs = ({ navigation }) => {
  const [perfilData, setPerfilData] = useState(null);

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

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: "#3c0c7b",
          width: 250,
        },
        drawerActiveTintColor: "#9344fa",
        drawerInactiveTintColor: "#fff",
        itemStyle: { marginVertical: 5 }, // Para margens verticais
        drawerLabelStyle: {
          fontSize: 15, 
          paddingVertical: 3,
          fontWeight: 400,
          letterSpacing: 1,
        },
        headerStyle: {
          height: 95,
          backgroundColor: "#9344fa",
        },
        headerTintColor: "#fff",
        drawerStatusBarAnimation: "fade",
        headerTitleStyle: {
          fontWeight: "100",
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("Perfil")}
            style={styles.profileIcon}
          >
            <Image
              source={{
                uri: getAvatarUrl(),
              }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 100,
                borderWidth: 1,
                borderColor: "#fff",
              }}
            />
          </TouchableOpacity>
        ),
      }}
    >
      <Drawer.Screen
        name="Inicio"
        component={Inicio}
        options={{
          headerTitle: "",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Adicionar Contatos"
        component={AdicionarContatoScreen}
        options={{
          headerTitle: "",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Números de Emergência"
        component={Emergencia}
        options={{
          headerTitle: "",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="keypad-outline" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Audios Gravados"
        component={Audio}
        options={{
          headerTitle: "",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="musical-notes-outline" size={20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Chat Bot"
        component={ChatScreen}
        options={{
          headerTitle: "",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={20} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};  
const App = () => {
  return (
    <NavigationContainer>
      <StatusBar
        barStyle="#fff"
        backgroundColor={"#0008"}
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
      />
      <Stack.Navigator initialRouteName="LoginCadastro">
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="LoginCadastro"
          component={LoginCadastroScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={Inicio}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SegundaParte"
          component={SegundaParte}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MapScreen"
          component={MapScreen}
          options={{
            title: "Sua localização",
            headerStyle: {
              backgroundColor: "#9344fa",
            },
            headerTintColor: "#fff",
          }}
        />
        <Stack.Screen
          name="Emergencia"
          component={Emergencia}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Cadastro"
          component={Cadastro}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Dados do Usúario"
          component={DadosdoUsuario}
          options={{
            title: "Seus Dados",
            headerTitleAlign: "center",
            headerStyle: {
              backgroundColor: "#9344fa",
            },
            headerTintColor: "#fff",
          }}
        />
        <Stack.Screen
          name="Audios Gravados"
          component={Audio}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Perfil"
          component={PerfilScreen}
          options={{
            title: "Perfil",
            headerTitleAlign: "center",
            headerStyle: {
              backgroundColor: "#9344fa",
            },
            headerTintColor: "#fff",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  profileIcon: {
    marginRight: 15,
  },
});

export default App;
