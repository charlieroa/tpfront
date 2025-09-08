// En: src/slices/products/slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    fetchProducts,
    fetchProductCategories,
    createNewProduct,
    updateExistingProduct,
    deleteExistingProduct,
    uploadProductImage
} from './thunk';
import { Product, ProductCategory } from "../../services/productApi";

// Definimos la estructura de nuestro estado
export interface ProductsState {
    products: Product[];
    categories: ProductCategory[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Estado inicial para nuestro slice de productos
export const initialState: ProductsState = {
    products: [],
    categories: [],
    status: 'idle',
    error: null,
};

const productSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {}, // No necesitamos reducers síncronos por ahora
    extraReducers: (builder) => {
        // --- Casos para fetchProducts ---
        builder.addCase(fetchProducts.pending, (state) => {
            state.status = 'loading';
            state.error = null;
        });
        builder.addCase(fetchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
            state.status = 'succeeded';
            state.products = action.payload;
        });
        builder.addCase(fetchProducts.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload as string;
        });

        // --- Casos para fetchProductCategories ---
        builder.addCase(fetchProductCategories.fulfilled, (state, action: PayloadAction<ProductCategory[]>) => {
            state.categories = action.payload;
        });

        // --- Casos para createNewProduct ---
        builder.addCase(createNewProduct.fulfilled, (state, action: PayloadAction<Product>) => {
            state.products.unshift(action.payload); // Añadir al principio de la lista
        });

        // --- Casos para updateExistingProduct y uploadProductImage ---
        // Ambos thunks devuelven el producto actualizado, así que la lógica es la misma.
        const handleProductUpdate = (state: ProductsState, action: PayloadAction<Product>) => {
             state.products = state.products.map((product) =>
                product.id === action.payload.id
                    ? action.payload // Reemplaza el producto viejo con el actualizado
                    : product
            );
        };
        builder.addCase(updateExistingProduct.fulfilled, handleProductUpdate);
        builder.addCase(uploadProductImage.fulfilled, handleProductUpdate);
        
        // --- Casos para deleteExistingProduct ---
        builder.addCase(deleteExistingProduct.fulfilled, (state, action: PayloadAction<string>) => {
            // El payload es el ID del producto eliminado, lo filtramos del estado
            state.products = state.products.filter(
                (product) => product.id !== action.payload
            );
        });
    }
});

// La línea más importante: exportamos el reducer para que index.ts lo pueda encontrar
export default productSlice.reducer;