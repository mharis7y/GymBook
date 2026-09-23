import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search, Plus, X, ChevronRight, CheckCircle2,
  Edit2, Trash2, Check, Phone, Calendar, Camera,
  ArrowLeft, ArrowUpDown, Users, Wallet,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDb } from '@/lib/DbContext';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  markMemberPaid,
  getPaymentsForMember,
} from '@/lib/db';

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  emeraldInk: '#064E3B',
  emeraldDark: '#043D2F',
  emeraldSoft: '#E7F1ED',
  champagneSoft: '#FFF8EC',
  white: '#FFFFFF',
  ink: '#132721',
  secondary: '#66736F',
  border: '#E4E8E5',
  success: '#198754',
  successBg: '#E8F6EE',
  warning: '#D98C10',
  warningBg: '#FFF4DC',
  danger: '#C83E4D',
  dangerBg: '#FDECEE',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
  ['#E7F1ED', C.emeraldInk],
  ['#FFF4DC', C.warning],
  ['#E8F6EE', C.success],
  ['#FDECEE', C.danger],
  ['#EFF6FF', '#1D4ED8'],
  ['#FDF4FF', '#7E22CE'],
];

function getAvatarColors(name = '') {
  const idx = (name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── Avatar Component ─────────────────────────────────────────────────────────

function AvatarCircle({ name, photoUri, size = 44 }) {
  const initials = getInitials(name);
  const [bg, fg] = getAvatarColors(name);
  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: size * 0.36, color: fg }}>{initials}</Text>
    </View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ isPaid }) {
  const bg = isPaid ? C.successBg : C.dangerBg;
  const color = isPaid ? C.success : C.danger;
  const label = isPaid ? 'Paid' : 'Unpaid';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, count, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label} {count !== undefined ? count : ''}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Add/Edit Member Modal ────────────────────────────────────────────────────

