import { DbProvider } from '@/lib/DbContext';
import { Tabs } from 'expo-router';
import { Home, Users, Wallet, Settings } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMERALD_INK = '#064E3B';
const SECONDARY_TEXT = '#66736F';
const WHITE = '#FFFFFF';
const BORDER = '#E4E8E5';

// The visible tab bar content height (icons + labels + top padding)
const TAB_BAR_CONTENT_HEIGHT = 48;

function TabIcon({ icon: Icon, label, focused }) {
  const color = focused ? EMERALD_INK : SECONDARY_TEXT;
  return (
    <View style={styles.tabItem}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabLayout() {
  // useSafeAreaInsets returns the inset for the system navigation bar:
  //   - Gesture navigation (swipe): bottom ≈ 0–16px
  //   - 3-button navigation bar:    bottom ≈ 48px
  // Adding this to our tab bar height pushes the bar's content up above
  // the reserved system UI area — exactly what Flutter's BottomNavigationBar does.
  const { bottom: bottomInset } = useSafeAreaInsets();

  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottomInset;

  return (
    <DbProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: WHITE,
            borderTopColor: BORDER,
            borderTopWidth: 1,
            // Total height = visible content area + system nav bar inset
            height: tabBarHeight,
            // Push icon+label content up; the remaining space at the bottom
            // is transparent and sits behind the system nav bar
            paddingBottom: bottomInset,
            paddingTop: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={Home} label="Home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: 'Members',
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={Users} label="Members" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Finance',
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={Wallet} label="Finance" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={Settings} label="Settings" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </DbProvider>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    minWidth: 72,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 3,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: EMERALD_INK,
  },
});
