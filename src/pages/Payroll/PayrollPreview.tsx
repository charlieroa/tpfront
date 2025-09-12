// Archivo: src/pages/Payroll/PayrollPreview.tsx
// VERSIÓN CORRECTA: Muestra 10 estilistas con scroll infinito y datos de detalle.

import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CountUp from 'react-countup';

// --- INTERFACES Y TIPOS ---
interface WidgetData { label: string; icon: string; counter: number; prefix?: string; badge: string; separator?: string; duration?: number; }
interface Client { id: string; name: string; service: string; value: number; }
interface InventoryItem { id: string; product: string; commission: number; }
interface Expense { id: string; description: string; amount: number; }
interface Stylist { id: string; name: string; avatar: string; netToPay: number; clients: Client[]; inventory: InventoryItem[]; expenses: Expense[]; }

// --- FORMATEADOR Y COMPONENTES ---
const formatterCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0, minimumFractionDigits: 0 });

const BreadCrumb = ({ title, pageTitle, onBack }: { title: string, pageTitle: string, onBack?: () => void }) => (
    <div className="mb-4 d-flex align-items-center">
        {onBack && ( <button onClick={onBack} className="btn btn-light me-3" style={{ border: '1px solid #dee2e6' }}><i className="ri-arrow-left-line"></i> Volver</button> )}
        <div><h4>{title}</h4><p className="text-muted mb-0">Nómina / {pageTitle}</p></div>
    </div>
);

const PayrollWidgets = ({ summary }: { summary: any }) => {
    const widgetsData: WidgetData[] = [
        { label: "Total Efectivo", icon: "ri-cash-line", counter: summary.cash, prefix: "$", badge: "ri-arrow-up-s-line text-success", separator: ".", duration: 2 },
        { label: "Total Tarjetas", icon: "ri-bank-card-line", counter: summary.creditCard, prefix: "$", badge: "ri-arrow-up-s-line text-success", separator: ".", duration: 2 },
        { label: "Inventario Vendido", icon: "ri-shopping-bag-line", counter: summary.inventorySold, prefix: "$", badge: "ri-arrow-up-s-line text-success", separator: ".", duration: 2 },
        { label: "Egresos Estilistas", icon: "ri-arrow-up-down-line", counter: summary.stylistExpenses, prefix: "$", badge: "ri-arrow-down-s-line text-danger", separator: ".", duration: 2 },
    ];
    return (
        <div className="card crm-widget">
            <div className="card-body p-0">
                <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 g-0">
                    {widgetsData.map((widget, index) => (
                        <div className="col" key={index}><div className="py-4 px-3">
                                <h5 className="text-muted text-uppercase fs-13">{widget.label}<i className={widget.badge + " fs-18 float-end align-middle"}></i></h5>
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0"><i className={widget.icon + " fs-2 text-muted"}></i></div>
                                    <div className="flex-grow-1 ms-3"><h2 className="mb-0"><span className="counter-value"><CountUp start={0} prefix={widget.prefix} separator={widget.separator} end={widget.counter} duration={widget.duration} decimals={0}/></span></h2></div>
                                </div></div></div>
                    ))}
                </div></div></div>
    );
};

