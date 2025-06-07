import React, { useEffect, useState } from "react";
import { Button, Form, Input, Typography } from "antd";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from "../contexts/useAuth";
import { App } from "antd";
import "../styles/pages/AuthPages.css";
import backgroundImage from "../assets/reg_auth.png";
import logoLight from "../assets/лого2.png";

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const { message } = App.useApp();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logoLight);

  useEffect(() => {
    // Всегда используем logoLight, так как тема всегда светлая
    setCurrentLogo(logoLight);
  }, []);

  useEffect(() => {
    if (location.state?.fromRegister) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300); // Сокращено до 300 мс для согласованности
    }
  }, [location]);

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
    <div className={`auth-container ${isTransitioning ? "transition" : ""}`} data-theme="light">
      <div className="auth-wrapper login">
        {/* Левая колонка — форма авторизации */}
        <div className="auth-form">
          <Title level={2}>Вход</Title>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, message: "Введите email!" }]}
            >
              <Input aria-label="Email" />
            </Form.Item>
            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, message: "Введите пароль!" }]}
            >
              <Input.Password aria-label="Пароль" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                aria-label="Войти"
              >
                Войти
              </Button>
            </Form.Item>
            <Form.Item>
  <span className="secondary-text">
    Ещё не зарегистрированы? <Link to="/register" state={{ fromLogin: true }}>Создать аккаунт</Link>
  </span>
</Form.Item>

          </Form>
        </div>

        {/* Правая колонка — изображение и текст */}
        <div className="auth-left">
          <div className="auth-text">
            <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={currentLogo}
                alt="Logo"
                style={{ height: "1.5em", verticalAlign: "middle" }}
              />
              Projectory
            </h1>
            <p>
              Добро пожаловать
              <br />
              Работай над проектами с нами!
            </p>
          </div>
          <img
            src={backgroundImage}
            alt="Auth Illustration"
            className="auth-image"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;