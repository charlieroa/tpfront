// En: src/slices/products/thunk.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importamos desde nuestra API real que creamos antes
import * as productApi from "../../services/productApi";
import { Product } from "../../services/productApi";

// Thunk para obtener la lista de TODOS los productos
export const fetchProducts = createAsyncThunk(
    "products/fetchProducts",
    async (_, { rejectWithValue }) => {
        try {
            const response = await productApi.getProducts();
            return response.data;
        } catch (error: any) {
            toast.error("Error al cargar los productos", { autoClose: 3000 });
            return rejectWithValue(error.response?.data?.error || "Error de servidor");
        }
    }
);

// Thunk para obtener las categorías de productos
export const fetchProductCategories = createAsyncThunk(
    "products/fetchProductCategories",
    async (_, { rejectWithValue }) => {
        try {
            const response = await productApi.getProductCategories();
            return response.data;
        } catch (error: any) {
            toast.error("Error al cargar las categorías", { autoClose: 3000 });
            return rejectWithValue(error.response?.data?.error || "Error de servidor");
        }
    }
);

// Thunk para crear un nuevo producto (con lógica de subida de imagen)
export const createNewProduct = createAsyncThunk(
    "products/createNewProduct",
    async (data: { productData: Omit<Product, 'id'>, imageFile?: File }, { rejectWithValue }) => {
        try {
            // 1. Primero, creamos el producto con sus datos
            const response = await productApi.createProduct(data.productData);
            const newProduct = response.data;

            // 2. Si el usuario seleccionó una imagen, la subimos ahora
            if (data.imageFile && newProduct.id) {
                const imageResponse = await productApi.uploadProductImage(newProduct.id, data.imageFile);
                toast.success("Producto e imagen creados con éxito", { autoClose: 3000 });
                return imageResponse.data; // Devolvemos el producto actualizado con la URL de la imagen
            }
            
            toast.success("Producto creado con éxito", { autoClose: 3000 });
            return newProduct; // Devolvemos el producto recién creado (sin imagen)
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al crear el producto", { autoClose: 3000 });
            return rejectWithValue(error.response?.data || "Error de servidor");
        }
    }
);

// Thunk para actualizar un producto existente
export const updateExistingProduct = createAsyncThunk(
    "products/updateProduct",
    async (data: { id: string, productData: Partial<Product> }, { rejectWithValue }) => {
        try {
            const response = await productApi.updateProduct(data.id, data.productData);
            toast.success("Producto actualizado con éxito", { autoClose: 3000 });
            return response.data;
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al actualizar el producto", { autoClose: 3000 });
            return rejectWithValue(error.response?.data || "Error de servidor");
        }
    }
);

// Thunk para eliminar un producto
export const deleteExistingProduct = createAsyncThunk(
    "products/deleteProduct",
    async (id: string, { rejectWithValue }) => {
        try {
            await productApi.deleteProduct(id);
            toast.success("Producto eliminado con éxito", { autoClose: 3000 });
            return id; // Devolvemos el ID para saber cuál eliminar del estado local
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al eliminar el producto", { autoClose: 3000 });
            return rejectWithValue(error.response?.data || "Error de servidor");
        }
    }
);

// Thunk para subir/actualizar la imagen de un producto existente
export const uploadProductImage = createAsyncThunk(
    "products/uploadImage",
    async (data: { id: string, imageFile: File }, { rejectWithValue }) => {
        try {
            const response = await productApi.uploadProductImage(data.id, data.imageFile);
            toast.success("Imagen subida con éxito", { autoClose: 3000 });
            return response.data; // Devuelve el producto actualizado con la nueva URL de la imagen
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al subir la imagen", { autoClose: 3000 });
            return rejectWithValue(error.response?.data || "Error de servidor");
        }
    }
);