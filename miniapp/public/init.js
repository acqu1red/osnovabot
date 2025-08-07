// Инициализация API для GitHub Pages
console.log('Initializing API...');

// Ждем загрузки API
function waitForAPI() {
  return new Promise((resolve) => {
    if (window.api) {
      console.log('API already available');
      resolve();
    } else {
      console.log('Waiting for API...');
      const checkAPI = () => {
        if (window.api) {
          console.log('API loaded successfully');
          resolve();
        } else {
          setTimeout(checkAPI, 100);
        }
      };
      checkAPI();
    }
  });
}

// Инициализируем приложение после загрузки API
waitForAPI().then(() => {
  console.log('API ready, initializing app...');
  
  // Глобальная функция для проверки API
  window.checkAPI = function() {
    return {
      api: !!window.api,
      telegram: !!window.Telegram,
      localStorage: !!window.localStorage
    };
  };
  
  // Глобальная функция для тестирования API
  window.testAPI = async function() {
    if (!window.api) {
      return { error: 'API not available' };
    }
    
    try {
      const testQuestion = {
        user_id: 999999,
        username: 'test_user',
        message: 'Test message from init.js',
        email: 'test@example.com',
        is_admin: false,
        created_at: new Date().toISOString()
      };
      
      const result = await window.api.addQuestion(testQuestion);
      return { success: true, result };
    } catch (error) {
      return { error: error.message };
    }
  };
  
  console.log('App initialization complete');
}); 