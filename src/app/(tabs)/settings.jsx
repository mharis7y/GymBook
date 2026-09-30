import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Lock,
  LogOut,
  User,
  Building2,
  DollarSign,
  Shield,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import {
  getAdminProfile,
  saveAdminProfile,
  getGymName,
  setGymName,
  getMonthlyFee,
  setMonthlyFee,
  updateAdminPin,
} from '@/lib/storage';
import { images } from '@/constants/images';

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  emeraldInk: '#064E3B',
  emeraldDark: '#043D2F',
  emeraldSoft: '#E7F1ED',
  champagneSoft: '#FFF8EC',
  champagne: '#F8E7C9',
  white: '#FFFFFF',
  ink: '#132721',
  secondary: '#66736F',
  border: '#E4E8E5',
  danger: '#C83E4D',
  dangerBg: '#FDECEE',
  success: '#198754',
  successBg: '#E8F6EE',
};

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Settings Row ─────────────────────────────────────────────────────────────
function SettingsRow({ icon: Icon, iconColor = C.emeraldInk, iconBg = C.emeraldSoft, label, value, onPress, destructive = false, showChevron = true }) {
  const labelColor = destructive ? C.danger : C.ink;
  const bg = destructive ? C.dangerBg : C.emeraldSoft;
  const ic = destructive ? C.danger : iconColor;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Icon size={17} color={ic} strokeWidth={2} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      {showChevron ? <ChevronRight size={16} color={C.secondary} strokeWidth={1.8} /> : null}
    </TouchableOpacity>
  );
}

