import React from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from '../contexts/useAuth';

import "../styles/pages/LoginPage.css";

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      const res = await loginUser(values);
      const user = res.data.user;
      localStorage.setItem("token", res.data.token);
      setUser(user);

      message.success("Успешный вход!");

      setTimeout(() => {
        if (user.role === "Менеджер") {
          navigate("/manager");
        } else {
          navigate("/employee");
        }
      }, 1000);
    } catch {
      message.error("Неверный email или пароль");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-form">
          <Title level={2} style={{ textAlign: "center" }}>Вход</Title>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, message: "Введите email!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, message: "Введите пароль!" }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Войти
              </Button>
            </Form.Item>
            <Form.Item style={{ textAlign: "center" }}>
              Ещё не зарегистрированы? <Link to="/register">Создать аккаунт</Link>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
