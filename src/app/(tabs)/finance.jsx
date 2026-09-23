import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Calendar, DollarSign, Clock, CheckCircle2,
} from 'lucide-react-native';
import { useDb } from '@/lib/DbContext';
import {
  getFinanceStatsForMonth,
  getPaymentMonths,
  getTransactionsForMonth,
} from '@/lib/db';

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  emeraldInk: '#064E3B',
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

function formatAmount(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
}

function monthKeyToLabel(monthKey) {
  // "2025-04" → "April 2025"
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}


function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonth(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
  ['#E7F1ED', C.emeraldInk],
  ['#FFF4DC', C.warning],
  ['#E8F6EE', C.success],
  ['#FDECEE', C.danger],
];

function getAvatarColors(name = '') {
  const idx = (name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function AvatarCircle({ name, size = 40 }) {
  const initials = getInitials(name);
  const [bg, fg] = getAvatarColors(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: size * 0.36, color: fg }}>{initials}</Text>
    </View>
  );
}

// ─── History Sheet Modal (FR-4.2, FR-4.3) ────────────────────────────────────

function MonthHistoryModal({ visible, onClose, onSelectMonth }) {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      getPaymentMonths()
        .then((data) => setMonths(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Payment History</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeHistoryBtn} activeOpacity={0.7}>
            <Text style={styles.closeHistoryText}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={C.emeraldInk} />
          </View>
        ) : months.length === 0 ? (
          <View style={styles.centered}>
            <Calendar size={48} color={C.border} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No payment history yet</Text>
            <Text style={styles.emptySubtext}>Mark members as paid to see monthly history here.</Text>
          </View>
        ) : (
          <FlatList
            data={months}
            keyExtractor={(item) => item.month}
            contentContainerStyle={{ padding: 20, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.historyRow}
                onPress={() => { onSelectMonth(item.month); onClose(); }}
                activeOpacity={0.75}
              >
                <View>
                  <Text style={styles.historyMonth}>{monthKeyToLabel(item.month)}</Text>
                  <Text style={styles.historyMeta}>{item.paid_count} member{item.paid_count !== 1 ? 's' : ''} paid</Text>
                </View>
                <Text style={styles.historyAmount}>{formatAmount(item.total_collected)}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Finance Screen ──────────────────────────────────────────────────────

export default function FinanceScreen() {
  const { isDbReady } = useDb();
  const thisMonth = currentMonthKey();

  // FR-4.3: selected month (defaults to current)
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [prevStats, setPrevStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [current, prev, txns] = await Promise.all([
        getFinanceStatsForMonth(selectedMonth),
        getFinanceStatsForMonth(prevMonth(selectedMonth)),
        getTransactionsForMonth(selectedMonth),
      ]);

      setStats(current);
      setPrevStats(prev);
      setTransactions(txns);
    } catch (e) {
      console.error('Finance load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true).catch(console.error);
  }, [loadData]);

  useEffect(() => {
    if (isDbReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData().catch(console.error);
    }
  }, [isDbReady, loadData]);

  // FR-4.5: trend indicator
  const trendPercent = React.useMemo(() => {
    if (!stats || !prevStats || prevStats.collectedAmount === 0) return null;
    const diff = stats.collectedAmount - prevStats.collectedAmount;
    return Math.round((diff / prevStats.collectedAmount) * 100);
  }, [stats, prevStats]);

  const isCurrentMonth = selectedMonth === thisMonth;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.emeraldInk} />
        </View>
      </SafeAreaView>
    );
  }

  const { collectedAmount = 0, dueAmount = 0, paidCount = 0, totalMembers = 0 } = stats ?? {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.champagneSoft }}>
      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.emeraldInk]} tintColor={C.emeraldInk} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finance</Text>
          {/* FR-4.2: History button */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setShowHistory(true)}
            activeOpacity={0.7}
          >
            <Calendar size={16} color={C.emeraldInk} strokeWidth={1.8} />
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* ── FR-4.3: Month selector ── */}
        <View style={styles.monthSelector}>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => setSelectedMonth(prevMonth(selectedMonth))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={C.emeraldInk} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.monthLabel}>{monthKeyToLabel(selectedMonth)}</Text>

          <TouchableOpacity
            style={[styles.monthNavBtn, isCurrentMonth && styles.monthNavBtnDisabled]}
            onPress={() => !isCurrentMonth && setSelectedMonth(nextMonth(selectedMonth))}
            activeOpacity={isCurrentMonth ? 1 : 0.7}
            disabled={isCurrentMonth}
          >
            <ChevronRight size={20} color={isCurrentMonth ? C.border : C.emeraldInk} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── FR-4.1: Total Collected — Featured Card ── */}
        <View style={styles.featuredCard}>
          <Text style={styles.featuredLabel}>Total Collected</Text>
          <Text style={styles.featuredAmount}>{formatAmount(collectedAmount)}</Text>

          {/* FR-4.5: Trend vs prev month */}
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

          <View style={styles.featuredMetaRow}>
            <View style={styles.featuredMetaItem}>
              <CheckCircle2 size={14} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text style={styles.featuredMetaText}>{paidCount} paid</Text>
            </View>
            <View style={styles.featuredMetaDivider} />
            <View style={styles.featuredMetaItem}>
              <Clock size={14} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text style={styles.featuredMetaText}>{totalMembers - paidCount} unpaid</Text>
            </View>
          </View>
        </View>

        {/* ── Summary cards (FR-4.1 total income, FR-4.4 dues) ── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: C.success, borderLeftWidth: 4 }]}>
            <View style={styles.summaryIconWrap}>
              <CheckCircle2 size={18} color={C.success} strokeWidth={2} />
            </View>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryAmount, { color: C.success }]}>{formatAmount(collectedAmount)}</Text>
          </View>

          {/* FR-4.4 */}
          <View style={[styles.summaryCard, { borderLeftColor: C.danger, borderLeftWidth: 4 }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: C.dangerBg }]}>
              <Clock size={18} color={C.danger} strokeWidth={2} />
            </View>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={[styles.summaryAmount, { color: C.danger }]}>{formatAmount(dueAmount)}</Text>
          </View>
        </View>

        {/* ── Recent Transactions (FR-4.2 month detail) ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <Text style={styles.sectionCount}>{transactions.length} payment{transactions.length !== 1 ? 's' : ''}</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <DollarSign size={32} color={C.border} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptySubtext}>
              No payments recorded for {monthKeyToLabel(selectedMonth)}.
            </Text>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((txn, idx) => (
              <View
                key={txn.id}
                style={[
                  styles.transactionRow,
                  idx === transactions.length - 1 && styles.transactionRowLast,
                ]}
              >
                <AvatarCircle name={txn.member_name} size={40} />
                <View style={styles.txnInfo}>
                  <Text style={styles.txnName} numberOfLines={1}>{txn.member_name}</Text>
                  <Text style={styles.txnDate}>{formatDate(txn.paid_on)}</Text>
                </View>
                <Text style={styles.txnAmount}>+ {formatAmount(txn.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* FR-4.2 / FR-4.3: History & month picker modal */}
      <MonthHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectMonth={(month) => setSelectedMonth(month)}
      />
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
    gap: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: C.ink,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.emeraldSoft,
  },
  historyBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: C.emeraldInk,
  },

  // Month selector (FR-4.3)
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
    backgroundColor: C.white,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
    minWidth: 160,
    textAlign: 'center',
  },

  // Featured card (FR-4.1)
  featuredCard: {
    backgroundColor: C.emeraldInk,
    borderRadius: 20,
    padding: 24,
    marginBottom: 14,
    shadowColor: C.emeraldInk,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  featuredLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  featuredAmount: {
    fontSize: 34,
    fontFamily: 'Poppins_700Bold',
    color: C.white,
    marginBottom: 6,
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
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  featuredMetaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  featuredMetaText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
  },
  featuredMetaDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Summary cards (FR-4.1 + FR-4.4)
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },

  // Transactions
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
  },
  transactionList: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  txnInfo: {
    flex: 1,
  },
  txnName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  txnDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.success,
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
  emptyTitle: {
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
    lineHeight: 20,
  },

  // History modal
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  closeHistoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeHistoryText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: C.emeraldInk,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  historyMonth: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: C.ink,
  },
  historyMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: C.secondary,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: C.success,
  },
});
