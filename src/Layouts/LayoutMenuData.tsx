// Archivo: src/Layouts/LayoutMenuData.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
// Asegúrate de que la ruta al servicio de autenticación sea correcta desde esta ubicación
import { getToken } from "../services/auth"; 

// --- Helper para obtener el rol del usuario desde el token JWT ---
const getRoleFromToken = (): number | null => {
    try {
        const token = getToken();
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        // La estructura del payload del token es { user: { role_id: ... } }
        return decoded?.user?.role_id || null;
    } catch (e) {
        console.error("Error decodificando el token:", e);
        return null;
    }
};

// El nombre del componente ahora es LayoutMenuData para coincidir con tu archivo
const LayoutMenuData = () => { 
    const history = useNavigate();
    // Estados para el funcionamiento del menú (se mantienen como los tenías)
    const [isDashboard, setIsDashboard] = useState<boolean>(false);
    const [isEstilistas, setIsEstilistas] = useState<boolean>(false);
    const [isInventario, setIsInventario] = useState<boolean>(false);
    const [iscurrentState, setIscurrentState] = useState("Dashboard");

    // --- Obtenemos el rol del usuario actual ---
    const userRole = getRoleFromToken();

    useEffect(() => {
        document.body.classList.remove("twocolumn-panel");
        if (iscurrentState !== "Dashboard") { setIsDashboard(false); }
        if (iscurrentState !== "Estilistas") { setIsEstilistas(false); }
        if (iscurrentState !== "Inventario") { setIsInventario(false); }
    }, [history, iscurrentState, isDashboard, isEstilistas, isInventario]);

    
    // --- La lista de menús ahora tiene una propiedad "roles" para definir permisos ---
    const menuItems: any[] = [
        {
            label: "Menú Principal",
            isHeader: true,
        },
        {
            id: "dashboard",
            label: "Dashboard",
            icon: "ri-dashboard-2-line",
            link: "/dashboard",
            roles: [1, 2, 3] // Visible para Admin, Cajero y Estilista
        },
        {
            id: "stylists",
            label: "Crm",
            icon: "ri-user-heart-line",
            link: "/stylists",
            roles: [1, 3] // Visible para Admin y Estilista
        },
        {
            id: "inventory",
            label: "Inventario",
            icon: "ri-archive-line",
            link: "/inventory",
            roles: [1] // Visible solo para Admin
        },
        {
            id: "settings",
            label: "Configuracion",
            icon: "ri-settings-3-line",
            link: "/Settings",
            roles: [1] // Visible solo para Admin
        },
    ];

    // --- Filtramos el menú basado en el rol del usuario ---
    const filteredMenuItems = useMemo(() => {
        if (!userRole) return []; // Si no hay rol (no logueado), no muestra nada

        // Filtra la lista para mantener solo los items permitidos para el rol actual
        return menuItems.filter(item => {
            // Si el item no tiene una propiedad "roles", es público (como los headers)
            if (!item.roles) {
                return true;
            }
            // Si tiene roles, verificamos que el rol del usuario esté en la lista de permitidos
            return item.roles.includes(userRole);
        });
    }, [userRole]); // Esta lógica se recalcula solo si el rol del usuario cambia

    // Devolvemos la lista de menús ya filtrada para que el resto del layout la renderice
    return <React.Fragment>{filteredMenuItems}</React.Fragment>;
};

export default LayoutMenuData;