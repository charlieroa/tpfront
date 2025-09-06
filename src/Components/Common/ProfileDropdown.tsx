import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Spinner } from 'reactstrap';

// Importamos nuestros helpers de autenticación
import { getDecodedToken, logout } from '../../services/auth';
import api from '../../services/api';

// Imagen de fallback
import avatar1 from "../../assets/images/users/avatar-1.jpg";

const roleMap: { [key: number]: string } = {
    1: "Administrador",
    2: "Cajero",
    3: "Estilista"
};

const ProfileDropdown = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState<any | null>(null);
    const [tenantLogo, setTenantLogo] = useState<string>(avatar1);
    const [cashSession, setCashSession] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isProfileDropdown, setIsProfileDropdown] = useState<boolean>(false);

    // --- MODIFICADO: Función de carga de datos más robusta ---
    const fetchProfileData = async () => {
        setLoading(true);
        const decodedToken = getDecodedToken();
        const userId = decodedToken?.user?.id;
        const tenantId = decodedToken?.user?.tenant_id;

        if (userId && tenantId) {
            try {
                // Hacemos todas las peticiones en paralelo
                const [userRes, tenantRes, cashRes] = await Promise.all([
                    api.get(`/users/${userId}`),
                    api.get(`/tenants/${tenantId}`),
                    api.get('/cash/current')
                ]);
                
                // Guardamos los datos del usuario (incluyendo el nombre real)
                setUser(userRes.data);

                // Procesamos el logo del tenant
                if (tenantRes.data?.logo_url) {
                    const baseUrl = api.defaults.baseURL || '';
                    const logo = tenantRes.data.logo_url;
                    setTenantLogo(logo.startsWith('http') ? logo : `${baseUrl}${logo}`);
                }

                // Procesamos la sesión de caja
                setCashSession(cashRes.data);

            } catch (error) {
                console.error("Error al cargar datos para el perfil:", error);
            }
        }
        setLoading(false);
    };
    
    // --- MODIFICADO: useEffect ahora también escucha eventos ---
    useEffect(() => {
        // Carga los datos la primera vez que el componente aparece
        fetchProfileData();

        // Escucha el "anuncio" que envían los modales de caja
        const handleCashSessionChange = () => {
            console.log("Evento 'cashSessionChanged' detectado. Recargando datos...");
            fetchProfileData();
        };
        
        window.addEventListener('cashSessionChanged', handleCashSessionChange);

        // Limpia el listener cuando el componente se desmonta
        return () => {
            window.removeEventListener('cashSessionChanged', handleCashSessionChange);
        };
    }, []);

    // --- Lógica de visualización (sin cambios) ---
    const userName = useMemo(() => user?.first_name || "Usuario", [user]);
    const userRole = useMemo(() => user?.role_id, [user]);
    const roleName = useMemo(() => userRole ? roleMap[userRole] || "Usuario" : "Usuario", [userRole]);
    const sessionBalance = useMemo(() => {
        if (!cashSession || !cashSession.summary?.incomes_by_payment_method) {
            return 0;
        }
        return cashSession.summary.incomes_by_payment_method.reduce((acc: number, item: any) => acc + parseFloat(item.total), 0);
    }, [cashSession]);

    const toggleProfileDropdown = () => { setIsProfileDropdown(!isProfileDropdown); };
    const handleLogout = () => { logout(); navigate("/login"); };

    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className="ms-sm-3 header-item topbar-user">
                <DropdownToggle tag="button" type="button" className="btn shadow-none">
                    <span className="d-flex align-items-center">
                        <img className="rounded-circle header-profile-user" src={tenantLogo} alt="Header Avatar" />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{loading ? <Spinner size="sm"/> : userName}</span>
                            <span className="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">{roleName}</span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">¡Hola, {userName}!</h6>
                    <DropdownItem href="/Settings">
                        <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">Mi Perfil</span>
                    </DropdownItem>
                    <DropdownItem href="/Settings">
                        <i className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">Configuración</span>
                    </DropdownItem>
                    <div className="dropdown-divider"></div>
                    <DropdownItem href="#">
                        <i className="mdi mdi-wallet text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">
                            Balance: <b>
                                {loading ? <Spinner size="sm" /> :
                                 cashSession ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(sessionBalance)
                                             : "Caja Cerrada"
                                }
                            </b>
                        </span>
                    </DropdownItem>
                    <DropdownItem onClick={handleLogout}>
                        <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle" data-key="t-logout">Cerrar Sesión</span>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;