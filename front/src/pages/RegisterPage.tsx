import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Typography,
  message,
} from "antd";
import { useNavigate, Link, useLocation } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { registerUser } from "../api/auth";
import "../styles/pages/AuthPages.css";
import backgroundImage from "../assets/reg_auth.png";
import logo from "../assets/лого.png"; // ← логотип

const { Title } = Typography;

type RegisterForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  isManager: boolean;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<RegisterForm>();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (location.state?.fromLogin) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 600);
    }
  }, [location]);

  const onFinish = async (values: RegisterForm) => {
    try {
      if (values.password !== values.confirmPassword) {
        return message.warning("Пароли не совпадают!");
      }

      if (!values.phone || values.phone.length < 10) {
        return message.error("Введите корректный номер телефона!");
      }

      await registerUser({
        ...values,
        phone: values.phone.startsWith("+") ? values.phone : `+${values.phone}`,
      });

      message.success("Регистрация успешна! Вход...");
      setTimeout(() => navigate("/login", { state: { fromRegister: true } }), 1000);
    } catch {
      message.error("Ошибка при регистрации");
    }
  };

  return (
    <div className={`auth-container ${isTransitioning ? "transition" : ""}`}>
      <div className="auth-wrapper register">
        {/* Левая колонка с изображением и текстом */}
        <div className="auth-left">
          <div className="auth-text">
            <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={logo}
                alt="Logo"
                style={{ height: "1.5em", verticalAlign: "middle" }}
              />
              Projectory
            </h1>
            <p>
              Присоединяйся к нам
              <br />
              Работай над проектами с нами!
            </p>
          </div>
          <img src={backgroundImage} alt="Auth Illustration" className="auth-image" />
        </div>

        {/* Правая колонка — форма регистрации */}
        <div className="auth-form">
          <Title level={2}>Регистрация</Title>
          <Form<RegisterForm> form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Имя"
              name="firstName"
              rules={[{ required: true, message: "Введите имя!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Фамилия"
              name="lastName"
              rules={[{ required: true, message: "Введите фамилию!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Телефон"
              name="phone"
              rules={[
                { required: true, message: "Введите номер телефона!" },
                {
                  validator: (_, value) =>
                    value && value.length >= 10
                      ? Promise.resolve()
                      : Promise.reject(new Error("Некорректный номер телефона")),
                },
              ]}
            >
              <PhoneInput
                country={"by"}
                inputClass="custom-phone-input"
                buttonClass="custom-phone-button"
                containerClass="custom-phone-container"
                enableSearch
                inputProps={{
                  name: "phone",
                  required: true,
                  autoComplete: "off",
                }}
              />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Введите email!" },
                { type: "email", message: "Некорректный email!" },
              ]}
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
            <Form.Item
              label="Повторите пароль"
              name="confirmPassword"
              rules={[{ required: true, message: "Повторите пароль!" }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item name="isManager" valuePropName="checked">
              <Checkbox>Я менеджер</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Зарегистрироваться
              </Button>
            </Form.Item>
            <Form.Item style={{ textAlign: "center" }}>
              Уже есть аккаунт?{" "}
              <Link to="/login" state={{ fromRegister: true }}>
                Войти
              </Link>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
