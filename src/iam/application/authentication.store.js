import { AccountService } from '../infrastructure/account.service.js';

const service = new AccountService();

export const authStore = {
  login: (email, password) => service.login(email, password),
  register: (email, password, profileData) => service.register(email, password, profileData)
};
