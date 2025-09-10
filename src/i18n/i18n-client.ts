'use client';

import { initReactI18next } from 'react-i18next';
import i18n, { initI18n } from './i18n';

// Initialize i18next for React on the client
i18n.use(initReactI18next);
initI18n();

export default i18n;
