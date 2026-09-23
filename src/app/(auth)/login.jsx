import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import { getAdminProfile } from '@/lib/storage';
import PinInput from '@/components/PinInput';

export default function LoginScreen() {
  const { login, adminName } = useAuth();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();

  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const pinInputRef = useRef(null);

  // Animated value tracking keyboard transition (0: closed/centered, 1: open/branding at top)
  const [keyboardAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const duration = Platform.OS === 'ios' ? (event?.duration || 250) : 250;
      Animated.timing(keyboardAnim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      const duration = Platform.OS === 'ios' ? (event?.duration || 250) : 250;
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardAnim]);

  // Centered top offset when keyboard is closed
  const closedTopOffset = Math.max(40, Math.round((windowHeight - 440) / 2));

  // Interpolated animated values for smooth transition
  const topSpacerHeight = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [closedTopOffset, 16],
  });

  const brandingMarginBottom = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 20],
  });

  const greetingMarginBottom = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 20],
  });

  const pinMarginBottom = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 20],
  });

  async function handlePinComplete(enteredPin) {
    const profile = await getAdminProfile();
    if (profile && profile.pin === enteredPin) {
      await login();
      router.replace('/(tabs)');
    } else {
      setHasError(true);
      // Brief error state then clear and re-focus
      setTimeout(() => {
        setPin('');
        setHasError(false);
        pinInputRef.current?.focus();
      }, 800);
    }
  }

  const firstName = adminName ? adminName.split(' ')[0] : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Animated top spacer: expands to center content when keyboard is off, shrinks to 16px when open */}
          <Animated.View style={{ height: topSpacerHeight }} />

          {/* ── Branding Logo (glides to top when keyboard is open) ── */}
          <Animated.View style={[styles.brandingRow, { marginBottom: brandingMarginBottom }]}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>TF</Text>
            </View>
            <Text style={styles.appName}>Taj Fitness</Text>
          </Animated.View>

          {/* ── Greeting ─────────────────────────────────────────── */}
          <Animated.View style={[styles.greetingBlock, { marginBottom: greetingMarginBottom }]}>
            <Text style={styles.welcomeText}>
              {firstName ? `Welcome back,\n${firstName}!` : 'Welcome back!'}
            </Text>
            <Text style={[styles.instructionText, hasError && styles.instructionError]}>
              {hasError ? 'Incorrect PIN. Try again.' : 'Enter your 5-digit PIN to continue.'}
            </Text>
          </Animated.View>

          {/* ── PIN Input (with blinking cursor, focus recovery, tap-to-select) ── */}
          <Animated.View style={{ marginBottom: pinMarginBottom }}>
            <PinInput
              ref={pinInputRef}
              value={pin}
              onChange={(newPin) => {
                setPin(newPin);
                if (hasError) setHasError(false);
              }}
              onComplete={handlePinComplete}
              hasError={hasError}
              autoFocus
            />
          </Animated.View>

          {/* ── Forgot PIN Button ─────────────────────────────────── */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push('/(auth)/reset-pin')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot PIN?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8EC',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
  },

  // Branding
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoMarkText: {
    color: '#F8E7C9',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#064E3B',
  },

  // Greeting
  greetingBlock: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#132721',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#66736F',
    textAlign: 'center',
  },
  instructionError: {
    color: '#C83E4D',
    fontFamily: 'Inter_500Medium',
  },

  // Forgot PIN
  forgotButton: {
    padding: 12,
  },
  forgotText: {
    color: '#064E3B',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
