import React, { useState } from 'react';
import '../styles/LoginRegisterScreen.css';

interface Props {
  onLogin: () => void;
}

const LoginRegisterScreen: React.FC<Props> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      // Obsługa rejestracji
      console.log('Rejestracja:', formData);
    } else {
      // Obsługa logowania
      console.log('Logowanie:', formData);
    }
    onLogin(); // Przejście do ekranu lobby po zalogowaniu/rejestracji
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-header">
          <img src="/logo.png" alt="Logo" className="logo" />
          <p>2D Shooter</p>
        </div>

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
            <a href="#">Zapomniałem hasła</a>
          </div>
        )}

        <button type="submit" className={isRegister ? 'register-btn' : 'login-btn'}>
          {isRegister ? 'ZAREJESTRUJ SIĘ' : 'ZALOGUJ SIĘ'}
        </button>

        <button type="button" className="toggle-btn" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? '← WRÓĆ DO LOGOWANIA' : 'ZAREJESTRUJ SIĘ'}
        </button>

        <div className="separator"><span>lub</span></div>

        <div className="social-buttons">
          <button className="google-btn">Google</button>
          <button className="steam-btn">Steam</button>
        </div>

        <p className="contact-info">
          Nie masz konta? <a href="#">Skontaktuj się z administratorem</a>
        </p>
      </form>
    </div>
  );
  
};

export default LoginRegisterScreen;
