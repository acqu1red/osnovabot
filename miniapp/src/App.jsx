import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';

// API URL для разработки и продакшена
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://acqu1red.github.io/osnovabot' 
  : 'http://localhost:8000';

// Функция для выполнения API запросов
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}/${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    
    // Fallback для продакшена - используем mock данные
    if (process.env.NODE_ENV === 'production') {
      return await handleMockAPI(endpoint, options);
    }
    
    throw error;
  }
};

// Mock API для продакшена
const handleMockAPI = async (endpoint, options) => {
  const mockData = {
    'questions': [
      {
        user_id: 123456,
        username: "test_user",
        message: "Тестовое сообщение",
        created_at: new Date().toISOString(),
        answer: null
      }
    ],
    'lava/create_invoice': {
      data: {
        url: "https://lava.top/pay/test_invoice",
        invoiceId: "test_" + Date.now()
      }
    }
  };
  
  // Имитируем задержку сети
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return mockData[endpoint] || { status: 'ok' };
};

const screens = {
  main: 'main',
  pay: 'pay',
  confirm: 'confirm',
  chat: 'chat',
  admin: 'admin',
};

function App() {
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState(screens.main);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Получаем данные пользователя из Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
      setUser(tgUser);
      if (tgUser?.language_code) {
        i18n.changeLanguage(tgUser.language_code.slice(0, 2));
      }
    }
  }, [i18n]);

  let content;
  if (typeof screen === 'string') {
    if (screen === screens.main) content = <MainMenu setScreen={setScreen} user={user} t={t} />;
    if (screen === screens.pay) content = <PayScreen setScreen={setScreen} user={user} t={t} />;
    if (screen === screens.chat) content = <ChatScreen setScreen={setScreen} user={user} t={t} />;
    if (screen === screens.admin) content = <AdminPanel setScreen={setScreen} user={user} t={t} />;
  } else if (screen?.name === 'confirm') {
    content = <ConfirmScreen setScreen={setScreen} user={user} t={t} {...screen.props} />;
  }
  return (
    <div style={{ background: '#18191c', minHeight: '100vh', color: '#fff', borderRadius: 16, padding: 24, fontFamily: 'inherit' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <img src="/miniappsava.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 12, marginRight: 12 }} />
        <h2 style={{ margin: 0 }}>CATALYST CLUB</h2>
      </header>
      {content}
    </div>
  );
}

function MainMenu({ setScreen, user, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={() => setScreen('pay')} style={btnStyle}>{t('Оплатить доступ') || 'Оплатить доступ'}</button>
      <button onClick={() => setScreen('chat')} style={btnStyle}>{t('Задать вопрос') || 'Задать вопрос'}</button>
      <a href="/ОФЕРТА.pdf" target="_blank" rel="noopener noreferrer" style={btnStyle}>{t('Договор оферты') || 'Договор оферты'}</a>
      {user && [708907063, 7365307696].includes(user.id) && (
        <button onClick={() => setScreen('admin')} style={btnStyle}>Админ-панель</button>
      )}
    </div>
  );
}

function PayScreen({ setScreen, user, t }) {
  const [tariff, setTariff] = useState('1m');
  const [method, setMethod] = useState('card');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const tariffs = [
    { key: '1m', label: '1 месяц — 1500₽', amount: 1500 },
    { key: '6m', label: '6 месяцев — 8000₽', amount: 8000 },
    { key: '12m', label: '12 месяцев — 10000₽', amount: 10000 },
  ];

  const methods = [
    { key: 'card', label: 'Картой (любая валюта)' },
    { key: 'crypto', label: 'Крипта (только 6/12 мес)' },
    { key: 'stars', label: 'Оплата в звездах Telegram' },
  ];

  // Передаю invoiceUrl, тариф, email, username, method, сумму в ConfirmScreen через setScreen
  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
        setError('Введите корректный email');
        setLoading(false);
        return;
      }
      const selectedTariff = tariffs.find(t => t.key === tariff);
      if (method === 'stars') {
        setScreen({
          name: 'confirm',
          props: {
            invoiceUrl: '',
            tariff: selectedTariff,
            email,
            username: user?.username || '',
            method,
            amount: selectedTariff.amount,
          }
        });
        setLoading(false);
        return;
      }
      // Запрос на backend для создания инвойса LAVA
      const data = await apiRequest('lava/create_invoice', {
        method: 'POST',
        body: JSON.stringify({
          amount: selectedTariff.amount,
          order_id: `${user?.id}_${Date.now()}`,
          email,
          username: user?.username || '',
          tariff,
          method,
        })
      });
      
      if (data?.data?.url) {
        setScreen({
          name: 'confirm',
          props: {
            invoiceUrl: data.data.url,
            tariff: selectedTariff,
            email,
            username: user?.username || '',
            method,
            amount: selectedTariff.amount,
          }
        });
      } else {
        setError('Ошибка создания инвойса');
      }
    } catch (e) {
      setError('Ошибка оплаты');
    }
    setLoading(false);
  };

  return <div>
    <h3>Оплата доступа</h3>
    <div style={{ marginBottom: 12 }}>
      <div>Тариф:</div>
      {tariffs.map(tar => (
        <label key={tar.key} style={{ display: 'block', margin: '6px 0' }}>
          <input type="radio" name="tariff" value={tar.key} checked={tariff === tar.key} onChange={() => setTariff(tar.key)} /> {tar.label}
        </label>
      ))}
    </div>
    <div style={{ marginBottom: 12 }}>
      <div>Способ оплаты:</div>
      {methods.map(m => (
        <label key={m.key} style={{ display: 'block', margin: '6px 0', color: (tariff === '1m' && m.key === 'crypto') ? '#888' : '#fff' }}>
          <input type="radio" name="method" value={m.key} checked={method === m.key} onChange={() => setMethod(m.key)} disabled={tariff === '1m' && m.key === 'crypto'} /> {m.label}
        </label>
      ))}
    </div>
    <div style={{ marginBottom: 12 }}>
      <div>Ваш Telegram Username:</div>
      <input value={user?.username || ''} disabled style={inputStyle} />
    </div>
    <div style={{ marginBottom: 12 }}>
      <div>Email (обязательно):</div>
      <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@email.com" />
    </div>
    {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      <button onClick={() => setScreen('chat')} style={btnStyle}>Задать вопрос</button>
      <a href="/ОФЕРТА.pdf" target="_blank" rel="noopener noreferrer" style={btnStyle}>Договор оферты</a>
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      <button onClick={() => setScreen('main')} style={btnStyle}>Назад</button>
      <button onClick={handlePay} style={btnStyle} disabled={loading}>{loading ? '...' : 'Далее'}</button>
    </div>
  </div>;
}

