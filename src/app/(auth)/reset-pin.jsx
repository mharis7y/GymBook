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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import PinInput from '@/components/PinInput';

export default function ResetPinScreen() {
  const { resetPin } = useAuth();
  const router = useRouter();

  // step: 'verify' | 'newPin' | 'confirmPin'
  const [step, setStep] = useState('verify');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isAnswerFocused, setIsAnswerFocused] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const newPinRef = useRef(null);
  const confirmPinRef = useRef(null);

  function handleCheckAnswer() {
    if (securityAnswer.trim().toLowerCase() === 'mharis7y') {
      setStep('newPin');
    } else {
      Alert.alert('Incorrect', 'The security answer is not correct.');
    }
  }

  function handleNewPinComplete(digits) {
    setTimeout(() => setStep('confirmPin'), 150);
  }

  async function handleConfirmPinComplete(digits) {
    if (digits !== newPin) {
      setPinError(true);
      setTimeout(() => {
        setConfirmPin('');
        setPinError(false);
        confirmPinRef.current?.focus();
      }, 800);
    } else {
      await resetPin(digits);
      Alert.alert('PIN Updated', 'Your PIN has been reset successfully.', [
        { text: 'Login', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  }

  // ── 1. VERIFY IDENTITY ───────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>Reset PIN</Text>
            <Text style={styles.subtext}>Enter the developer name to verify your identity.</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Security Answer</Text>
              <TextInput
                style={[
                  styles.textInput,
                  isAnswerFocused && styles.textInputFocused,
                ]}
                placeholder="Developer name"
                placeholderTextColor="#66736F"
                value={securityAnswer}
                onChangeText={setSecurityAnswer}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                cursorColor="#064E3B"
                selectionColor="#064E3B"
                onFocus={() => setIsAnswerFocused(true)}
                onBlur={() => setIsAnswerFocused(false)}
                onSubmitEditing={handleCheckAnswer}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCheckAnswer}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Verify Identity</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── 2. ENTER NEW PIN ─────────────────────────────────────────────────────
  if (step === 'newPin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <Text style={styles.heading}>New PIN</Text>
            <Text style={styles.subtext}>Enter your new 5-digit PIN.</Text>

            <View style={styles.pinWrapper}>
              <PinInput
                ref={newPinRef}
                value={newPin}
                onChange={setNewPin}
                onComplete={handleNewPinComplete}
                autoFocus
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── 3. CONFIRM NEW PIN ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.heading}>Confirm PIN</Text>
          <Text style={[styles.subtext, pinError && { color: '#C83E4D' }]}>
            {pinError ? "PINs don't match — try again." : 'Re-enter your new PIN to confirm.'}
          </Text>

          <View style={styles.pinWrapper}>
            <PinInput
              ref={confirmPinRef}
              value={confirmPin}
              onChange={(digits) => {
                setConfirmPin(digits);
                if (pinError) setPinError(false);
              }}
              onComplete={handleConfirmPinComplete}
              hasError={pinError}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setConfirmPin('');
              setPinError(false);
              setStep('newPin');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← Change PIN</Text>
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
    justifyContent: 'center',
    paddingBottom: 40,
  },
  backRow: {
    position: 'absolute',
    top: 20,
    left: 28,
  },
  heading: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#132721',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#66736F',
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#132721',
    marginBottom: 8,
  },
  inputWrapper: {
    marginBottom: 28,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E4E8E5',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#132721',
  },
  textInputFocused: {
    borderColor: '#064E3B',
    borderWidth: 2,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  pinWrapper: {
    marginVertical: 16,
  },
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
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
    padding: 8,
  },
  backText: {
    color: '#064E3B',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
