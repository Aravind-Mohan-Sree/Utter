import { API_ROUTES } from '~constants/routes';
import axios from '~utils/axiosConfig';

export const getAccountDetails = async (userType: string, email?: string) => {
  try {
    const res = await axios.get(
      userType === 'user'
        ? `${API_ROUTES.USER.GET_ACCOUNT_DETAILS}`
        : `${API_ROUTES.TUTOR.GET_ACCOUNT_DETAILS}`,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};

export const uploadAvatar = async (userType: string, body: object) => {
  try {
    const res = await axios.post(
      userType === 'user'
        ? `${API_ROUTES.USER.UPLOAD_AVATAR}`
        : `${API_ROUTES.TUTOR.UPLOAD_AVATAR}`,
      body,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};

export const removeAvatar = async (userType: string) => {
  try {
    const res = await axios.delete(
      userType === 'user'
        ? `${API_ROUTES.USER.DELETE_AVATAR}`
        : `${API_ROUTES.TUTOR.DELETE_AVATAR}`,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};

export const updateProfile = async (userType: string, body: object) => {
  try {
    const res = await axios.patch(
      userType === 'user'
        ? `${API_ROUTES.USER.UPDATE_PROFILE}`
        : `${API_ROUTES.TUTOR.UPDATE_PROFILE}`,
      body,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};

export const changePassword = async (userType: string, body: object) => {
  try {
    const res = await axios.patch(
      userType === 'user'
        ? `${API_ROUTES.USER.CHANGE_PASSWORD}`
        : `${API_ROUTES.TUTOR.CHANGE_PASSWORD}`,
      body,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};

export const signout = async (userType: string) => {
  try {
    const res = await axios.post(
      userType === 'user'
        ? `${API_ROUTES.USER.SIGNOUT}`
        : userType === 'tutor'
        ? `${API_ROUTES.TUTOR.SIGNOUT}`
        : `${API_ROUTES.ADMIN.SIGNOUT}`,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};
