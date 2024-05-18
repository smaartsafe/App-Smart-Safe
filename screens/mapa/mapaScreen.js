import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { FontAwesome5 } from "@expo/vector-icons";

const MapScreen = ({ navigation }) => {
  const [mapRegion, setMapRegion] = useState(null);
  const mapRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(0);
  const mapLayoutTimeout = useRef(null);
  const [mapType, setMapType] = useState("standard");
  const [streetNames, setStreetNames] = useState([]);
  const [markers, setMarkers] = useState([]);

  const initialRegion = {
    latitude: -23.55052,
    longitude: -46.633308,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const detectNeighborhood = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permissão de localização não concedida");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (address && address.length > 0) {
        const streets = address
          .slice(0, 3)
          .map(
            (addr) =>
              `${addr.street || ""}, ${addr.subregion || addr.city || ""}`
          );
        setStreetNames(streets);
      } else {
        console.log(
          "Informações de endereço não disponíveis para as coordenadas fornecidas."
        );
      }
    } catch (error) {
      console.error("Erro ao detectar o nome do bairro:", error);
    }
  };

  useEffect(() => {
    detectNeighborhood();
  }, []);

  useEffect(() => {
    const subscribeToLocationUpdates = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permissão de localização não concedida");
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        });

        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address && address.length > 0) {
          const streets = address
            .slice(0, 3)
            .map(
              (addr) =>
                `${addr.street || ""}, ${addr.subregion || addr.city || ""}`
            );
          setStreetNames(streets);
        }
      } catch (error) {
        console.error("Erro ao obter a localização:", error);
      }
    };

    subscribeToLocationUpdates();
  }, []);

  const handleMapLayoutChange = () => {
    clearTimeout(mapLayoutTimeout.current);
    mapLayoutTimeout.current = setTimeout(() => {
      if (
        mapRegion &&
        mapRegion.latitude &&
        mapRegion.longitude &&
        mapRef.current &&
        mapRef.current.setCamera
      ) {
        mapRef.current.setCamera({
          center: {
            latitude: mapRegion.latitude,
            longitude: mapRegion.longitude,
          },
          zoom: zoomLevel,
        });
      }
    }, 5);
  };

  const handleMapRegionChange = (region) => {
    setMapRegion(region);
    setZoomLevel(region.longitudeDelta);
  };

  const toggleMapType = () => {
    switch (mapType) {
      case "satellite":
        setMapType("standard");
        break;
      case "standard":
        setMapType("terrain");
        break;
      case "terrain":
        setMapType("satellite");
        break;
      default:
        setMapType("satellite");
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <MapView
          provider={MapView.PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion || initialRegion}
          mapType={mapType} // Adicione esta linha para definir o tipo de mapa
          showsUserLocation={true}
          onLayout={handleMapLayoutChange}
          onRegionChangeComplete={handleMapRegionChange}
          ref={mapRef}
          onError={(e) => console.error("Erro no MapView:", e.nativeEvent)}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.key}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
            />
          ))}
        </MapView>
      </View>

      <TouchableOpacity style={styles.mapTypeButton} onPress={toggleMapType}>
        <FontAwesome5 name="layer-group" size={24} color="#444" />
      </TouchableOpacity>

      <View style={styles.bottomBox}>
        {streetNames.map((name, index) => (
          <Text key={index} style={styles.streetName}>
            Rua mais próxima: {name}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapTypeButton: {
    position: "absolute",
    top: 15,
    left: 10,
    backgroundColor: "#fff",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  bottomBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    padding: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  streetName: {
    fontSize: 16,
    fontWeight: "300",
    color: "#fff",
  },
});

export default MapScreen;
