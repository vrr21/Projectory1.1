import React, { useEffect, useState } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { useNavigate, Link, useLocation } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { registerUser } from "../api/auth";
import "../styles/pages/AuthPages.css";
import backgroundImage from "../assets/reg_auth.png";
import logo from "../assets/лого.png";

const { Title } = Typography;

type RegisterForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<RegisterForm>();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (location.state?.fromLogin) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 600);
    }
  }, [location]);

  document.documentElement.setAttribute("data-theme", "dark");

  const onFinish = async (values: RegisterForm) => {
    try {
      const allowedDomains = [
        "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
        "icloud.com", "me.com", "mail.ru", "yandex.ru",
        "yandex.com", "protonmail.com", "zoho.com", "gmx.com"
      ];
      const emailDomain = values.email.split("@")[1];
  
      if (!allowedDomains.includes(emailDomain)) {
        return messageApi.error("Разрешены только адреса: " + allowedDomains.join(", "));
      }
  
      if (values.password !== values.confirmPassword) {
        return messageApi.warning("Пароли не совпадают!");
      }
  
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(values.password)) {
        return messageApi.error(
          "Пароль должен содержать минимум 8 символов, включая хотя бы одну букву и одну цифру"
        );
      }
  
      if (!values.phone || values.phone.length < 10) {
        return messageApi.error("Введите корректный номер телефона!");
      }
  
      await registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone.startsWith("+") ? values.phone : `+${values.phone}`,
        email: values.email,
        password: values.password,
        isManager: false,
      });
  
      messageApi.success("Регистрация успешна! Вход...");
      setTimeout(() => navigate("/login", { state: { fromRegister: true } }), 1000);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const err = error as { response?: { data?: { message?: string } } };
        console.error("Ошибка регистрации:", err.response?.data);
        messageApi.error(err.response?.data?.message || "Ошибка при регистрации");
      } else {
        console.error("Неизвестная ошибка:", error);
        messageApi.error("Неизвестная ошибка при регистрации");
      }
    }
  };
  
  

  return (
    <div className={`auth-container ${isTransitioning ? "transition" : ""}`}>
      {contextHolder}
      <div className="auth-wrapper register">
        <div className="auth-left">
          <div className="auth-text">
            <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img src={logo} alt="Logo" style={{ height: "1.5em", verticalAlign: "middle" }} />
              Projectory
            </h1>
            <p>Присоединяйся к нам<br />Работай над проектами с нами!</p>
          </div>
          <img src={backgroundImage} alt="Auth Illustration" className="auth-image" />
        </div>

        <div className="auth-form">
          <Title level={2}>Регистрация</Title>
          <Form<RegisterForm> form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item label="Имя" name="firstName" rules={[{ required: true, message: "Введите имя!" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Фамилия" name="lastName" rules={[{ required: true, message: "Введите фамилию!" }]}>
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
                enableSearch
                onlyCountries={["ru", "by"]}
                inputProps={{
                  name: "phone",
                  required: true,
                  autoComplete: "off",
                  style: { width: "100%", paddingLeft: "48px" },
                }}
                dropdownStyle={{ backgroundColor: "#f5f5f5", color: "#000", border: "1px solid #ccc", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)" }}
                searchStyle={{ backgroundColor: "#f5f5f5", color: "#000", border: "1px solid #ccc" }}
                buttonStyle={{ backgroundColor: "rgba(255, 255, 255, 0.15)", borderRight: "1px solid #444" }}
              />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Введите email!" },
                { type: "email", message: "Некорректный email!" },
                {
                  validator: (_, value) => {
                    const allowedDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "me.com", "mail.ru", "yandex.ru", "yandex.com", "protonmail.com", "zoho.com", "gmx.com"];
                    if (!value) return Promise.resolve();
                    const emailDomain = value.split("@")[1];
                    return allowedDomains.includes(emailDomain)
                      ? Promise.resolve()
                      : Promise.reject(new Error("Разрешены только адреса: " + allowedDomains.join(", ")));
                  },
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Пароль" name="password" rules={[{ required: true, message: "Введите пароль!" }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item label="Повторите пароль" name="confirmPassword" rules={[{ required: true, message: "Повторите пароль!" }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Зарегистрироваться
              </Button>
            </Form.Item>
            <Form.Item style={{ textAlign: "center" }}>
              Уже есть аккаунт? <Link to="/login" state={{ fromRegister: true }}>Войти</Link>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
