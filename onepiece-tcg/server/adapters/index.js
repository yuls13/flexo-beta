import { searchShopify, shopifyQueries } from './shopify.js';
import { searchWoo } from './woocommerce.js';
import { searchPresta } from './prestashop.js';

export const ADAPTERS = {
  shopify: { search: searchShopify, queries: shopifyQueries },
  woocommerce: { search: searchWoo, queries: (q) => q },
  prestashop: { search: searchPresta, queries: (q) => q },
};
