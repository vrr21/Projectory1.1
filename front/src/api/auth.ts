// src/api/auth.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

interface RegisterData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  isManager: boolean;
}

export const registerUser = async (data: RegisterData) => {
  const role = data.isManager ? 'Менеджер' : 'Сотрудник'; // <-- важно!
  return axios.post(`${API_URL}/register`, {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    password: data.password,
    role: role, // <-- БД ждёт 'Менеджер' или 'Сотрудник'
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const loginUser = async (data: { email: string; password: string }) => {
  return axios.post(`${API_URL}/login`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
