import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';

// ─── Blinking Cursor Indicator ────────────────────────────────────────────────
function BlinkingCursor() {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.cursor, { opacity }]} />;
}

// ─── PinInput Component ───────────────────────────────────────────────────────
const PinInput = forwardRef(function PinInput(
  {
    value = '',
    onChange,
    onComplete,
    length = 5,
    hasError = false,
    autoFocus = true,
    onFocusChange,
  },
  ref
) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Expose imperative methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.blur();
      setTimeout(() => inputRef.current?.focus(), 60);
    },
    blur: () => {
      inputRef.current?.blur();
      setIsFocused(false);
    },
    clear: () => {
      onChange('');
    },
  }));

  // Auto-focus on mount if enabled
  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  // Sync keyboard visibility and handle Android back button dismissal
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsFocused(true);
      onFocusChange?.(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsFocused(false);
      onFocusChange?.(false);
      // Explicitly blur the input so React Native resets its native focus state
      inputRef.current?.blur();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [onFocusChange]);

  // Reliable focus handler for user taps
  const handleBoxPress = (index) => {
    // If tapping an already-filled box, slice the PIN so user can re-type from that digit
    if (typeof index === 'number' && index < value.length) {
      onChange(value.slice(0, index));
    }

    // Force blur then focus so Android system numpad pops up reliably
    if (inputRef.current) {
      inputRef.current.blur();
      setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
        onFocusChange?.(true);
      }, 60);
    }
  };

  const handleTextChange = (text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length && onComplete) {
      onComplete(digits);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* 5 Visual PIN Boxes */}
      <View style={styles.boxRow}>
        {Array.from({ length }).map((_, i) => {
          const isFilled = i < value.length;
          // Active box is the current insertion point when focused
          const isActive = isFocused && i === value.length && !hasError;

          return (
            <TouchableOpacity
              key={i}
              onPress={() => handleBoxPress(i)}
              activeOpacity={0.8}
              style={[
                styles.box,
                isFilled && styles.boxFilled,
                isActive && styles.boxActive,
                hasError && styles.boxError,
              ]}
            >
              {isFilled ? (
                <View style={[styles.dot, hasError && styles.dotError]} />
              ) : isActive ? (
                <BlinkingCursor />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hidden real TextInput capturing keystrokes */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={length}
        secureTextEntry
        caretHidden
        onFocus={() => {
          setIsFocused(true);
          onFocusChange?.(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          onFocusChange?.(false);
        }}
      />
    </View>
  );
});

export default PinInput;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  box: {
    width: 52,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4E8E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: '#064E3B',
    backgroundColor: '#F0F7F4',
  },
  boxActive: {
    borderColor: '#064E3B',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  boxError: {
    borderColor: '#C83E4D',
    backgroundColor: '#FDECEE',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#064E3B',
  },
  dotError: {
    backgroundColor: '#C83E4D',
  },
  cursor: {
    width: 2.5,
    height: 24,
    borderRadius: 1.5,
    backgroundColor: '#064E3B',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