// ─── Inline Edit Card ────────────────────────────────────────────────────────
function EditCard({ label, value, onSave, onCancel, keyboardType = 'default', placeholder = '' }) {
  const [text, setText] = useState(value ?? '');
  return (
    <View style={styles.editCard}>
      <Text style={styles.editCardLabel}>{label}</Text>
      <TextInput
        style={styles.editInput}
        value={text}
        onChangeText={setText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={C.secondary}
        autoFocus
        returnKeyType="done"
        cursorColor={C.emeraldInk}
        selectionColor={C.emeraldInk}
        onSubmitEditing={() => onSave(text)}
      />
      <View style={styles.editActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(text)} activeOpacity={0.85}>
          <Check size={14} color={C.white} strokeWidth={2.5} />
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PIN Change Card ─────────────────────────────────────────────────────────
function PinChangeCard({ onSave, onCancel }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  async function handleSave() {
    if (newPin.length !== 5) {
      Alert.alert('Invalid PIN', 'New PIN must be exactly 5 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'New PIN and confirmation do not match.');
      return;
    }
    onSave(currentPin, newPin);
  }

  return (
    <View style={styles.editCard}>
      <Text style={styles.editCardLabel}>Change PIN</Text>

      <Text style={styles.pinFieldLabel}>Current PIN</Text>
      <TextInput
        style={styles.editInput}
        value={currentPin}
        onChangeText={setCurrentPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={5}
        placeholder="Enter current PIN"
        placeholderTextColor={C.secondary}
        autoFocus
        cursorColor={C.emeraldInk}
        selectionColor={C.emeraldInk}
      />

      <Text style={[styles.pinFieldLabel, { marginTop: 12 }]}>New PIN</Text>
      <TextInput
        style={styles.editInput}
        value={newPin}
        onChangeText={setNewPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={5}
        placeholder="Enter new 5-digit PIN"
        placeholderTextColor={C.secondary}
        cursorColor={C.emeraldInk}
        selectionColor={C.emeraldInk}
      />

      <Text style={[styles.pinFieldLabel, { marginTop: 12 }]}>Confirm New PIN</Text>
      <TextInput
        style={styles.editInput}
        value={confirmPin}
        onChangeText={setConfirmPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={5}
        placeholder="Re-enter new PIN"
        placeholderTextColor={C.secondary}
        cursorColor={C.emeraldInk}
        selectionColor={C.emeraldInk}
      />

      <View style={styles.editActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Check size={14} color={C.white} strokeWidth={2.5} />
          <Text style={styles.saveBtnText}>Update PIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { adminName, logout } = useAuth();
  const router = useRouter();

  // Profile state
  const [gymName, setGymNameState] = useState('Taj Fitness');
  const [defaultFee, setDefaultFeeState] = useState(1000);
  const [loading, setLoading] = useState(true);

  // Which inline editor is open: null | 'name' | 'gym' | 'fee' | 'pin'
  const [editing, setEditing] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      const [gn, fee] = await Promise.all([getGymName(), getMonthlyFee()]);
      setGymNameState(gn);
      setDefaultFeeState(fee);
    } catch (e) {
      console.error('Settings load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSaveAdminName(value) {
    const trimmed = value.trim();
    if (!trimmed) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    await saveAdminProfile(trimmed, null);
    // Reload auth context name via re-auth isn't wired here — just persist
    setEditing(null);
    Alert.alert('Saved', 'Your name has been updated. It will show on next login.');
  }

  async function handleSaveGymName(value) {
    const trimmed = value.trim();
    if (!trimmed) { Alert.alert('Required', 'Gym name cannot be empty.'); return; }
    await setGymName(trimmed);
    setGymNameState(trimmed);
    setEditing(null);
  }

  async function handleSaveFee(value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) { Alert.alert('Invalid', 'Enter a valid fee amount (0 or more).'); return; }
    await setMonthlyFee(num);
    setDefaultFeeState(num);
    setEditing(null);
  }

  async function handleSavePin(currentPinEntered, newPin) {
    const profile = await getAdminProfile();
    if (profile.pin !== currentPinEntered) {
      Alert.alert('Incorrect PIN', 'The current PIN you entered is wrong.');
      return;
    }
    await updateAdminPin(newPin);
    setEditing(null);
    Alert.alert('PIN Updated', 'Your login PIN has been changed successfully.');
  }

  function handleLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? You will need your PIN to log back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.emeraldInk} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <Image source={images.appIcon} style={styles.profileLogo} resizeMode="contain" />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{adminName || 'Admin'}</Text>
            <Text style={styles.profileRole}>Gym Administrator</Text>
            <Text style={styles.profileGym}>{gymName}</Text>
          </View>
        </View>

        {/* ── Profile Section ── */}
        <SectionHeader title="Profile" />
        <View style={styles.card}>
          <SettingsRow
            icon={User}
            label="Admin Name"
            value={adminName || '—'}
            onPress={() => setEditing(editing === 'name' ? null : 'name')}
          />
          {editing === 'name' ? (
            <EditCard
              label="Edit Admin Name"
              value={adminName}
              placeholder="Your full name"
              onSave={handleSaveAdminName}
              onCancel={() => setEditing(null)}
            />
          ) : null}

          <View style={styles.divider} />

          <SettingsRow
            icon={Building2}
            label="Gym Name"
            value={gymName}
            onPress={() => setEditing(editing === 'gym' ? null : 'gym')}
          />
          {editing === 'gym' ? (
            <EditCard
              label="Edit Gym Name"
              value={gymName}
              placeholder="e.g. Taj Fitness"
              onSave={handleSaveGymName}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </View>

        {/* ── App Settings Section ── */}
        <SectionHeader title="App Settings" />
        <View style={styles.card}>
          <SettingsRow
            icon={DollarSign}
            label="Default Monthly Fee"
            value={`Rs. ${defaultFee.toLocaleString('en-PK')}`}
            onPress={() => setEditing(editing === 'fee' ? null : 'fee')}
          />
          {editing === 'fee' ? (
            <EditCard
              label="Default Fee (Rs.)"
              value={String(defaultFee)}
              placeholder="e.g. 1000"
              keyboardType="number-pad"
              onSave={handleSaveFee}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </View>

        {/* ── Security Section ── */}
        <SectionHeader title="Security" />
        <View style={styles.card}>
          <SettingsRow
            icon={Lock}
            label="Change PIN"
            onPress={() => setEditing(editing === 'pin' ? null : 'pin')}
          />
          {editing === 'pin' ? (
            <PinChangeCard
              onSave={handleSavePin}
              onCancel={() => setEditing(null)}
            />
          ) : null}

          <View style={styles.divider} />

          <SettingsRow
            icon={Shield}
            label="App Security"
            value="5-digit PIN protected"
            onPress={null}
            showChevron={false}
          />
        </View>

        {/* ── Account Section ── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingsRow
            icon={LogOut}
            label="Log Out"
            onPress={handleLogout}
            destructive
          />
        </View>

        {/* ── About Section ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Name</Text>
            <Text style={styles.aboutValue}>Taj Fitness</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Storage</Text>
            <Text style={styles.aboutValue}>100% Offline · Local Only</Text>
          </View>
          <View style={styles.divider} />
          <View style={[styles.aboutRow, { alignItems: 'flex-start' }]}>
            <AlertTriangle size={13} color={C.secondary} strokeWidth={1.8} style={{ marginTop: 2 }} />
            <Text style={[styles.aboutValue, { flex: 1, marginLeft: 6, color: C.secondary, fontSize: 12 }]}>
              All data is stored only on this device. Uninstalling the app will permanently delete all members and payment records.
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    marginBottom: 20,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: C.ink,
  },

  // Profile card at top
  profileCard: {
    backgroundColor: C.emeraldInk,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    shadowColor: C.emeraldInk,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10,
  },
  profileLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: C.white,
  },
  profileRole: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  profileGym: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#A7D9C5',
    marginTop: 4,
  },

  // Section header
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Card wrapper
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: C.ink,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 62,
  },

  // Inline edit card
  editCard: {
    backgroundColor: C.champagneSoft,
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 16,
  },
  editCardLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: C.secondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  editInput: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: C.ink,
  },
  pinFieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: C.secondary,
    marginBottom: 6,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    backgroundColor: C.white,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.secondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.emeraldInk,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.white,
  },

  // About rows
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aboutLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
  },
  aboutValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: C.ink,
  },
});
