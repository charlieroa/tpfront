// Ubicación: src/pages/Payroll/index.tsx

import React, { useEffect, useState, useMemo } from 'react'; // <-- CORRECCIÓN AQUÍ
import { Container, Row, Col, Card, CardBody, Label, Button, Spinner, Table, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Flatpickr from 'react-flatpickr';
import Swal from 'sweetalert2';

import BreadCrumb from '../../Components/Common/BreadCrumb';
import { api } from '../../services/api';

// --- Tipos de Datos ---
type PayrollPreviewItem = {
    stylist_id: string;
    stylist_name: string;
    gross_total: number;
    total_deductions: number;
    net_paid: number;
    service_commissions: number;
    product_commissions: number;
    base_salary: number;
};

type PayrollHistoryItem = {
    id: string;
    first_name: string;
    last_name: string;
    start_date: string;
    end_date: string;
    total_paid: number;
    payment_date: string;
    commission_rate_snapshot?: number;
};

const formatterCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0, minimumFractionDigits: 0 });

// --- Componente Principal ---
const PayrollPage = () => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const [dateRange, setDateRange] = useState<Date[]>([startOfWeek, endOfWeek]);
    const [payrollPreview, setPayrollPreview] = useState<PayrollPreviewItem[]>([]);
    const [payrollHistory, setPayrollHistory] = useState<PayrollHistoryItem[]>([]);

    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedStylistForDetail, setSelectedStylistForDetail] = useState<PayrollPreviewItem | null>(null);

    const grandTotalNet = useMemo(() =>
        payrollPreview.reduce((sum, item) => sum + item.net_paid, 0),
    [payrollPreview]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const historyRes = await api.get('/payrolls');
            setPayrollHistory(historyRes.data);
        } catch(e) { 
            console.error("Error cargando historial de nómina:", e);
            Swal.fire("Error", "No se pudo cargar el historial de nóminas.", "error");
        } finally { 
            setLoadingHistory(false); 
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleLoadPreview = async () => {
        if (dateRange.length < 2) {
            Swal.fire("Atención", "Por favor, selecciona un rango de fechas.", "warning");
            return;
        }
        setLoadingPreview(true);
        setPayrollPreview([]);
        try {
            const start = dateRange[0].toISOString().slice(0, 10);
            const end = dateRange[1].toISOString().slice(0, 10);
            const res = await api.get(`/payrolls/preview?start_date=${start}&end_date=${end}`);
            setPayrollPreview(res.data);
        } catch (error: any) {
            Swal.fire("Error", error?.response?.data?.error || "No se pudo cargar el resumen de nómina.", "error");
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleGeneratePayroll = async () => {
        const confirm = await Swal.fire({
            title: `¿Confirmas el pago total de ${formatterCOP.format(grandTotalNet)}?`,
            text: `Se generará la nómina para ${payrollPreview.length} estilista(s). Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar y guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#438eff',
            cancelButtonColor: '#f06548',
        });

        if (!confirm.isConfirmed) return;

        setIsGenerating(true);
        try {
            for (const stylistSummary of payrollPreview) {
                await api.post('/payrolls', {
                    stylist_id: stylistSummary.stylist_id,
                    start_date: dateRange[0].toISOString().slice(0, 10),
                    end_date: dateRange[1].toISOString().slice(0, 10),
                });
            }
            Swal.fire('¡Nómina Generada!', `Se ha guardado la nómina para ${payrollPreview.length} estilista(s).`, 'success');
            setPayrollPreview([]);
            await fetchHistory();
        } catch (error: any) {
            Swal.fire("Error al Guardar", error?.response?.data?.error || "No se pudo generar la nómina para uno o más estilistas.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const openDetailModal = (stylistData: PayrollPreviewItem) => {
        setSelectedStylistForDetail(stylistData);
        setDetailModalOpen(true);
    };

    document.title = "Nómina | StyleApp";

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Nómina" pageTitle="Administración" />
                <Card>
                    <CardBody>
                        <h4 className="card-title mb-4">Generar Nómina por Período</h4>
                        <Row className="g-3 align-items-end">
                            <Col md={6}>
                                <Label>Selecciona el Período de Pago</Label>
                                <Flatpickr
                                    className="form-control"
                                    options={{ mode: "range", dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y", locale: "es" }}
                                    value={dateRange}
                                    onChange={(dates) => setDateRange(dates as Date[])}
                                />
                            </Col>
                            <Col md={3}>
                                <Button color="primary" className="w-100" onClick={handleLoadPreview} disabled={loadingPreview}>
                                    {loadingPreview ? <Spinner size="sm" /> : "Cargar Resumen"}
                                </Button>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>

                {loadingPreview && <div className="text-center my-5"><Spinner /> <h5 className="mt-2">Calculando resumen...</h5></div>}
                
                {payrollPreview.length > 0 && !loadingPreview && (
                    <Card>
                        <CardBody>
                            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-4">
                                <div>
                                    <h4 className="card-title mb-0">Resumen de Nómina a Generar</h4>
                                    <p className="mb-0 text-muted">Total a pagar para este período: <strong className="text-success fs-5">{formatterCOP.format(grandTotalNet)}</strong></p>
                                </div>
                                <Button color="success" size="lg" onClick={handleGeneratePayroll} disabled={isGenerating}>
                                    {isGenerating ? <Spinner size="sm" className='me-2' /> : <i className="ri-save-line me-1"></i>}
                                    Generar y Guardar Nómina
                                </Button>
                            </div>
                            <div className="table-responsive">
                                <Table hover className="align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Estilista</th>
                                            <th>Ingresos Brutos</th>
                                            <th>Deducciones</th>
                                            <th className="text-end">Neto a Pagar (Estimado)</th>
                                            <th style={{width: "120px"}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payrollPreview.map(item => (
                                            <tr key={item.stylist_id}>
                                                <td>{item.stylist_name}</td>
                                                <td>{formatterCOP.format(item.gross_total)}</td>
                                                <td className="text-danger">-{formatterCOP.format(item.total_deductions)}</td>
                                                <td className="fw-bold text-end">{formatterCOP.format(item.net_paid)}</td>
                                                <td>
                                                    <Button color="secondary" outline size="sm" onClick={() => openDetailModal(item)}>Ver Detalle</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>
                )}

                <Card>
                    <CardBody>
                        <h4 className="card-title mb-4">Historial de Pagos de Nómina</h4>
                        {loadingHistory ? <div className="text-center"><Spinner /></div> : (
                            <div className="table-responsive">
                                <Table className="table-hover align-middle table-nowrap mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Estilista</th>
                                            <th>Período</th>
                                            <th>Comisión (%)</th>
                                            <th>Total Bruto Pagado</th>
                                            <th>Fecha de Pago</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payrollHistory.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.first_name} {item.last_name || ''}</td>
                                                <td>{new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</td>
                                                <td>{item.commission_rate_snapshot ? `${item.commission_rate_snapshot}%` : 'N/A'}</td>
                                                <td>{formatterCOP.format(item.total_paid)}</td>
                                                <td>{new Date(item.payment_date).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {payrollHistory.length === 0 && (
                                            <tr><td colSpan={5} className="text-center text-muted">No hay registros de nómina para mostrar.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>

            <Modal isOpen={detailModalOpen} toggle={() => setDetailModalOpen(false)} centered>
                <ModalHeader toggle={() => setDetailModalOpen(false)}>Desglose para {selectedStylistForDetail?.stylist_name}</ModalHeader>
                <ModalBody>
                    {selectedStylistForDetail && (
                        <div style={{textAlign: "left"}}>
                            <h5 style={{color: "#438eff"}}>INGRESOS</h5>
                            <div style={{display: "flex", justifyContent: "space-between"}}><span>Comisiones (Servicios):</span> <strong>{formatterCOP.format(selectedStylistForDetail.service_commissions)}</strong></div>
                            <div style={{display: "flex", justifyContent: "space-between"}}><span>Comisiones (Productos):</span> <strong>{formatterCOP.format(selectedStylistForDetail.product_commissions)}</strong></div>
                            <div style={{display: "flex", justifyContent: "space-between"}}><span>Salario Base:</span> <strong>{formatterCOP.format(selectedStylistForDetail.base_salary)}</strong></div>
                            <hr/>
                            <div style={{display: "flex", justifyContent: "space-between"}}><strong>TOTAL BRUTO:</strong> <strong>{formatterCOP.format(selectedStylistForDetail.gross_total)}</strong></div>
                            
                            <h5 style={{marginTop: "20px", color: "#f06548"}}>DEDUCCIONES</h5>
                            <div style={{display: "flex", justifyContent: "space-between"}}><span>Anticipos:</span> <span>-{formatterCOP.format(selectedStylistForDetail.total_deductions)}</span></div>
                            
                            <hr/>
                            <div style={{fontSize: "1.5rem", display: "flex", justifyContent: "space-between"}}><strong>NETO A PAGAR:</strong> <strong style={{color: "#0ab39c"}}>{formatterCOP.format(selectedStylistForDetail.net_paid)}</strong></div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default PayrollPage;