// --- VISTA DE VISTA PREVIA ---
const PayrollPreview = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const dateRange = startDateParam && endDateParam ? [new Date(startDateParam.replace(/-/g, '/')), new Date(endDateParam.replace(/-/g, '/'))] : [];
    const handleBack = () => { navigate('/payroll'); };

    const allStylistsData: Stylist[] = [
        { 
            id: 'stylist_a', name: 'Ana María', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=AM', netToPay: 2350000, 
            clients: [{ id: 'c1', name: 'Laura Gómez', service: 'Corte y Cepillado', value: 80000 }, { id: 'c2', name: 'Sofía Castro', service: 'Manicura', value: 45000 }],
            inventory: [{ id: 'i1', product: 'Shampoo Liso Keratina', commission: 12000 }, { id: 'i2', product: 'Acondicionador Reparador', commission: 15000 }],
            expenses: [{ id: 'e1', description: 'Adelanto de nómina', amount: 150000 }] 
        },
        { 
            id: 'stylist_b', name: 'Carlos López', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=CL', netToPay: 2500000, 
            clients: [{ id: 'c3', name: 'Camila Torres', service: 'Balayage', value: 250000 }],
            inventory: [],
            expenses: [{ id: 'e2', description: 'Adelanto de nómina', amount: 100000 }] 
        },
        { id: 'stylist_c', name: 'Beatriz Pinzón', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=BP', netToPay: 1980000, clients: [], inventory: [], expenses: [] },
        { id: 'stylist_d', name: 'David Gómez', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=DG', netToPay: 2800000, clients: [], inventory: [], expenses: [] },
        { id: 'stylist_e', name: 'Elena Franco', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=EF', netToPay: 2150000, clients: [], inventory: [], expenses: [] },
        { id: 'stylist_f', name: 'Fernando Díaz', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=FD', netToPay: 2450000, clients: [], inventory: [], expenses: [] },
        { id: 'stylist_g', name: 'Gabriela Soto', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=GS', netToPay: 2600000, clients: [], inventory: [], expenses: [] },
        { id: 'stylist_h', name: 'Hugo Mora', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=HM', netToPay: 1800000, clients: [], inventory: [], expenses: [] },
        { id: 'stylist_i', name: 'Irene Paredes', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=IP', netToPay: 2950000, clients: [], inventory: [], expenses: [] },
        { id: 'stylist_j', name: 'Javier Hernández', avatar: 'https://placehold.co/100x100/EFEFEF/333333?text=JH', netToPay: 2250000, clients: [], inventory: [], expenses: [] },
    ];

    const ITEMS_PER_LOAD = 4;
    const INITIAL_ITEMS = 6;
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [displayCount, setDisplayCount] = useState(INITIAL_ITEMS);

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1;
            if (isAtBottom && displayCount < allStylistsData.length) {
                const newCount = Math.min(displayCount + ITEMS_PER_LOAD, allStylistsData.length);
                setDisplayCount(newCount);
            }
        }
    };
    
    const visibleStylists = allStylistsData.slice(0, displayCount);
    const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(allStylistsData[0]);
    const [activeTab, setActiveTab] = useState('clients');
    
    const periodSummary = { cash: 5200000, creditCard: 3100000, inventorySold: 1500000, stylistExpenses: 450000 };
    const totalPayroll = allStylistsData.reduce((sum, stylist) => sum + stylist.netToPay, 0);
    const periodTitle = dateRange.length === 2 ? `Período del ${dateRange[0].toLocaleDateString()} al ${dateRange[1].toLocaleDateString()}` : "Detalle de Período";

    return (
        <div className="page-content" style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f5f7fa' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <BreadCrumb title="Vista Previa de Nómina" pageTitle={periodTitle} onBack={handleBack} />
                <PayrollWidgets summary={periodSummary} />
                <div className="card mt-4">
                    <div className="card-body"><div className="row">
                        <div className="col-md-4">
                            <h5 className="card-title mb-3">Estilistas</h5>
                            <div 
                                ref={scrollContainerRef}
                                onScroll={handleScroll}
                                className="list-group" 
                                style={{ maxHeight: '280px', overflowY: 'auto' }}
                            >
                                {visibleStylists.map(stylist => (
                                    <a href="#!" key={stylist.id} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedStylist?.id === stylist.id ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setSelectedStylist(stylist); }}>
                                        <div className="d-flex align-items-center"><img src={stylist.avatar} alt={stylist.name} className="rounded-circle me-3" style={{ width: '40px', height: '40px' }}/><span>{stylist.name}</span></div>
                                        <span className={`badge ${selectedStylist?.id === stylist.id ? 'bg-white text-primary' : 'bg-light text-dark'}`}>{formatterCOP.format(stylist.netToPay)}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div className="col-md-8">
                            {selectedStylist ? (
                                <div>
                                    <h5 className="card-title mb-3">Detalle de: {selectedStylist.name}</h5>
                                    <ul className="nav nav-tabs"><li className="nav-item"><a className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')} href="#!">Clientes Atendidos</a></li><li className="nav-item"><a className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')} href="#!">Comisión Inventario</a></li><li className="nav-item"><a className={`nav-link ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')} href="#!">Egresos</a></li></ul>
                                    <div className="tab-content p-3 border border-top-0">
                                        {activeTab === 'clients' && (<div><table className="table"><thead><tr><th>Cliente</th><th>Servicio</th><th>Valor</th></tr></thead><tbody>{selectedStylist.clients.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.service}</td><td>{formatterCOP.format(c.value)}</td></tr>)}</tbody></table></div>)}
                                        {activeTab === 'inventory' && (<div><table className="table"><thead><tr><th>Producto</th><th>Comisión Ganada</th></tr></thead><tbody>{selectedStylist.inventory.map(i => <tr key={i.id}><td>{i.product}</td><td>{formatterCOP.format(i.commission)}</td></tr>)}</tbody></table></div>)}
                                        {activeTab === 'expenses' && (<div><table className="table"><thead><tr><th>Descripción</th><th>Monto</th></tr></thead><tbody>{selectedStylist.expenses.map(e => <tr key={e.id}><td>{e.description}</td><td>-{formatterCOP.format(e.amount)}</td></tr>)}</tbody></table></div>)}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-5"><p className="text-muted">Selecciona un estilista para ver sus detalles.</p></div>
                            )}
                        </div>
                    </div></div>
                </div>
                <div className="card mt-4"><div className="card-body d-flex justify-content-between align-items-center">
                    <div><h4 className="card-title mb-0">Total a Pagar de Nómina</h4><p className="text-muted mb-0">Costo total para el salón en este período.</p></div>
                    <div className="text-end"><h2 className="text-success">{formatterCOP.format(totalPayroll)}</h2><button className="btn btn-success"><i className="ri-save-line me-1"></i>Generar y Guardar Nómina</button></div>
                </div></div>
            </div>
        </div>
    );
};

export default PayrollPreview;