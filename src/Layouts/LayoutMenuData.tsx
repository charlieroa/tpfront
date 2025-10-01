// Archivo: src/Layouts/LayoutMenuData.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Swal from 'sweetalert2';
import { getToken } from "../services/auth";

// --- NUEVO: Imports de Redux para LEER el estado ---
import { useSelector } from "react-redux";
import { selectIsSetupComplete } from "../slices/Settings/settingsSlice"; // Usando la ruta que creaste

// --- Helper para obtener el rol del usuario desde el token JWT ---
const getRoleFromToken = (): number | null => {
    try {
        const token = getToken();
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.role_id || null;
    } catch (e) {
        console.error("Error decodificando el token:", e);
        return null;
    }
};

const LayoutMenuData = () => {
    const history = useNavigate();
    const [isDashboard, setIsDashboard] = useState<boolean>(false);
    const [isEstilistas, setIsEstilistas] = useState<boolean>(false);
    const [isInventario, setIsInventario] = useState<boolean>(false);
    const [iscurrentState, setIscurrentState] = useState("Dashboard");

    const userRole = getRoleFromToken();

    // --- NUEVO: Leemos el estado directamente desde Redux de forma reactiva ---
    const isSetupComplete = useSelector(selectIsSetupComplete);

    useEffect(() => {
        document.body.classList.remove("twocolumn-panel");
        if (iscurrentState !== "Dashboard") { setIsDashboard(false); }
        if (iscurrentState !== "Estilistas") { setIsEstilistas(false); }
        if (iscurrentState !== "Inventario") { setIsInventario(false); }
    }, [history, iscurrentState, isDashboard, isEstilistas, isInventario]);


    const menuItems: any[] = [
        { label: "Menú Principal", isHeader: true },
        { id: "dashboard", label: "Dashboard", icon: "ri-dashboard-2-line", link: "/dashboard", roles: [1, 2, 3] },
        { id: "stylists", label: "Crm", icon: "ri-user-heart-line", link: "/stylists", roles: [1, 3] },
        { id: "inventory", label: "Inventario", icon: "ri-archive-line", link: "/inventory", roles: [1] },
        { id: "payroll", label: "Nómina", icon: "ri-money-dollar-circle-line", link: "/payroll", roles: [1, ] },
        { id: "settings", label: "Configuración", icon: "ri-settings-3-line", link: "/settings", roles: [1] },
     {
        id: "show-tour",
        label: "Mostrar Tour",
        icon: "ri-question-line", // Un ícono de pregunta es apropiado
        link: "#!", // No lleva a ninguna parte
        roles: [1], // Solo para administradores
        isAction: true // Una bandera para identificarlo como un botón de acción
    },
    ];

    // Filtramos y modificamos el menú (esta lógica no cambia)
    const finalMenuItems = useMemo(() => {
        if (!userRole) return [];

        const roleFiltered = menuItems.filter(item => {
            if (!item.roles) return true;
            return item.roles.includes(userRole);
        });

        if (isSetupComplete) {
            return roleFiltered;
        }

        return roleFiltered.map(item => {
            if (item.id === 'settings' || item.isHeader) {
                return item;
            }

            return {
                ...item,
                icon: 'ri-lock-line',
                disabled: true,
                onClick: () => {
                    Swal.fire({
                        title: 'Configuración Incompleta',
                        text: 'Tienes que configurar primero tu negocio para acceder a esta sección.',
                        icon: 'warning',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#438eff'
                    });
                }
            };
        });
    }, [userRole, isSetupComplete]); // <-- Ahora depende de la variable de Redux

    return <React.Fragment>{finalMenuItems}</React.Fragment>;
};

export default LayoutMenuData;