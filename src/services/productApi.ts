// En: src/services/productApi.ts
import api from "./api"; // Asumo que esta es tu instancia central de Axios

export interface Product {
  id: string; name: string; description?: string; cost_price?: number;
  sale_price: number; staff_price?: number; stock: number; category_id?: string;
  category_name?: string; audience_type: 'cliente' | 'estilista' | 'ambos';
  image_url?: string; is_active?: boolean;
}
export interface ProductCategory { id: string; name: string; }

export const getProductCategories = () => api.get<ProductCategory[]>('/product-categories');
export const getProducts = () => api.get<Product[]>('/products');
export const createProduct = (productData: Omit<Product, 'id'>) => api.post<Product>('/products', productData);
export const updateProduct = (id: string, productData: Partial<Product>) => api.put<Product>(`/products/${id}`, productData);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);
export const uploadProductImage = (id: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post<Product>(`/products/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};