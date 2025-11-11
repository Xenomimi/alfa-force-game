import React, { useState } from 'react';
import './css/LoginRegisterScreen.css';

interface Props {
  onLogin: () => void;
}

const API_URL = "http://localhost:4000/auth";

const LoginRegisterScreen: React.FC<Props> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    rememberMe: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (formData.password !== formData.confirmPassword) {
          setError("Hasła nie są takie same!");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            username: formData.nickname,
            password: formData.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Nie udało się utworzyć konta");

        alert("Konto utworzone! Możesz się zalogować.");
        setIsRegister(false);
      } else {
        const res = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Błąd logowania");

        if (data.success) {
          onLogin();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-header">
          <img src="/logo.png" alt="Logo" className="logo" />
          <p>2D Shooter</p>
        </div>

        {error && <p className="error-message">{error}</p>}

        {isRegister && (
          <input
            type="text"
            name="nickname"
            placeholder="Wprowadź swój nick"
            value={formData.nickname}
            onChange={handleChange}
            required
          />
        )}

        <input
          type="email"
          name="email"
          placeholder="Wprowadź swój email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Wprowadź hasło"
          value={formData.password}
          onChange={handleChange}
          required
        />

        {isRegister && (
          <input
            type="password"
            name="confirmPassword"
            placeholder="Powtórz hasło"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        )}

        {!isRegister && (
          <div className="auth-options">
            <label>
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              Zapamiętaj mnie
            </label>
          </div>
        )}

        <button
          type="submit"
          className={isRegister ? 'register-btn' : 'login-btn'}
          disabled={loading}
        >
          {loading
            ? "Czekaj..."
            : isRegister
              ? 'ZAREJESTRUJ SIĘ'
              : 'ZALOGUJ SIĘ'}
        </button>

        <button
          type="button"
          className="toggle-btn"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? '← WRÓĆ DO LOGOWANIA' : 'ZAREJESTRUJ SIĘ'}
        </button>
      </form>
    </div>
  );
};

export default LoginRegisterScreen;