function ConfirmScreen({ setScreen, user, t, invoiceUrl, tariff, email, username, method, amount }) {
  return <div>
    <h3>Подтверждение</h3>
    <div style={{ marginBottom: 12 }}>
      <b>Тариф:</b> {tariff?.label}<br />
      <b>Сумма:</b> {amount}₽<br />
      <b>Способ оплаты:</b> {method === 'card' ? 'Картой' : method === 'crypto' ? 'Крипта' : 'Telegram Stars'}<br />
      <b>Username:</b> @{username}<br />
      <b>Email:</b> {email}
    </div>
    {method === 'stars' ? (
      <div style={{ margin: '16px 0', color: '#ff0' }}>
        Для оплаты в звёздах: <b>{Math.ceil(amount / 2)}</b> ⭐ (курс 1 звезда ≈ 2₽)<br />
        Переведите звёзды через Telegram и напишите в поддержку.
      </div>
    ) : (
      <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle, display: 'inline-block', marginBottom: 16 }}>Оплатить</a>
    )}
    <div>
      <button onClick={() => setScreen('pay')} style={btnStyle}>Назад</button>
    </div>
  </div>;
}

function ChatScreen({ setScreen, user, t }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    apiRequest(`questions?user_id=${user.id}`)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [user]);

  const sendMessage = async () => {
    if (!input && !file) return;
    setLoading(true);
    setError('');
    let file_url = null;
    if (file) {
      const form = new FormData();
      form.append('file', file);
      try {
        const data = await apiRequest('questions/upload', {
          method: 'POST',
          body: form
        });
        file_url = data.file_url;
      } catch {
        setError('Ошибка загрузки файла');
        setLoading(false);
        return;
      }
    }
    const body = {
      user_id: user.id,
      username: user.username || '',
      message: input,
      file_url,
      email: '',
      is_admin: false,
      created_at: new Date().toISOString(),
    };
    try {
      await apiRequest('questions', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      setInput('');
      setFile(null);
      // Обновить сообщения
      apiRequest(`questions?user_id=${user.id}`)
        .then(setMessages);
    } catch {
      setError('Ошибка отправки');
    }
    setLoading(false);
  };

  return <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
    <h3>Обратная связь</h3>
    <div style={{ flex: 1, overflowY: 'auto', background: '#23272f', borderRadius: 12, padding: 12, marginBottom: 12 }}>
      {messages.length === 0 && <div style={{ color: '#888' }}>Нет сообщений</div>}
      {messages.map((msg, i) => (
        <div key={i} style={{ marginBottom: 12, textAlign: msg.answer ? 'left' : 'right' }}>
          <div style={{ fontSize: 15, color: '#fff' }}>{msg.message}</div>
          {msg.file_url && <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0af' }}>Вложение</a>}
          <div style={{ fontSize: 13, color: '#aaa' }}>{new Date(msg.created_at).toLocaleString()}</div>
          {msg.answer && <div style={{ background: '#1a3', color: '#fff', borderRadius: 8, padding: 8, marginTop: 6 }}>Ответ: {msg.answer}</div>}
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ ...inputStyle, flex: 1 }}
        placeholder="Ваш вопрос..."
        disabled={loading}
      />
      <input type="file" onChange={e => setFile(e.target.files[0])} style={{ color: '#fff' }} disabled={loading} />
      <button onClick={sendMessage} style={btnStyle} disabled={loading || (!input && !file)}>
        {loading ? '...' : 'Отправить'}
      </button>
    </div>
    {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    <button onClick={() => setScreen('main')} style={{ ...btnStyle, marginTop: 16 }}>Назад</button>
  </div>;
}

function AdminPanel({ setScreen, user, t }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('questions?admin=true')
      .then(data => {
        // Собираем уникальных пользователей
        const usersMap = {};
        data.forEach(q => {
          if (!usersMap[q.user_id]) {
            usersMap[q.user_id] = { user_id: q.user_id, username: q.username };
          }
        });
        setUsers(Object.values(usersMap));
      });
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    apiRequest(`questions?user_id=${selectedUser.user_id}&admin=true`)
      .then(setMessages);
  }, [selectedUser]);

  const sendAnswer = async () => {
    if (!answer || !selectedUser) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest('questions/answer', {
        method: 'POST',
        body: JSON.stringify({ user_id: selectedUser.user_id, answer })
      });
      setAnswer('');
      // Обновить сообщения
      apiRequest(`questions?user_id=${selectedUser.user_id}&admin=true`)
        .then(setMessages);
    } catch {
      setError('Ошибка отправки');
    }
    setLoading(false);
  };

  return <div style={{ display: 'flex', height: '70vh', gap: 16 }}>
    <div style={{ width: 220, background: '#23272f', borderRadius: 12, padding: 12, overflowY: 'auto' }}>
      <h4>Пользователи</h4>
      {users.map(u => (
        <div key={u.user_id} style={{ margin: '8px 0', cursor: 'pointer', color: selectedUser?.user_id === u.user_id ? '#0af' : '#fff' }} onClick={() => setSelectedUser(u)}>
          @{u.username || u.user_id}
        </div>
      ))}
    </div>
    <div style={{ flex: 1, background: '#23272f', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column' }}>
      <h4>Диалог</h4>
      {selectedUser ? (
        <>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
            {messages.length === 0 && <div style={{ color: '#888' }}>Нет сообщений</div>}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 12, textAlign: msg.answer ? 'left' : 'right' }}>
                <div style={{ fontSize: 15, color: '#fff' }}>{msg.message}</div>
                {msg.file_url && <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0af' }}>Вложение</a>}
                <div style={{ fontSize: 13, color: '#aaa' }}>{new Date(msg.created_at).toLocaleString()}</div>
                {msg.answer && <div style={{ background: '#1a3', color: '#fff', borderRadius: 8, padding: 8, marginTop: 6 }}>Ответ: {msg.answer}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Ответ пользователю..."
              disabled={loading}
            />
            <button onClick={sendAnswer} style={btnStyle} disabled={loading || !answer}>
              {loading ? '...' : 'Ответить'}
            </button>
          </div>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        </>
      ) : <div style={{ color: '#888' }}>Выберите пользователя</div>}
    </div>
    <button onClick={() => setScreen('main')} style={{ ...btnStyle, height: 40, alignSelf: 'flex-start' }}>Назад</button>
  </div>;
}

const btnStyle = {
  background: '#23272f',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '14px 20px',
  fontSize: 18,
  marginBottom: 4,
  cursor: 'pointer',
  marginTop: 0,
};

const inputStyle = {
  background: '#23272f',
  color: '#fff',
  border: '1px solid #333',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 16,
  width: '100%',
  marginTop: 4,
};

export default App;