// Archivo: src/pages/Payroll/index.jsx
// VERSIÓN CORRECTA: Muestra la lista y navega a la página de vista previa.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";

// --- INTERFACES Y TIPOS ---
interface PayrollPeriod {
    id: string;
    startDate: string;
    endDate: string;
    paymentDate: string;
    totalPaid: number;
    stylistCount: number;
    details: PayrollDetail[];
}

interface PayrollDetail {
    stylistId: string;
    stylistName: string;
    avatar: string;
    grossTotal: number;
    deductions: number;
    netPaid: number;
    commissionRateSnapshot: number;
}

// --- FORMATEADOR Y COMPONENTES ---
const formatterCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0, minimumFractionDigits: 0 });

const BreadCrumb = ({ title, pageTitle }: { title: string, pageTitle: string }) => (
    <div className="mb-4">
        <h4>{title}</h4>
        <p className="text-muted mb-0">Nómina / {pageTitle}</p>
    </div>
);

// --- VISTA DE LISTA ---
const PayrollList = () => {
    const navigate = useNavigate();

    const payrollPeriodsData: PayrollPeriod[] = [
        // ... (tus datos de períodos de nómina)
        { id: 'period_1', startDate: '2025-09-01', endDate: '2025-09-15', paymentDate: '2025-09-16T10:00:00Z', totalPaid: 4850000, stylistCount: 2, details: [ { stylistId: 'stylist_a', stylistName: 'Ana María', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=AM", grossTotal: 2500000, deductions: 150000, netPaid: 2350000, commissionRateSnapshot: 50 }, { stylistId: 'stylist_b', stylistName: 'Carlos López', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=CL", grossTotal: 2600000, deductions: 100000, netPaid: 2500000, commissionRateSnapshot: 45 } ] },
        { id: 'period_2', startDate: '2025-08-16', endDate: '2025-08-31', paymentDate: '2025-09-01T11:30:00Z', totalPaid: 2200000, stylistCount: 1, details: [ { stylistId: 'stylist_a', stylistName: 'Ana María', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=AM", grossTotal: 2400000, deductions: 200000, netPaid: 2200000, commissionRateSnapshot: 50 } ] },
        { id: 'period_3', startDate: '2025-08-01', endDate: '2025-08-15', paymentDate: '2025-08-16T09:00:00Z', totalPaid: 3500000, stylistCount: 2, details: [ { stylistId: 'stylist_b', stylistName: 'Carlos López', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=CL", grossTotal: 1900000, deductions: 100000, netPaid: 1800000, commissionRateSnapshot: 45 }, { stylistId: 'stylist_c', stylistName: 'Sofia Vergara', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=SV", grossTotal: 1800000, deductions: 100000, netPaid: 1700000, commissionRateSnapshot: 48 } ] },
        { id: 'period_4', startDate: '2025-07-16', endDate: '2025-07-31', paymentDate: '2025-08-01T10:30:00Z', totalPaid: 4150000, stylistCount: 2, details: [ { stylistId: 'stylist_a', stylistName: 'Ana María', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=AM", grossTotal: 2200000, deductions: 150000, netPaid: 2050000, commissionRateSnapshot: 50 }, { stylistId: 'stylist_b', stylistName: 'Carlos López', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=CL", grossTotal: 2200000, deductions: 100000, netPaid: 2100000, commissionRateSnapshot: 45 } ] },
        { id: 'period_5', startDate: '2025-07-01', endDate: '2025-07-15', paymentDate: '2025-07-16T11:00:00Z', totalPaid: 3900000, stylistCount: 2, details: [ { stylistId: 'stylist_a', stylistName: 'Ana María', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=AM", grossTotal: 2100000, deductions: 50000, netPaid: 2050000, commissionRateSnapshot: 50 }, { stylistId: 'stylist_c', stylistName: 'Sofia Vergara', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=SV", grossTotal: 1900000, deductions: 50000, netPaid: 1850000, commissionRateSnapshot: 48 } ] },
        { id: 'period_6', startDate: '2025-06-16', endDate: '2025-06-30', paymentDate: '2025-07-01T09:30:00Z', totalPaid: 4500000, stylistCount: 2, details: [ { stylistId: 'stylist_b', stylistName: 'Carlos López', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=CL", grossTotal: 2300000, deductions: 0, netPaid: 2300000, commissionRateSnapshot: 45 }, { stylistId: 'stylist_c', stylistName: 'Sofia Vergara', avatar: "https://placehold.co/100x100/EFEFEF/333333?text=SV", grossTotal: 2200000, deductions: 0, netPaid: 2200000, commissionRateSnapshot: 48 } ] }
    ];
    
    const [dateRange, setDateRange] = useState<Date[]>([]);
    const [periods] = useState<PayrollPeriod[]>(payrollPeriodsData);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const handleViewDetails = (period: PayrollPeriod) => {
        setSelectedPeriod(period);
        setIsDetailModalOpen(true);
    };

    const handleGenerateClick = () => {
        if (dateRange.length < 2) {
            alert("Por favor, selecciona un rango de fechas completo.");
            return;
        }
        const start = dateRange[0];
        const end = dateRange[1];

        if (start > end) {
            alert("La fecha de inicio no puede ser posterior a la fecha de fin.");
            return;
        }
        
        const startDateStr = start.toISOString().split('T')[0];
        const endDateStr = end.toISOString().split('T')[0];
        navigate(`/payroll/preview?startDate=${startDateStr}&endDate=${endDateStr}`);
    };

    const itemsPerPage = 4;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPeriods = periods.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(periods.length / itemsPerPage);

    const paginate = (pageNumber: number) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    return (
        <>
            <BreadCrumb title="Nómina" pageTitle="Nómina" />
            <div className="card mb-4">
                <div className="card-header"><h4 className="card-title mb-0">Crear Nueva Nómina</h4></div>
                <div className="card-body"><div className="row g-3 align-items-end">
                    <div className="col-md-9">
                        <label className="form-label">Selecciona el Período de Pago</label>
                        <Flatpickr 
                            className="form-control"
                            options={{ mode: "range", dateFormat: "Y-m-d" }}
                            value={dateRange}
                            onChange={(dates: Date[]) => { setDateRange(dates); }}
                            placeholder="Selecciona un rango de fechas..."
                        />
                    </div>
                    <div className="col-md-3"><button className="btn btn-primary w-100" onClick={handleGenerateClick} style={{ backgroundColor: '#438eff', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>Generar Vista Previa</button></div>
                </div></div>
            </div>
            <div className="card">
                <div className="card-header d-flex align-items-center"><h4 className="card-title mb-0 flex-grow-1">Historial de Períodos de Nómina</h4></div>
                <div className="card-body">
                    <ul className="list-group list-group-flush border-dashed" style={{ listStyle: 'none', padding: 0 }}>
                        {currentPeriods.map(period => (
                             <li className="list-group-item ps-0" key={period.id} style={{ paddingLeft: 0, borderTop: '1px dashed #e9ecef', paddingTop: '1rem', paddingBottom: '1rem' }}>
                                <div className="row align-items-center g-3">
                                    <div className="col-auto"><div style={{ width: '60px', height: '60px', backgroundColor: '#f8f9fa', borderRadius: '0.25rem', boxShadow: '0 2px 4px rgba(0,0,0,.075)', textAlign: 'center', padding: '5px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><h5 className="mb-0">{new Date(period.startDate).toLocaleDateString('es-CO', { day: '2-digit' })}</h5><div className="text-muted">{new Date(period.startDate).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</div></div></div>
                                    <div className="col"><h5 className="text-muted mt-0 mb-1 fs-13" style={{ fontSize: '13px', color: '#6c757d' }}>Período del {new Date(period.startDate).toLocaleDateString('es-CO')} al {new Date(period.endDate).toLocaleDateString('es-CO')}</h5><a href="#!" onClick={(e) => { e.preventDefault(); handleViewDetails(period); }} className="text-reset fs-14 mb-0" style={{ textDecoration: 'none', color: 'inherit', fontSize: '14px' }}>Nómina pagada por un total de <span style={{ fontWeight: 'bold' }}>{formatterCOP.format(period.totalPaid)}</span></a></div>
                                    <div className="col-sm-auto"><div className="d-flex align-items-center"><div className="avatar-group me-3" style={{ display: 'flex' }}>
                                        {period.details.map((stylist, index) => (<div className="avatar-group-item" key={index} style={{ marginLeft: '-10px' }}><a href="#!" className="d-inline-block" title={stylist.stylistName}><img src={stylist.avatar} alt={stylist.stylistName} className="rounded-circle" style={{ width: '24px', height: '24px', border: '2px solid white' }} /></a></div>))}
                                    </div><button className="btn btn-light btn-sm" onClick={() => handleViewDetails(period)} style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Detalles</button></div></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-end mt-4">
                            <nav>
                                <ul className="pagination">
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                        <a className="page-link" href="#!" onClick={(e) => { e.preventDefault(); paginate(currentPage - 1); }}>Anterior</a>
                                    </li>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                        <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                                            <a onClick={(e) => { e.preventDefault(); paginate(number); }} href="#!" className="page-link">{number}</a>
                                        </li>
                                    ))}
                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                        <a className="page-link" href="#!" onClick={(e) => { e.preventDefault(); paginate(currentPage + 1); }}>Siguiente</a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>
            </div>
            {/* ... (código del modal se mantiene igual) ... */}
        </>
    );
};

// --- COMPONENTE PRINCIPAL ---
const PayrollPage = () => {
    return (
        <div className="page-content" style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f5f7fa' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <PayrollList />
            </div>
        </div>
    );
};

export default PayrollPage;