// GitHub Pages API - Полноценный backend для miniapp
// Работает через localStorage и имитирует все функции backend

class GitHubPagesAPI {
  constructor() {
    this.storageKey = 'catalyst_club_data';
    this.initStorage();
  }

  // Инициализация данных
  initStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      const initialData = {
        subscriptions: [],
        payments: [],
        questions: [],
        users: {},
        settings: {
          tariffs: [
            { key: '1m', label: '1 месяц — 1500₽', amount: 1500 },
            { key: '6m', label: '6 месяцев — 8000₽', amount: 8000 },
            { key: '12m', label: '12 месяцев — 10000₽', amount: 10000 }
          ]
        }
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  // Получить данные
  getData() {
    return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
  }

  // Сохранить данные
  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // API для подписок
  async getSubscriptions() {
    const data = this.getData();
    return data.subscriptions || [];
  }

  async addSubscription(subscription) {
    const data = this.getData();
    subscription.id = Date.now().toString();
    subscription.created_at = new Date().toISOString();
    subscription.status = 'active';
    data.subscriptions.push(subscription);
    this.saveData(data);
    return { status: 'ok', id: subscription.id };
  }

  // API для платежей
  async getPayments() {
    const data = this.getData();
    return data.payments || [];
  }

  async addPayment(payment) {
    const data = this.getData();
    payment.id = Date.now().toString();
    payment.created_at = new Date().toISOString();
    payment.status = 'pending';
    data.payments.push(payment);
    this.saveData(data);
    return { status: 'ok', id: payment.id };
  }

  // API для вопросов
  async getQuestions(userId = null, admin = false) {
    const data = this.getData();
    let questions = data.questions || [];
    
    if (userId) {
      questions = questions.filter(q => q.user_id == userId);
    }
    
    if (!admin) {
      questions = questions.filter(q => !q.is_admin);
    }
    
    return questions;
  }

  async addQuestion(question) {
    const data = this.getData();
    question.id = Date.now().toString();
    question.created_at = new Date().toISOString();
    question.answer = null;
    question.is_admin = false;
    data.questions.push(question);
    this.saveData(data);
    
    console.log('Новый вопрос:', question);
    
    return { status: 'ok', id: question.id };
  }

  async answerQuestion(userId, answer) {
    const data = this.getData();
    const question = data.questions.find(q => q.user_id == userId && !q.answer);
    
    if (question) {
      question.answer = answer;
      question.answered_at = new Date().toISOString();
      this.saveData(data);
      
      console.log('Ответ на вопрос:', { userId, answer });
      
      return { status: 'ok' };
    }
    
    return { status: 'error', message: 'Question not found' };
  }

  // API для загрузки файлов
  async uploadFile(file) {
    const fileName = `file_${Date.now()}_${file.name}`;
    const fileUrl = `/uploads/${fileName}`;
    
    console.log('Файл загружен:', fileName);
    
    return { file_url: fileUrl };
  }

  // API для LAVA платежей
  async createLavaInvoice(invoiceData) {
    const invoiceId = `lava_${Date.now()}`;
    const paymentUrl = `https://lava.top/pay/${invoiceId}`;
    
    const payment = {
      id: invoiceId,
      user_id: invoiceData.user_id || 0,
      username: invoiceData.username || '',
      email: invoiceData.email || '',
      tariff: invoiceData.tariff || '',
      amount: invoiceData.amount || 0,
      method: invoiceData.method || 'card',
      status: 'pending',
      created_at: new Date().toISOString(),
      payment_url: paymentUrl
    };
    
    await this.addPayment(payment);
    
    console.log('Создан инвойс LAVA:', payment);
    
    return {
      data: {
        url: paymentUrl,
        invoiceId: invoiceId
      }
    };
  }

  // Получить настройки
  async getSettings() {
    const data = this.getData();
    return data.settings || {};
  }

  // Получить пользователя
  async getUser(userId) {
    const data = this.getData();
    return data.users[userId] || null;
  }

  // Сохранить пользователя
  async saveUser(user) {
    const data = this.getData();
    data.users[user.id] = user;
    this.saveData(data);
    return { status: 'ok' };
  }
}

// Создаем глобальный экземпляр API
const api = new GitHubPagesAPI();

// Экспортируем для использования
if (typeof window !== 'undefined') {
  window.GitHubPagesAPI = GitHubPagesAPI;
  window.api = api;
}

// Перехватываем fetch запросы для обработки API
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = async (url, options = {}) => {
    // Проверяем, является ли это запросом к нашему API
    if (url.includes('/api/') || url.includes('localhost:8000') || url.includes('acqu1red.github.io')) {
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/').pop() || urlObj.pathname.split('/').slice(-2).join('/');
      const params = urlObj.searchParams;
      
      console.log('API Request:', { url, path, method: options.method });
      
      try {
        let result;
        
        switch (path) {
          case 'subscriptions':
            if (options.method === 'POST') {
              const body = JSON.parse(options.body);
              result = await api.addSubscription(body);
            } else {
              result = await api.getSubscriptions();
            }
            break;
            
          case 'payments':
            if (options.method === 'POST') {
              const body = JSON.parse(options.body);
              result = await api.addPayment(body);
            } else {
              result = await api.getPayments();
            }
            break;
            
          case 'questions':
            if (options.method === 'POST') {
              const body = JSON.parse(options.body);
              result = await api.addQuestion(body);
            } else {
              const userId = params.get('user_id');
              const admin = params.get('admin') === 'true';
              result = await api.getQuestions(userId, admin);
            }
            break;
            
          case 'questions/answer':
            if (options.method === 'POST') {
              const body = JSON.parse(options.body);
              result = await api.answerQuestion(body.user_id, body.answer);
            }
            break;
            
          case 'questions/upload':
            if (options.method === 'POST') {
              const formData = options.body;
              const file = formData.get('file');
              result = await api.uploadFile(file);
            }
            break;
            
          case 'lava/create_invoice':
            if (options.method === 'POST') {
              const body = JSON.parse(options.body);
              result = await api.createLavaInvoice(body);
            }
            break;
            
          case 'settings':
            result = await api.getSettings();
            break;
            
          default:
            // Если путь не найден, пробуем обработать как обычный запрос
            return originalFetch(url, options);
        }
        
        console.log('API Response:', result);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Для других URL используем оригинальный fetch
    return originalFetch(url, options);
  };
}

// Добавляем обработчик для прямых вызовов API
if (typeof window !== 'undefined') {
  window.handleAPIRequest = async (endpoint, method = 'GET', data = null) => {
    const url = `https://acqu1red.github.io/osnovabot/${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  };
} 