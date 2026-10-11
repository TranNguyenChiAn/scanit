import { createHttp } from './http';
import { login as loginRequest } from './auth';
import { findProductByBarcode as findByBarcode, getVariantById as getById } from './products';
import * as adminApi from './admin';
import { recognizeImage as recognize, confirmScan as confirm } from './scan';
import { getServerUrl, getToken } from '../storage/session';

// Khi bat ky cuoc goi nao nhan 401 (token het han), AuthContext se dang ky ham dang xuat o day.
let unauthorizedHandler = () => {};
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn || (() => {});
}

const http = createHttp({
  getBaseUrl: getServerUrl,
  getToken,
  onUnauthorized: () => unauthorizedHandler(),
});

export const api = {
  login: (account, password) => loginRequest(http, account, password),
  findProductByBarcode: (barcode) => findByBarcode(http, barcode),
  getVariant: (id) => getById(http, id),
  recognizeImage: (file) => recognize(http, file),
  confirmScan: (scanEventId, variantId) => confirm(http, scanEventId, variantId),
};

// Quan tri san pham: moi ham tu gan http dung chung
const bind = (fn) => (...args) => fn(http, ...args);
export const admin = {
  listProducts: bind(adminApi.listProducts),
  getProduct: bind(adminApi.getProduct),
  createProduct: bind(adminApi.createProduct),
  updateProduct: bind(adminApi.updateProduct),
  deleteProduct: bind(adminApi.deleteProduct),
  addVariant: bind(adminApi.addVariant),
  updateVariant: bind(adminApi.updateVariant),
  deleteVariant: bind(adminApi.deleteVariant),
  adjustStock: bind(adminApi.adjustStock),
  uploadPhoto: bind(adminApi.uploadPhoto),
  deletePhoto: bind(adminApi.deletePhoto),
  setPrimaryPhoto: bind(adminApi.setPrimaryPhoto),
  listColors: bind(adminApi.listColors),
};
export { buildStockRequest, validateProduct, validateVariant, productToForm, variantToForm, EMPTY_PRODUCT, EMPTY_VARIANT } from './admin';

export { ApiError } from './http';
