import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import NotFoundScreen from './src/screens/NotFoundScreen';
import CandidatesScreen from './src/screens/CandidatesScreen';
import AdminProductsScreen from './src/screens/AdminProductsScreen';
import AdminProductScreen from './src/screens/AdminProductScreen';
import AdminVariantScreen from './src/screens/AdminVariantScreen';
import { colors } from './src/theme/theme';

const Stack = createNativeStackNavigator();

function Routes() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {status === 'signedIn' ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="NotFound" component={NotFoundScreen} />
          <Stack.Screen name="Candidates" component={CandidatesScreen} />
          <Stack.Screen name="AdminProducts" component={AdminProductsScreen} />
          <Stack.Screen name="AdminProduct" component={AdminProductScreen} />
          <Stack.Screen name="AdminVariant" component={AdminVariantScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Routes />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
