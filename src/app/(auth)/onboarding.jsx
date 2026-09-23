import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import PinInput from '@/components/PinInput';

export default function OnboardingScreen() {
  const { setupAccount } = useAuth();
  const router = useRouter();

  // step: 'welcome' | 'name' | 'pin' | 'confirm'
  const [step, setStep] = useState('welcome');
  const [name, setName] = useState('');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [confirmError, setConfirmError] = useState(false);

  const nameInputRef = useRef(null);
  const pinInputRef = useRef(null);
  const confirmInputRef = useRef(null);

  // Stable animated values for step transitions
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [slideAnim] = useState(() => new Animated.Value(0));

  function transitionTo(nextStep) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -24, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(24);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }

  function handleNameContinue() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    transitionTo('pin');
  }

  function handlePinContinue(enteredPin) {
    const finalPin = enteredPin || pin;
    if (finalPin.length !== 5) {
      Alert.alert('Required', 'Please enter all 5 digits.');
      return;
    }
    transitionTo('confirm');
  }

  async function handleConfirmSubmit(enteredConfirmPin) {
    const finalConfirm = enteredConfirmPin || confirmPin;
    if (finalConfirm.length !== 5) {
      Alert.alert('Required', 'Please enter all 5 digits.');
      return;
    }
    if (pin !== finalConfirm) {
      setConfirmError(true);
      setTimeout(() => {
        setConfirmPin('');
        setConfirmError(false);
        confirmInputRef.current?.focus();
      }, 800);
      return;
    }

    // Successfully set up account: auto-login and navigate directly to home screen
    await setupAccount(name.trim(), pin);
    router.replace('/(tabs)');
  }

  // ── 1. WELCOME STEP ────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeTop}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>TF</Text>
            </View>
            <Text style={styles.welcomeAppName}>Taj Fitness</Text>
            <Text style={styles.welcomeTagline}>Manage. Track. Grow.</Text>
          </View>

          <View style={styles.welcomeBottom}>
            <Text style={styles.welcomeHeading}>Your gym,{'\n'}fully in control.</Text>
            <Text style={styles.welcomeSubtext}>
              A simple offline app to manage your members and collections — no internet needed.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => transitionTo('name')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Let&apos;s Get Started →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── 2. NAME ENTRY STEP ─────────────────────────────────────────────────────
  if (step === 'name') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[
              styles.stepContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Step indicator */}
            <View style={styles.stepIndicatorRow}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
              <View style={styles.stepDot} />
            </View>

            <Text style={styles.stepHeading}>What&apos;s your name?</Text>
            <Text style={styles.stepSubtext}>This will be shown on your dashboard.</Text>

            {/* Real TextInput with visible blinking cursor & selection */}
            <View style={styles.inputWrapper}>
              <TextInput
                ref={nameInputRef}
                style={[
                  styles.nameInput,
                  isNameFocused && styles.nameInputFocused,
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ahmed Khan"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                cursorColor="#064E3B"
                selectionColor="#064E3B"
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
                onSubmitEditing={handleNameContinue}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 24 }]}
              onPress={handleNameContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── 3. PIN SETUP STEP ──────────────────────────────────────────────────────
  if (step === 'pin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[
              styles.stepContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.stepIndicatorRow}>
              <View style={[styles.stepDot, styles.stepDotDone]} />
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
            </View>

            <Text style={styles.stepHeading}>Create your PIN</Text>
            <Text style={styles.stepSubtext}>Choose a 5-digit PIN to secure your account.</Text>

            {/* PinInput with blinking cursor, tap-to-select, and focus recovery */}
            <View style={styles.pinWrapper}>
              <PinInput
                ref={pinInputRef}
                value={pin}
                onChange={setPin}
                onComplete={(digits) => {
                  setTimeout(() => handlePinContinue(digits), 150);
                }}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 36 }]}
              onPress={() => handlePinContinue(pin)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── 4. CONFIRM PIN STEP ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.stepContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.stepIndicatorRow}>
            <View style={[styles.stepDot, styles.stepDotDone]} />
            <View style={[styles.stepDot, styles.stepDotDone]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>

          <Text style={styles.stepHeading}>Confirm your PIN</Text>
          <Text style={[styles.stepSubtext, confirmError && { color: '#C83E4D' }]}>
            {confirmError ? "PINs don't match — try again." : 'Re-enter the same 5-digit PIN to confirm.'}
          </Text>

          {/* PinInput with auto-focus and auto-submit */}
          <View style={styles.pinWrapper}>
            <PinInput
              ref={confirmInputRef}
              value={confirmPin}
              onChange={(newPin) => {
                setConfirmPin(newPin);
                if (confirmError) setConfirmError(false);
              }}
              onComplete={(digits) => {
                handleConfirmSubmit(digits);
              }}
              hasError={confirmError}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 36 }]}
            onPress={() => handleConfirmSubmit(confirmPin)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Complete Setup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setConfirmPin('');
              setConfirmError(false);
              transitionTo('pin');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Change PIN</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8EC',
  },
  keyboardAvoiding: {
    flex: 1,
  },

  // Welcome screen
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 40,
  },
  welcomeTop: {
    alignItems: 'center',
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  logoMarkText: {
    color: '#F8E7C9',
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  welcomeAppName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#064E3B',
    marginBottom: 4,
  },
  welcomeTagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#66736F',
    letterSpacing: 0.5,
  },
  welcomeBottom: {
    paddingBottom: 8,
  },
  welcomeHeading: {
    fontSize: 30,
    fontFamily: 'Poppins_700Bold',
    color: '#132721',
    lineHeight: 40,
    marginBottom: 12,
  },
  welcomeSubtext: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#66736F',
    lineHeight: 24,
    marginBottom: 36,
  },

  // Step screens
  stepContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 36,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E4E8E5',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: '#064E3B',
  },
  stepDotDone: {
    backgroundColor: '#64B894',
  },
  stepHeading: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#132721',
    marginBottom: 8,
  },
  stepSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#66736F',
    marginBottom: 32,
    lineHeight: 22,
  },

  // Real Name Input
  inputWrapper: {
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E4E8E5',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#132721',
  },
  nameInputFocused: {
    borderColor: '#064E3B',
    borderWidth: 2,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // PIN
  pinWrapper: {
    marginVertical: 8,
  },

  // Buttons
  primaryButton: {
    backgroundColor: '#064E3B',
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.3,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },
  backButtonText: {
    color: '#064E3B',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
