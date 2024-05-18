import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';

export const ContatosDeEmergencia = () => {

  const fazerLigacao = (numero) => {
    // Lógica para fazer a ligação para o número de emergência
    Linking.openURL(`tel:${numero}`)
      .catch((err) => console.error('Erro ao fazer a ligação:', err));
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <View style={styles.container}>
        <View style={styles.coluna}>
          <TouchableOpacity style={styles.quadrado} onPress={() => fazerLigacao('193')}>
            <Text style={styles.texto}>Bombeiros</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quadrado} onPress={() => fazerLigacao('197')}>
            <Text style={styles.texto}>Polícia Civil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quadrado} onPress={() => fazerLigacao('180')}>
            <Text style={styles.texto}>Delegacia da Mulher</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.coluna}>
          <TouchableOpacity style={styles.quadrado} onPress={() => fazerLigacao('192')}>
            <Text style={styles.texto}>Ambulância</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quadrado} onPress={() => fazerLigacao('192')}>
            <Text style={styles.texto}>SAMU</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quadrado} onPress={() => fazerLigacao('180')}>
            <Text style={styles.texto}>Centro da Mulher</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
    backgroundColor: '#3c0c7b',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  coluna: {
    flexDirection: 'column',
  },
  quadrado: {
    backgroundColor: '#9344fa',
    borderRadius: 5,
    marginBottom: 20,
    alignItems: 'center',
    height: 180,
    width: 150,
    borderRadius: 10,
    justifyContent: 'center',
    flexDirection: 'column'
  },
  texto: {
    marginBottom: 10,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
});

export default ContatosDeEmergencia;