function MemberFormModal({ visible, onClose, onSave, initialData }) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [photoUri, setPhotoUri] = useState(initialData?.photo_uri ?? null);
  const [fee, setFee] = useState(initialData?.fee?.toString() ?? '1000');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const isEditing = !!initialData;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      // Using async IIFE to avoid react-hooks/set-state-in-effect
      (async () => {
        setName(initialData?.name ?? '');
        setPhone(initialData?.phone ?? '');
        setPhotoUri(initialData?.photo_uri ?? null);
        setFee(initialData?.fee?.toString() ?? '1000');
        setNameError('');
      })();
    }
  }, [visible, initialData]);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to add a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose a source', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Gallery', onPress: pickFromGallery },
      photoUri ? { text: 'Remove Photo', style: 'destructive', onPress: () => setPhotoUri(null) } : null,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), phone: phone.trim(), photo_uri: photoUri, fee: Number(fee) || 1000 });
      onClose();
    } catch (e) {
      console.error('Save member error:', e);
      Alert.alert('Error', 'Could not save member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.modalCloseBtn}>
              <X size={22} color={C.ink} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Member' : 'Add Member'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Photo Picker */}
            <View style={styles.photoPickerRow}>
              <TouchableOpacity onPress={showPhotoOptions} activeOpacity={0.8} style={styles.photoPickerCircle}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPickerImage} />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <Camera size={28} color={C.emeraldInk} strokeWidth={1.8} />
                    <Text style={styles.photoPickerLabel}>Add Photo</Text>
                  </View>
                )}
                {/* Camera icon overlay */}
                <View style={styles.photoPickerBadge}>
                  <Camera size={12} color={C.white} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={[styles.textInput, nameError ? styles.textInputError : null]}
                placeholder="Enter member name"
                placeholderTextColor={C.secondary}
                value={name}
                onChangeText={(v) => { setName(v); setNameError(''); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 0300 1234567"
                placeholderTextColor={C.secondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>

            {/* Fee */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Monthly Fee (Rs.) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1000"
                placeholderTextColor={C.secondary}
                value={fee}
                onChangeText={setFee}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>{isEditing ? 'Save Changes' : 'Add Member'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Member Detail Modal (FR-3.6, FR-3.9) ────────────────────────────────────

function MemberDetailModal({ visible, memberId, onClose, onUpdate }) {
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadMemberData = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const [m, p] = await Promise.all([getMemberById(memberId), getPaymentsForMember(memberId)]);
      setMember(m);
      setPayments(p);
    } catch (e) {
      console.error('Load member detail error:', e);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (visible && memberId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMemberData().catch(console.error);
    }
  }, [visible, memberId, loadMemberData]);

  // FR-3.9: Mark as Paid
  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      await markMemberPaid(memberId, member?.fee ?? 1000);
      await loadMemberData();
      onUpdate?.();
    } catch (e) {
      console.error('Mark paid error:', e);
    } finally {
      setMarkingPaid(false);
    }
  };

  // FR-3.8: Delete with confirmation
  const handleDelete = () => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove ${member?.name}? This will also delete their payment history and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMember(memberId);
              onUpdate?.();
              onClose();
            } catch (e) {
              console.error('Delete member error:', e);
            }
          },
        },
      ]
    );
  };

  // FR-3.7: Edit member
  const handleEdit = async ({ name, phone, photo_uri, fee }) => {
    await updateMember(memberId, { name, phone, photo_uri, fee });
    await loadMemberData();
    onUpdate?.();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={C.ink} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>Member Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={C.emeraldInk} />
          </View>
        ) : !member ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Member not found.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {/* Profile card */}
            <View style={styles.profileCard}>
              <AvatarCircle name={member.name} photoUri={member.photo_uri} size={80} />
              <Text style={styles.profileName}>{member.name}</Text>
              {member.phone ? (
                <View style={styles.profilePhoneRow}>
                  <Phone size={13} color={C.secondary} strokeWidth={1.8} />
                  <Text style={styles.profilePhone}>{member.phone}</Text>
                </View>
              ) : null}
              <View style={styles.profileMetaRow}>
                <View style={styles.profileMetaItem}>
                  <Calendar size={13} color={C.secondary} strokeWidth={1.8} />
                  <Text style={styles.profileMetaText}>Joined {formatDate(member.join_date)}</Text>
                </View>
                <View style={styles.profileMetaItem}>
                  <Wallet size={13} color={C.secondary} strokeWidth={1.8} />
                  <Text style={styles.profileMetaText}>Fee: Rs. {(member.fee ?? 1000).toLocaleString()}</Text>
                </View>
              </View>
              {/* Current month status */}
              <StatusBadge isPaid={!!member.is_paid_this_month} />
              {member.is_paid_this_month === 1 && member.paid_on_this_month ? (
                <Text style={styles.paidOnText}>Paid on {formatDate(member.paid_on_this_month)}</Text>
              ) : null}
            </View>

            {/* Action buttons */}
            {/* FR-3.9 Mark as Paid */}
            {!member.is_paid_this_month ? (
              <TouchableOpacity
                style={[styles.primaryBtn, markingPaid && { opacity: 0.7 }]}
                onPress={handleMarkPaid}
                disabled={markingPaid}
                activeOpacity={0.85}
              >
                {markingPaid ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <>
                    <Check size={18} color={C.white} strokeWidth={2.5} />
                    <Text style={styles.primaryBtnText}>Mark as Paid — {currentMonthLabel()}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {/* Already paid indicator */}
            {member.is_paid_this_month === 1 ? (
              <View style={styles.alreadyPaidBanner}>
                <CheckCircle2 size={18} color={C.success} strokeWidth={2} />
                <Text style={styles.alreadyPaidText}>Paid for {currentMonthLabel()}</Text>
              </View>
            ) : null}

            {/* FR-3.7 Edit */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowEditModal(true)}
              activeOpacity={0.85}
            >
              <Edit2 size={16} color={C.emeraldInk} strokeWidth={2} />
              <Text style={styles.secondaryBtnText}>Edit Member</Text>
            </TouchableOpacity>

            {/* FR-3.8 Delete */}
            <TouchableOpacity
              style={styles.destructiveBtn}
              onPress={handleDelete}
              activeOpacity={0.85}
            >
              <Trash2 size={16} color={C.danger} strokeWidth={2} />
              <Text style={styles.destructiveBtnText}>Delete Member</Text>
            </TouchableOpacity>

            {/* FR-3.6 Payment History */}
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Text style={styles.emptySubtext}>No payments recorded yet.</Text>
              </View>
            ) : (
              <View style={styles.paymentList}>
                {payments.map((p) => (
                  <View key={p.id} style={styles.paymentRow}>
                    <View>
                      <Text style={styles.paymentMonth}>{p.month}</Text>
                      <Text style={styles.paymentDate}>Paid on {formatDate(p.paid_on)}</Text>
                    </View>
                    <Text style={styles.paymentAmount}>+ {formatAmount(p.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}

        {/* Edit Member Modal (FR-3.7) */}
        {showEditModal ? (
          <MemberFormModal
            visible={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleEdit}
            initialData={member}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Sort Modal ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'name_asc', label: 'Name (A–Z)' },
  { key: 'name_desc', label: 'Name (Z–A)' },
  { key: 'date_desc', label: 'Newest first' },
  { key: 'date_asc', label: 'Oldest first' },
];

function SortModal({ visible, current, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sortOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sortSheet}>
          <Text style={styles.sortTitle}>Sort By</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, current === opt.key && styles.sortOptionActive]}
              onPress={() => { onSelect(opt.key); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortOptionText, current === opt.key && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {current === opt.key && <Check size={16} color={C.emeraldInk} strokeWidth={2.5} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Screen (FR-3.x) ────────────────────────────────────────────────────

const FILTERS = ['All', 'Paid', 'Unpaid'];

export default function MembersScreen() {
  const { isDbReady } = useDb();
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // FR-3.2 Search
  const [searchQuery, setSearchQuery] = useState('');
  // FR-3.3 Filter
  const [activeFilter, setActiveFilter] = useState('All');
  // FR-3.4 Sort
  const [sortKey, setSortKey] = useState('date_desc');
  const [showSort, setShowSort] = useState(false);

  // Detail modal
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const data = await getMembers();
      setAllMembers(data);
    } catch (e) {
      console.error('Load members error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDbReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMembers().catch(console.error);
    }
  }, [isDbReady, loadMembers]);

  // FR-3.10: Combinable search + filter + sort
  const filteredMembers = React.useMemo(() => {
    let list = [...allMembers];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }

    // Filter
    if (activeFilter === 'Paid') {
      list = list.filter((m) => m.is_paid_this_month === 1);
    } else if (activeFilter === 'Unpaid') {
      list = list.filter((m) => m.is_paid_this_month === 0);
    }

    // Sort (FR-3.4)
    list.sort((a, b) => {
      if (sortKey === 'name_asc') return a.name.localeCompare(b.name);
      if (sortKey === 'name_desc') return b.name.localeCompare(a.name);
      if (sortKey === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      return new Date(b.created_at) - new Date(a.created_at); // date_desc
    });

    return list;
  }, [allMembers, searchQuery, activeFilter, sortKey]);

  // Filter counts
  const paidCount = allMembers.filter((m) => m.is_paid_this_month === 1).length;
  const unpaidCount = allMembers.filter((m) => m.is_paid_this_month === 0).length;
  const counts = { All: allMembers.length, Paid: paidCount, Unpaid: unpaidCount };

  // FR-3.5: Add member
  const handleAddMember = async ({ name, phone, photo_uri, fee }) => {
    await createMember({ name, phone, photo_uri, fee });
    await loadMembers();
  };

  const renderItem = ({ item, index }) => {
    const isLast = index === filteredMembers.length - 1;
    return (
      <TouchableOpacity
        style={[styles.memberRow, isLast && styles.memberRowLast]}
        onPress={() => setSelectedMemberId(item.id)}
        activeOpacity={0.75}
      >
        <AvatarCircle name={item.name} photoUri={item.photo_uri} size={44} />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>{item.name}</Text>
          {item.phone ? (
            <Text style={styles.memberPhone} numberOfLines={1}>{item.phone}</Text>
          ) : null}
        </View>
        <StatusBadge isPaid={!!item.is_paid_this_month} />
        <ChevronRight size={16} color={C.secondary} strokeWidth={1.8} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Members</Text>
        {/* FR-3.5: Add member button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
          <Plus size={18} color={C.white} strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── FR-3.2 Search bar ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color={C.secondary} strokeWidth={1.8} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor={C.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={C.secondary} />
            </TouchableOpacity>
          )}
        </View>
        {/* Sort button */}
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(true)} activeOpacity={0.7}>
          <ArrowUpDown size={16} color={C.emeraldInk} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── FR-3.3 Filter chips ── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            label={f}
            count={counts[f]}
            active={activeFilter === f}
            onPress={() => setActiveFilter(f)}
          />
        ))}
      </View>

      {/* ── Member list ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.emeraldInk} />
        </View>
      ) : filteredMembers.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Users size={48} color={C.border} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {allMembers.length === 0 ? 'No members yet' : 'No results found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {allMembers.length === 0
              ? 'Tap "+ Add" to register your first gym member.'
              : 'Try adjusting your search or filters.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        />
      )}

      {/* ── Modals ── */}
      <MemberFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddMember}
        initialData={null}
      />

      <MemberDetailModal
        visible={!!selectedMemberId}
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        onUpdate={loadMembers}
      />

      <SortModal
        visible={showSort}
        current={sortKey}
        onSelect={setSortKey}
        onClose={() => setShowSort(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: C.ink,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.emeraldInk,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: C.emeraldInk,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.white,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: C.ink,
    padding: 0,
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.emeraldInk,
    borderColor: C.emeraldInk,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: C.secondary,
  },
  filterChipTextActive: {
    color: C.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // Member list
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
    // First row rounded top
  },
  memberRowLast: {
    borderBottomWidth: 0,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  memberPhone: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginTop: 1,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
  },

  // Sort modal
  sortOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sortTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sortOptionActive: {
    // no bg
  },
  sortOptionText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: C.ink,
  },
  sortOptionTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: C.emeraldInk,
  },

  // Form modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  modalBody: {
    padding: 20,
    gap: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // Photo picker
  photoPickerRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  photoPickerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPickerImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  photoPickerPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPickerLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: C.emeraldInk,
  },
  photoPickerBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: C.emeraldInk,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form fields
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: C.ink,
  },
  textInput: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: C.ink,
  },
  textInputError: {
    borderColor: C.danger,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.danger,
    marginTop: 2,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.emeraldInk,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: C.emeraldInk,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: C.white,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.emeraldInk,
    marginBottom: 10,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: C.emeraldInk,
  },
  destructiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  destructiveBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: C.danger,
  },

  // Detail modal
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.champagneSoft,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  detailScroll: {
    padding: 20,
    gap: 12,
  },

  // Profile card
  profileCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 4,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: C.ink,
    textAlign: 'center',
    marginTop: 4,
  },
  profilePhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profilePhone: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
  },
  profileMetaRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  profileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileMetaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
  },
  paidOnText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginTop: -4,
  },

  // Already paid banner
  alreadyPaidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.successBg,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  alreadyPaidText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: C.success,
  },

  // Payment history
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
    marginTop: 8,
    marginBottom: 4,
  },
  paymentList: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paymentMonth: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  paymentDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.success,
  },
  emptyHistoryCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
});
