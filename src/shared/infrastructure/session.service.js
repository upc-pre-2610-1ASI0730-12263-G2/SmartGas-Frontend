const KEY = 'smartgas_session_v1';

export class SessionService {
  save(user) {
    localStorage.setItem(KEY, JSON.stringify(user));
  }
  getCurrentUser() {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  }
  isLoggedIn() {
    return Boolean(this.getCurrentUser());
  }
  clear() {
    localStorage.removeItem(KEY);
  }
}
