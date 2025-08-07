// Простой API для GitHub Pages
// Этот файл будет обрабатывать API запросы через GitHub Actions

const API_ENDPOINTS = {
  // Временное решение - используем mock данные
  questions: (userId) => {
    return Promise.resolve([
      {
        user_id: userId,
        username: "test_user",
        message: "Тестовое сообщение",
        created_at: new Date().toISOString(),
        answer: null
      }
    ]);
  },
  
  createInvoice: (data) => {
    // Mock для LAVA API
    return Promise.resolve({
      data: {
        url: "https://lava.top/pay/test_invoice",
        invoiceId: "test_" + Date.now()
      }
    });
  },
  
  uploadFile: (file) => {
    return Promise.resolve({
      file_url: "/uploads/" + file.name
    });
  },
  
  answerQuestion: (userId, answer) => {
    return Promise.resolve({ status: "ok" });
  }
};

// Обработчик API запросов
if (typeof window !== 'undefined') {
  window.handleAPIRequest = async (endpoint, method = 'GET', data = null) => {
    try {
      switch (endpoint) {
        case 'questions':
          const urlParams = new URLSearchParams(window.location.search);
          const userId = urlParams.get('user_id');
          const admin = urlParams.get('admin');
          return await API_ENDPOINTS.questions(userId);
          
        case 'lava/create_invoice':
          return await API_ENDPOINTS.createInvoice(data);
          
        case 'questions/upload':
          return await API_ENDPOINTS.uploadFile(data);
          
        case 'questions/answer':
          return await API_ENDPOINTS.answerQuestion(data.user_id, data.answer);
          
        default:
          throw new Error('Unknown endpoint');
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };
} 