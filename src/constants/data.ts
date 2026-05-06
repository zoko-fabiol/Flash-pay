import type { Country, Settings } from '../types';

export const COUNTRIES: Country[] = [
  {
    name: 'Cameroun',
    dialCode: '+237',
    operators: [
      { name: 'MTN', prefixes: ['650','651','652','653','654','67','68'], color: '#ffcc00' },
      { name: 'Orange', prefixes: ['655','656','657','658','659','69'], color: '#ff6600' }
    ],
  },
  {
    name: 'Côte d\'Ivoire',
    dialCode: '+225',
    operators: [
      { name: 'Orange', prefixes: ['07','08','09','47','48','49','57','58','59','77','78','79','87','88','89'], color: '#ff6600' },
      { name: 'MTN', prefixes: ['04','05','06','44','45','46','54','55','56','74','75','76','84','85','86'], color: '#ffcc00' },
      { name: 'Moov', prefixes: ['01','02','03','41','42','43','51','52','53','71','72','73','81','82','83'], color: '#0055aa' }
    ],
  },
  {
    name: 'Sénégal',
    dialCode: '+221',
    operators: [
      { name: 'Orange', prefixes: ['77', '78'], color: '#ff6600' },
      { name: 'Free', prefixes: ['70', '76'], color: '#0066cc' },
      { name: 'Expresso', prefixes: ['81'], color: '#ff0000' }
    ],
  },
];

export const DEFAULT_SETTINGS: Settings = {
  rate_eur_xaf: 655.957,
  rate_rub_xaf: 7.5,
  feePercentage: 0.02,
};

export const CURRENCIES = ['EUR', 'RUB', 'USD'];
export const TRANSFER_ROUTES = ['Russie-Russie', 'Europe-Afrique', 'Direct'];
