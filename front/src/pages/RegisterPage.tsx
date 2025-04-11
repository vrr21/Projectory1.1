import React from "react";
import { Button, Checkbox, Form, Input, Typography, message } from "antd";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";

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

  const onFinish = async (values: RegisterForm) => {
    try {
      if (values.password !== values.confirmPassword) {
        return message.warning("Пароли не совпадают!");
      }

      await registerUser(values);
      message.success("Регистрация успешна! Вход...");
      setTimeout(() => navigate("/login"), 1000);
    } catch {
      message.error("Ошибка при регистрации");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "100px auto" }}>
      <Title level={2}>Регистрация</Title>
      <Form layout="vertical" onFinish={onFinish}>
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
          rules={[{ required: true, message: "Введите номер телефона!" }]}
        >
          <Input />
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
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterPage;
