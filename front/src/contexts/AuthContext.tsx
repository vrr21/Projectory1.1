import { createContext } from 'react';

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: 'Менеджер' | 'Сотрудник';
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});
