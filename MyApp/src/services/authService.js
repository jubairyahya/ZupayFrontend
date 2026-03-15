import api, { API_URLS } from './api.js';

export const registerUser = async ({ name, username, password }) => {
  const res = await api.post(API_URLS.AUTH.REGISTER, { name, username, password });
  return res.data;
};

export const loginUser = async ({ username, password }) => {
  const res = await api.post(API_URLS.AUTH.LOGIN, { username, password });
  return res.data;
};

export const logoutUser = async () => {
  const res = await api.post(API_URLS.AUTH.LOGOUT);
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get(API_URLS.AUTH.PROFILE);
  return res.data;
};

export const linkBankAccount = async ({ accountHolderName, accountNumber, sortCode }) => {
  const res = await api.post(API_URLS.AUTH.LINK_BANK, { accountHolderName, accountNumber, sortCode });
  return res.data;
};

export const findUser = async (uniqueId) => {
  const res = await api.get(API_URLS.AUTH.FIND_USER(uniqueId));
  return res.data;
};

export const sendMoney = async ({ receiverUniqueId, amount, description }) => {
  const res = await api.post(API_URLS.TRANSACTION.SEND, { receiverUniqueId, amount, description });
  return res.data;
};

export const getTransactionHistory = async () => {
  const res = await api.get(API_URLS.TRANSACTION.HISTORY);
  return res.data;
};