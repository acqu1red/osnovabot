// JavaScript API для GitHub Pages
// Имитирует backend функционал для работы с данными

class GitHubPagesAPI {
  constructor() {
    this.storageKey = 'catalyst_club_data';
    this.initStorage();
  }

  // Инициализация локального хранилища
  initStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      const initialData = {
        subscriptions: [],
        payments: [],
        questions: [],
        users: {}
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  // Получить данные из localStorage
  getData() {
    return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
  }

  // Сохранить данные в localStorage
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
    data.questions.push(question);
    this.saveData(data);
    
    // Уведомление в Telegram (имитация)
    this.notifyTelegram(question);
    
    return { status: 'ok', id: question.id };
  }

  async answerQuestion(userId, answer) {
    const data = this.getData();
    const question = data.questions.find(q => q.user_id == userId && !q.answer);
    
    if (question) {
      question.answer = answer;
      question.answered_at = new Date().toISOString();
      this.saveData(data);
      
      // Уведомление пользователя (имитация)
      this.notifyUser(userId, answer);
      
      return { status: 'ok' };
    }
    
    return { status: 'error', message: 'Question not found' };
  }

  // API для загрузки файлов
  async uploadFile(file) {
    // Имитация загрузки файла
    const fileName = `file_${Date.now()}_${file.name}`;
    const fileUrl = `/uploads/${fileName}`;
    
    // В реальности здесь была бы загрузка на сервер
    // Для GitHub Pages просто возвращаем URL
    return { file_url: fileUrl };
  }

  // API для LAVA платежей
  async createLavaInvoice(invoiceData) {
    // Имитация создания инвойса LAVA
    const invoiceId = `lava_${Date.now()}`;
    const paymentUrl = `https://lava.top/pay/${invoiceId}`;
    
    // Сохраняем информацию о платеже
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
    
    return {
      data: {
        url: paymentUrl,
        invoiceId: invoiceId
      }
    };
  }

  // Уведомления (имитация)
  notifyTelegram(question) {
    console.log('Telegram notification:', {
      user_id: question.user_id,
      username: question.username,
      message: question.message
    });
  }

  notifyUser(userId, answer) {
    console.log('User notification:', {
      user_id: userId,
      answer: answer
    });
  }

  // Получить пользователя по ID
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

// Экспортируем для использования в других файлах
if (typeof window !== 'undefined') {
  window.GitHubPagesAPI = GitHubPagesAPI;
  window.api = api;
}

// Обработчик для fetch API
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = async (url, options = {}) => {
    // Проверяем, является ли это запросом к нашему API
    if (url.includes('/api/') || url.includes('localhost:8000')) {
      const path = url.split('/').pop().split('?')[0];
      const params = new URLSearchParams(url.split('?')[1] || '');
      
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
            
          default:
            throw new Error(`Unknown endpoint: ${path}`);
        }
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
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