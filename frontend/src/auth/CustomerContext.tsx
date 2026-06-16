import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getMe,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  updateProfile,
  type Customer,
  type ProfilePatch,
  type RegisterPayload,
} from '../lib/api';

type CustomerContextValue = {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Customer>;
  register: (payload: RegisterPayload) => Promise<Customer>;
  logout: () => Promise<void>;
  saveProfile: (patch: ProfilePatch) => Promise<Customer>;
  refresh: () => Promise<void>;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCustomer(await getMe());
    } catch {
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMe()
      .then((c) => active && setCustomer(c))
      .catch(() => active && setCustomer(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const c = await loginCustomer(email, password);
    setCustomer(c);
    return c;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const c = await registerCustomer(payload);
    setCustomer(c);
    return c;
  }, []);

  const logout = useCallback(async () => {
    await logoutCustomer();
    setCustomer(null);
  }, []);

  const saveProfile = useCallback(async (patch: ProfilePatch) => {
    const c = await updateProfile(patch);
    setCustomer(c);
    return c;
  }, []);

  return (
    <CustomerContext.Provider
      value={{ customer, loading, login, register, logout, saveProfile, refresh }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer(): CustomerContextValue {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider');
  return ctx;
}
