// Contenido para: src/pages/DashboardPrincipal/index.tsx

import React, { useState } from 'react';
import { Container, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import classnames from 'classnames';

// Importamos los componentes que actuarán como el contenido de nuestras pestañas
import Calendar from '../Calendar';
import DashboardCrm from '../DashboardCrm';

// Interfaz vacía para mantener la estructura de TypeScript, aunque no recibimos props.
interface IProps {}

const DashboardPrincipal: React.FC<IProps> = () => {
    document.title = "Dashboard | Sistema de Peluquerías";

    // Estado para controlar qué pestaña está activa.
    const [activeTab, setActiveTab] = useState<string>('1');

    const toggleTab = (tab: string) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    return (
        <React.Fragment>
            {/* Contenedor principal con la clase de anulación para eliminar el padding */}
            <div className="page-content page-content-flush"> 
                <Container fluid>
                    {/* El sistema de Pestañas (Tabs) */}
                    <Nav tabs className="nav-tabs-custom nav-success mb-3">
                        <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '1' })}
                                onClick={() => { toggleTab('1'); }}
                            >
                                <i className="ri-calendar-2-line me-1"></i> Calendario y Caja
                            </NavLink>
                        </NavItem>

                        {/* --- BOTÓN DE NAVEGACIÓN DE REPORTES COMENTADO --- */}
                        {/* <NavItem>
                            <NavLink
                                style={{ cursor: "pointer" }}
                                className={classnames({ active: activeTab === '2' })}
                                onClick={() => { toggleTab('2'); }}
                            >
                                <i className="ri-bar-chart-2-line me-1"></i> Reportes
                            </NavLink>
                        </NavItem>
                        */}
                    </Nav>

                    {/* El contenido de las pestañas */}
                    <TabContent activeTab={activeTab} className="text-muted">
                        <TabPane tabId="1">
                            {/* Renderizamos el componente del Calendario */}
                            <Calendar />
                        </TabPane>

                        {/* --- CONTENIDO DE REPORTES COMENTADO --- */}
                        {/* <TabPane tabId="2">
                            <DashboardCrm /> 
                        </TabPane>
                        */}
                    </TabContent>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardPrincipal;