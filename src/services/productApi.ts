// En: src/services/productApi.ts
import api from "./api"; // Asumo que esta es tu instancia central de Axios

export interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price?: number;
  sale_price: number;
  staff_price?: number;
  stock: number;
  category_id?: string;
  category_name?: string;
  audience_type: 'cliente' | 'estilista' | 'ambos';
  image_url?: string;
  is_active?: boolean;
  product_commission_percent?: number; // <-- LA LÍNEA AÑADIDA
}

export interface ProductCategory { 
  id: string; 
  name: string; 
}

// ======================================================
// ========= API para PRODUCTOS (Sin cambios) =========
// ======================================================

export const getProducts = () => api.get<Product[]>('/products');
export const createProduct = (productData: Omit<Product, 'id'>) => api.post<Product>('/products', productData);
export const updateProduct = (id: string, productData: Partial<Product>) => api.put<Product>(`/products/${id}`, productData);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);
export const uploadProductImage = (id: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post<Product>(`/products/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// =================================================================
// ========= API para CATEGORÍAS DE PRODUCTOS (Sin cambios) =========
// =================================================================

// LEER todas las categorías
export const getProductCategories = () => api.get<ProductCategory[]>('/product-categories');

// CREAR una nueva categoría
export const createCategory = (categoryData: { name: string }) => 
  api.post<ProductCategory>('/product-categories', categoryData);

// ACTUALIZAR una categoría existente
export const updateCategory = (id: string, categoryData: { name:string }) => 
  api.put<ProductCategory>(`/product-categories/${id}`, categoryData);

// ELIMINAR una categoría existente
export const deleteCategory = (id: string) => 
  api.delete(`/product-categories/${id}`);