import AsyncStorage from 'expo-sqlite/kv-store';

const ADMIN_NAME_KEY = '@taj_admin_name';
const ADMIN_PIN_KEY = '@taj_admin_pin';
const MONTHLY_FEE_KEY = '@taj_monthly_fee';
const GYM_NAME_KEY = '@taj_gym_name';

const DEFAULT_MONTHLY_FEE = 1000;
const DEFAULT_GYM_NAME = 'Taj Fitness';

export const getAdminProfile = async () => {
  try {
    const name = await AsyncStorage.getItem(ADMIN_NAME_KEY);
    const pin = await AsyncStorage.getItem(ADMIN_PIN_KEY);
    return { name, pin };
  } catch (error) {
    console.error('Error reading admin profile', error);
    return { name: null, pin: null };
  }
};

export const saveAdminProfile = async (name, pin) => {
  try {
    if (name) await AsyncStorage.setItem(ADMIN_NAME_KEY, name);
    if (pin) await AsyncStorage.setItem(ADMIN_PIN_KEY, pin);
  } catch (error) {
    console.error('Error saving admin profile', error);
  }
};

export const updateAdminPin = async (pin) => {
  try {
    await AsyncStorage.setItem(ADMIN_PIN_KEY, pin);
  } catch (error) {
    console.error('Error updating admin pin', error);
  }
};

export const clearAdminProfile = async () => {
  try {
    await AsyncStorage.removeItem(ADMIN_NAME_KEY);
    await AsyncStorage.removeItem(ADMIN_PIN_KEY);
  } catch (error) {
    console.error('Error clearing admin profile', error);
  }
};

export const getMonthlyFee = async () => {
  try {
    const val = await AsyncStorage.getItem(MONTHLY_FEE_KEY);
    return val !== null ? Number(val) : DEFAULT_MONTHLY_FEE;
  } catch (error) {
    console.error('Error reading monthly fee', error);
    return DEFAULT_MONTHLY_FEE;
  }
};

export const setMonthlyFee = async (fee) => {
  try {
    await AsyncStorage.setItem(MONTHLY_FEE_KEY, String(fee));
  } catch (error) {
    console.error('Error saving monthly fee', error);
  }
};

export const getGymName = async () => {
  try {
    const val = await AsyncStorage.getItem(GYM_NAME_KEY);
    return val !== null ? val : DEFAULT_GYM_NAME;
  } catch (error) {
    console.error('Error reading gym name', error);
    return DEFAULT_GYM_NAME;
  }
};

export const setGymName = async (name) => {
  try {
    await AsyncStorage.setItem(GYM_NAME_KEY, name);
  } catch (error) {
    console.error('Error saving gym name', error);
  }
};

