// Contenido para tu archivo LayoutMenuData.js (o Navdata.js)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Navdata = () => {
    const history = useNavigate();
    // Conservamos los estados necesarios para que los submenús funcionen
    const [isDashboard, setIsDashboard] = useState<boolean>(false);
    const [isEstilistas, setIsEstilistas] = useState<boolean>(false);
    const [isInventario, setIsInventario] = useState<boolean>(false);

    // Esta función es para manejar el clic en los menús que tienen sub-items
    const [iscurrentState, setIscurrentState] = useState("Dashboard");

    useEffect(() => {
        document.body.classList.remove("twocolumn-panel");
        if (iscurrentState !== "Dashboard") {
            setIsDashboard(false);
        }
        if (iscurrentState !== "Estilistas") {
            setIsEstilistas(false);
        }
        if (iscurrentState !== "Inventario") {
            setIsInventario(false);
        }
        // ... podemos añadir más lógica aquí si es necesario
    }, [history, iscurrentState, isDashboard, isEstilistas, isInventario]);

    // --- NUESTRA LISTA DE MENÚS (LA CONSTITUCIÓN) ---
    const menuItems: any = [
        {
            label: "Menú Principal",
            isHeader: true,
        },
       {
        id: "dashboard",
        label: "Dashboard", // El dashboard ahora CONTIENE el calendario
        icon: "ri-dashboard-2-line",
        link: "/dashboard",
    },
        {
            id: "stylists",
            label: "Estilistas",
            icon: "ri-user-heart-line", // Un ícono más apropiado
            link: "/stylists",
        },
        {
            id: "inventory",
            label: "Inventario",
            icon: "ri-archive-line", // Ícono para inventario
            link: "/inventory",
        },
        {
            id: "payroll",
            label: "Nómina",
            icon: "ri-wallet-3-line", // Ícono para nómina/pagos
            link: "/payroll",
        },

         {
            id: "settings",
            label: "Configuracion",
            icon: "ri-settings-3-line", // Ícono para nómina/pagos
            link: "/Settings",
        },
        // Puedes añadir más menús aquí si es necesario.
        // Por ejemplo, para los servicios y categorías
        // {
        //     id: "services",
        //     label: "Servicios",
        //     icon: "ri-scissors-cut-line",
        //     link: "/services",
        // },
    ];
    return <React.Fragment>{menuItems}</React.Fragment>;
};

export default Navdata;