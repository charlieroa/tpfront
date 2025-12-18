import React, { useState, useEffect, useRef } from 'react';
import {
    Row, Col, Card, CardBody, Button, Input, InputGroup, InputGroupText,
    Spinner, Alert, Badge
} from 'reactstrap';

// Ajusta la URL si es necesario
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface Props {
    tenantId: string;
}

const WhatsAppConfig: React.FC<Props> = ({ tenantId }) => {
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Estado para OpenAI API Key
    const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [savingApiKey, setSavingApiKey] = useState(false);
    const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [hasExistingKey, setHasExistingKey] = useState(false);

    // Referencia para el temporizador de auto-refresco
    const pollTimer = useRef<NodeJS.Timeout | null>(null);

    // --- FUNCIÓN PARA CARGAR API KEY EXISTENTE ---
    const loadApiKey = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.openai_api_key) {
                    setOpenaiApiKey('sk-....' + data.openai_api_key.slice(-4));
                    setHasExistingKey(true);
                }
            }
        } catch (error) {
            console.error('Error loading API key:', error);
        }
    };

    // --- FUNCIÓN PARA GUARDAR API KEY ---
    const handleSaveApiKey = async () => {
        if (!openaiApiKey.trim() || openaiApiKey.startsWith('sk-....')) {
            setApiKeyStatus('error');
            setErrorMsg('Por favor ingresa una API Key válida de OpenAI');
            setTimeout(() => { setApiKeyStatus('idle'); setErrorMsg(null); }, 3000);
            return;
        }

        setSavingApiKey(true);
        setApiKeyStatus('idle');

        try {
            const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({ openai_api_key: openaiApiKey.trim() })
            });

            if (!response.ok) {
                throw new Error('Error al guardar la API Key');
            }

            setApiKeyStatus('saved');
            setSuccessMsg('¡API Key de OpenAI guardada correctamente!');
            setHasExistingKey(true);
            setOpenaiApiKey('sk-....' + openaiApiKey.slice(-4));
            setShowApiKey(false);

            setTimeout(() => { setApiKeyStatus('idle'); setSuccessMsg(null); }, 3000);
        } catch (error) {
            setApiKeyStatus('error');
            setErrorMsg('No se pudo guardar la API Key. Intenta de nuevo.');
            setTimeout(() => { setApiKeyStatus('idle'); setErrorMsg(null); }, 3000);
        } finally {
            setSavingApiKey(false);
        }
    };

    // Cargar API Key al montar
    useEffect(() => {
        if (tenantId) {
            loadApiKey();
        }
    }, [tenantId]);

    // --- 1. FUNCIÓN PARA CONSULTAR ESTADO ---
    const checkConnection = async (isAutoRefresh = false) => {
        if (!isAutoRefresh) setLoading(true);
        if (!isAutoRefresh) setErrorMsg(null);

        try {
            const response = await fetch(`${API_BASE_URL}/whatsapp/status/${tenantId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'CONNECTED') {
                setIsConnected(true);
                setQrCode(null);
                if (!isConnected && !isAutoRefresh) setSuccessMsg('¡Conexión verificada exitosamente!');
            }
            else if (data.status === 'QR_READY' && data.qr) {
                setIsConnected(false);
                setQrCode(data.qr);
            }
            else if (data.status === 'LOADING') {
                setIsConnected(false);
            }

        } catch (error: any) {
            console.error("Error fetching status:", error);
            if (!isAutoRefresh) setErrorMsg('No se pudo conectar con el servidor.');
        } finally {
            if (!isAutoRefresh) setLoading(false);
        }
    };

    // --- 2. FUNCIÓN PARA DESCONECTAR ---
    const handleDisconnect = async () => {
        const confirmed = window.confirm("¿Desconectar Bot?\nEl bot dejará de responder mensajes automáticamente.");

        if (confirmed) {
            setLoading(true);
            try {
                await fetch(`${API_BASE_URL}/whatsapp/disconnect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tenantId })
                });

                setIsConnected(false);
                setQrCode(null);
                setSuccessMsg('El bot ha sido desconectado correctamente.');

                setTimeout(() => {
                    checkConnection();
                }, 1500);

            } catch (error) {
                setErrorMsg('No se pudo desconectar el servicio.');
            } finally {
                setLoading(false);
            }
        }
    };

    // --- 3. EFECTO: CARGA INICIAL Y POLLING ---
    useEffect(() => {
        if (tenantId) {
            checkConnection();
        }

        if (!isConnected) {
            pollTimer.current = setInterval(() => {
                checkConnection(true);
            }, 3000);
        }

        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, [tenantId, isConnected]);

    return (
        <div>
            {/* MENSAJES DE ERROR / ÉXITO */}
            {errorMsg && <Alert color="danger" className="mb-3">{errorMsg}</Alert>}
            {successMsg && <Alert color="success" className="mb-3">{successMsg}</Alert>}

            <Row className="g-4">
                {/* ============================================ */}
                {/* COLUMNA IZQUIERDA: OPENAI API KEY */}
                {/* ============================================ */}
                <Col lg={6}>
                    <Card className="h-100 border shadow-sm">
                        <CardBody>
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div
                                    className="d-flex align-items-center justify-content-center rounded-3"
                                    style={{
                                        width: 48,
                                        height: 48,
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    }}
                                >
                                    <i className="ri-sparkling-line fs-20 text-white"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h5 className="mb-1">OpenAI API Key</h5>
                                    <p className="text-muted mb-0 small">Para habilitar la inteligencia artificial del chat</p>
                                </div>
                                {hasExistingKey && (
                                    <Badge color="success" pill className="d-flex align-items-center gap-1">
                                        <i className="ri-check-line"></i> Configurada
                                    </Badge>
                                )}
                            </div>

                            <div className="mb-3">
                                <InputGroup>
                                    <Input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={openaiApiKey}
                                        onChange={(e) => {
                                            setOpenaiApiKey(e.target.value);
                                            setHasExistingKey(false);
                                        }}
                                        placeholder="sk-proj-..."
                                        className={
                                            apiKeyStatus === 'error' ? 'border-danger' :
                                                apiKeyStatus === 'saved' ? 'border-success' : ''
                                        }
                                    />
                                    <InputGroupText
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setShowApiKey(!showApiKey)}
                                    >
                                        <i className={showApiKey ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                                    </InputGroupText>
                                </InputGroup>
                            </div>

                            <div className="d-flex align-items-center justify-content-between gap-2">
                                <Button
                                    color="primary"
                                    onClick={handleSaveApiKey}
                                    disabled={savingApiKey || openaiApiKey.startsWith('sk-....')}
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none'
                                    }}
                                >
                                    {savingApiKey ? (
                                        <>
                                            <Spinner size="sm" className="me-2" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-line me-1"></i>
                                            Guardar API Key
                                        </>
                                    )}
                                </Button>

                                {hasExistingKey && (
                                    <Button
                                        color="link"
                                        size="sm"
                                        className="text-muted p-0"
                                        onClick={() => { setOpenaiApiKey(''); setHasExistingKey(false); }}
                                    >
                                        Cambiar key
                                    </Button>
                                )}
                            </div>

                            <div className="mt-3 pt-3 border-top">
                                <small className="text-muted">
                                    <i className="ri-information-line me-1"></i>
                                    <a
                                        href="https://platform.openai.com/api-keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary"
                                    >
                                        Obtén tu API Key de OpenAI aquí →
                                    </a>
                                </small>
                            </div>
                        </CardBody>
                    </Card>
                </Col>

                {/* ============================================ */}
                {/* COLUMNA DERECHA: WHATSAPP BOT STATUS */}
                {/* ============================================ */}
                <Col lg={6}>
                    <Card className="h-100 border shadow-sm">
                        <CardBody className="text-center d-flex flex-column justify-content-center">
                            <div className="d-flex align-items-center gap-3 mb-4 justify-content-center">
                                <div
                                    className="d-flex align-items-center justify-content-center rounded-3"
                                    style={{
                                        width: 48,
                                        height: 48,
                                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
                                    }}
                                >
                                    <i className="ri-whatsapp-line fs-20 text-white"></i>
                                </div>
                                <div className="text-start">
                                    <h5 className="mb-1">Bot de WhatsApp</h5>
                                    <p className="text-muted mb-0 small">Estado de conexión</p>
                                </div>
                            </div>

                            {/* LOADER DE CARGA */}
                            {loading && (
                                <div className="py-4">
                                    <Spinner color="success" className="mb-3" />
                                    <p className="text-muted mb-0">Comunicando con el servidor...</p>
                                </div>
                            )}

                            {/* VISTA: CONECTADO */}
                            {!loading && isConnected && (
                                <div className="py-3">
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                                        style={{
                                            width: 80,
                                            height: 80,
                                            backgroundColor: 'rgba(37, 211, 102, 0.15)'
                                        }}
                                    >
                                        <i className="ri-check-double-line text-success" style={{ fontSize: 40 }}></i>
                                    </div>
                                    <h5 className="text-success mb-2">¡Bot Conectado y Activo!</h5>
                                    <p className="text-muted small mb-3">
                                        Tu peluquería está vinculada correctamente y respondiendo mensajes.
                                    </p>
                                    <Button
                                        color="danger"
                                        outline
                                        size="sm"
                                        onClick={handleDisconnect}
                                    >
                                        <i className="ri-logout-circle-line me-1"></i>
                                        Desconectar Bot
                                    </Button>
                                </div>
                            )}

                            {/* VISTA: QR LISTO */}
                            {!loading && !isConnected && qrCode && (
                                <div className="py-2">
                                    <Alert color="info" className="d-flex align-items-center justify-content-center gap-2 py-2 mb-3">
                                        <i className="ri-smartphone-line"></i>
                                        <span>Abre WhatsApp → Dispositivos vinculados → Vincular</span>
                                    </Alert>

                                    <div
                                        className="d-inline-block p-3 bg-white rounded-3 shadow-sm position-relative"
                                        style={{ border: '2px solid #e9ecef' }}
                                    >
                                        <img
                                            src={qrCode}
                                            alt="Escanea este código QR"
                                            style={{
                                                width: 200,
                                                height: 200,
                                                objectFit: 'contain',
                                                imageRendering: 'pixelated'
                                            }}
                                        />
                                        <span
                                            className="position-absolute bg-success rounded-circle"
                                            style={{
                                                width: 12,
                                                height: 12,
                                                top: 8,
                                                right: 8,
                                                animation: 'pulse 2s infinite'
                                            }}
                                        ></span>
                                    </div>

                                    <div className="mt-3">
                                        <Button
                                            color="link"
                                            size="sm"
                                            onClick={() => checkConnection(false)}
                                        >
                                            <i className="ri-refresh-line me-1"></i>
                                            ¿Expiró? Recargar código
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* VISTA: INICIANDO */}
                            {!loading && !isConnected && !qrCode && !errorMsg && (
                                <div className="py-4">
                                    <Spinner color="secondary" size="sm" className="me-2" />
                                    <span className="text-muted">Iniciando motor de WhatsApp...</span>
                                </div>
                            )}

                            {/* VISTA: ERROR */}
                            {!loading && !isConnected && !qrCode && errorMsg && (
                                <div className="py-3">
                                    <Button
                                        color="primary"
                                        onClick={() => checkConnection(false)}
                                    >
                                        <i className="ri-refresh-line me-1"></i>
                                        Intentar de nuevo
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Estilos para la animación de pulse */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default WhatsAppConfig;