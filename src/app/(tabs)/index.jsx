import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, CheckCircle2, Clock, TrendingUp, TrendingDown, ChevronRight, Settings } from 'lucide-react-native';
import { useAuth } from '@/store/AuthContext';
import { useDb } from '@/lib/DbContext';
import { getDashboardStats, getRecentMembers, getFinanceStatsForMonth } from '@/lib/db';
import { images } from '@/constants/images';

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  emeraldInk: '#064E3B',
  emeraldDark: '#043D2F',
  champagneSoft: '#FFF8EC',
  champagne: '#F8E7C9',
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

function formatAmount(amount) {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function prevMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarCircle({ name, size = 42 }) {
  const initials = getInitials(name);
  const colors = [
    ['#E7F1ED', C.emeraldInk],
    ['#FFF4DC', C.warning],
    ['#E8F6EE', C.success],
    ['#FDECEE', C.danger],
  ];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  const [bg, fg] = colors[idx];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { color: fg, fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

function StatusBadge({ isPaid }) {
  if (isPaid) {
    return (
      <View style={[styles.badge, { backgroundColor: C.successBg }]}>
        <View style={[styles.badgeDot, { backgroundColor: C.success }]} />
        <Text style={[styles.badgeText, { color: C.success }]}>Paid</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: C.dangerBg }]}>
      <View style={[styles.badgeDot, { backgroundColor: C.danger }]} />
      <Text style={[styles.badgeText, { color: C.danger }]}>Unpaid</Text>
    </View>
  );
}

function KpiCard({ icon: Icon, label, value, iconColor, iconBg }) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { adminName } = useAuth();
  const { isDbReady } = useDb();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [recentMembers, setRecentMembers] = useState([]);
  const [trendPercent, setTrendPercent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const firstName = adminName ? adminName.split(' ')[0] : 'Admin';

  const loadData = useCallback(async () => {
    try {
      const [dashStats, recent, prevStats] = await Promise.all([
        getDashboardStats(),
        getRecentMembers(),
        getFinanceStatsForMonth(prevMonthKey()),
      ]);

      setStats(dashStats);
      setRecentMembers(recent);

      // FR-4.5 trend indicator
      if (prevStats.collectedAmount > 0) {
        const diff = dashStats.collectedAmount - prevStats.collectedAmount;
        const pct = Math.round((diff / prevStats.collectedAmount) * 100);
        setTrendPercent(pct);
      } else {
        setTrendPercent(null);
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isDbReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData().catch(console.error);
    }
  }, [isDbReady, loadData]);

  // FR-2.8: refresh on pull
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().catch(console.error);
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.emeraldInk} />
        </View>
      </SafeAreaView>
    );
  }

  const { totalMembers = 0, paidCount = 0, unpaidCount = 0, collectedAmount = 0, dueAmount = 0 } = stats ?? {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.emeraldInk]}
            tintColor={C.emeraldInk}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Left: logo + greeting */}
          <View style={styles.headerLeft}>
            <Image source={images.appIcon} style={styles.headerLogo} resizeMode="contain" />
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.adminName}>{firstName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.7}
          >
            <Settings size={22} color={C.emeraldInk} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* ── Sub-header: month label ── */}
        <Text style={styles.monthLabel}>{currentMonthLabel()}</Text>

        {/* ── FR-2.4 Collected this month — Featured Card ── */}
        <View style={styles.featuredCard}>
          <Text style={styles.featuredCardLabel}>Collected this month</Text>
          <Text style={styles.featuredCardAmount}>{formatAmount(collectedAmount)}</Text>

          {trendPercent !== null && (
            <View style={styles.trendRow}>
              {trendPercent >= 0 ? (
                <TrendingUp size={14} color="#6EE7B7" strokeWidth={2} />
              ) : (
                <TrendingDown size={14} color="#FCA5A5" strokeWidth={2} />
              )}
              <Text style={[styles.trendText, { color: trendPercent >= 0 ? '#6EE7B7' : '#FCA5A5' }]}>
                {trendPercent >= 0 ? '+' : ''}{trendPercent}% from last month
              </Text>
            </View>
          )}

          {/* FR-2.5 Due amount shown within the featured card */}
          <View style={styles.dueRow}>
            <Text style={styles.dueLabel}>Pending dues</Text>
            <Text style={styles.dueAmount}>{formatAmount(dueAmount)}</Text>
          </View>
        </View>

        {/* ── FR-2.1 / FR-2.2 / FR-2.3 — KPI Cards ── */}
        <View style={styles.kpiRow}>
          <KpiCard
            icon={Users}
            label="Total Members"
            value={totalMembers}
            iconColor={C.emeraldInk}
            iconBg="#E7F1ED"
          />
          {/* FR-2.2 */}
          <KpiCard
            icon={CheckCircle2}
            label="Paid"
            value={paidCount}
            iconColor={C.success}
            iconBg={C.successBg}
          />
          {/* FR-2.3 */}
          <KpiCard
            icon={Clock}
            label="Unpaid"
            value={unpaidCount}
            iconColor={C.warning}
            iconBg={C.warningBg}
          />
        </View>

        {/* ── Recent Members ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Members</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/members')} activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentMembers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={32} color={C.secondary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No members yet.</Text>
            <Text style={styles.emptySubtext}>Go to Members to add your first member.</Text>
          </View>
        ) : (
          <View style={styles.memberList}>
            {recentMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberRow}
                onPress={() => router.push(`/(tabs)/members?highlight=${member.id}`)}
                activeOpacity={0.75}
              >
                <AvatarCircle name={member.name} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
                  {member.phone ? (
                    <Text style={styles.memberPhone} numberOfLines={1}>{member.phone}</Text>
                  ) : null}
                </View>
                <StatusBadge isPaid={!!member.is_paid_this_month} />
                <ChevronRight size={16} color={C.secondary} strokeWidth={1.8} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
  },
  adminName: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: C.ink,
    lineHeight: 30,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E7F1ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginBottom: 16,
  },

  // Featured card (FR-2.4)
  featuredCard: {
    backgroundColor: C.emeraldInk,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: C.emeraldInk,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  featuredCardLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  featuredCardAmount: {
    fontSize: 34,
    fontFamily: 'Poppins_700Bold',
    color: C.white,
    marginBottom: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  trendText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dueLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  dueAmount: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FCD34D',
  },

  // KPI Row (FR-2.1, FR-2.2, FR-2.3)
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: C.ink,
    lineHeight: 30,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginTop: 2,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  viewAll: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: C.emeraldInk,
  },

  // Member list
  memberList: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
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

  // Avatar
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
  },

  // Badges
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
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    textAlign: 'center',
  },
});
