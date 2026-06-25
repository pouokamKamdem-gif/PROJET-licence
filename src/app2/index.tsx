import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Mini Gestion Commerciale</Text>

      <View style={styles.grid}>
        <Pressable style={styles.card} onPress={() => router.push("/produits")}>
          <Text style={styles.cardTitle}>📦 Produits</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/clients")}>
          <Text style={styles.cardTitle}>👥 Clients</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/ventes")}>
          <Text style={styles.cardTitle}>💰 Ventes</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/dettes")}>
          <Text style={styles.cardTitle}>🧾 Dettes</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f6fa",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  grid: {
    gap: 15,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
});