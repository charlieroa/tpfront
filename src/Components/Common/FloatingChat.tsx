// src/Components/Common/FloatingChat.tsx
// Chat flotante con IA real conectado al endpoint de OpenAI + Orquestador

import React, { useState, useEffect, useRef } from 'react';
import {
    Offcanvas,
    OffcanvasHeader,
    OffcanvasBody,
    Spinner,
    Alert
} from "reactstrap";
import { jwtDecode } from "jwt-decode";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    isTyping?: boolean;
}

interface FloatingChatProps {
    isOpen: boolean;
    toggle: () => void;
}

// Obtener tenant_id del token
const getTenantId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.tenant_id || decoded?.tenant_id || null;
    } catch {
        return null;
    }
};

// Obtener user_id del token
const getUserId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.id || null;
    } catch {
        return null;
    }
};

const FloatingChat: React.FC<FloatingChatProps> = ({ isOpen, toggle }) => {
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll automático
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Efecto typing para la respuesta
    const typeResponse = (fullResponse: string) => {
        const newMessageId = Date.now();

        setMessages(prev => [...prev, {
            id: newMessageId,
            role: 'assistant',
            content: '',
            isTyping: true
        }]);

        let currentIndex = 0;
        const typingInterval = setInterval(() => {
            currentIndex++;
            setMessages(prev => prev.map(msg =>
                msg.id === newMessageId
                    ? { ...msg, content: fullResponse.slice(0, currentIndex) }
                    : msg
            ));

            if (currentIndex >= fullResponse.length) {
                clearInterval(typingInterval);
                setIsAiTyping(false);
                setMessages(prev => prev.map(msg =>
                    msg.id === newMessageId
                        ? { ...msg, isTyping: false }
                        : msg
                ));

                // Agregar al historial de conversación
                setConversationHistory(prev => [
                    ...prev.slice(-8),
                    { role: 'assistant', content: fullResponse }
                ]);
            }
        }, 12);
    };

    // Llamar al endpoint de IA
    const callAiChat = async (userMessage: string) => {
        const tenantId = getTenantId();
        const clientId = getUserId();

        if (!tenantId) {
            setError('No se encontró el tenant. Por favor, inicia sesión.');
            setIsAiTyping(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/ai-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    message: userMessage,
                    tenantId,
                    clientId,
                    conversationHistory: conversationHistory.slice(-8)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al comunicarse con el asistente');
            }

            const data = await response.json();
            typeResponse(data.response);

        } catch (err: any) {
            console.error('Error en AI Chat:', err);
            setIsAiTyping(false);

            if (err.message.includes('API Key')) {
                setError('⚠️ Falta configurar la API Key de OpenAI. Ve a Configuración → Configura tu bot.');
            } else {
                typeResponse(`Lo siento, ocurrió un error: ${err.message}`);
            }
        }
    };

    const handleChatSubmit = () => {
        if (!chatMessage.trim() || isAiTyping) return;

        const userMsg: ChatMessage = {
            id: Date.now(),
            role: 'user',
            content: chatMessage.trim()
        };

        setMessages(prev => [...prev, userMsg]);
        setError(null);

        // Agregar al historial
        setConversationHistory(prev => [
            ...prev.slice(-8),
            { role: 'user', content: chatMessage.trim() }
        ]);

        setChatMessage('');
        setIsAiTyping(true);

        // Llamar a la IA
        callAiChat(userMsg.content);
    };

    // Reiniciar conversación
    const resetChat = () => {
        setMessages([]);
        setConversationHistory([]);
        setError(null);
        setChatMessage('');
    };

    const suggestions = [
        { text: '📝 Ver servicios', query: '¿Qué servicios tienen?' },
        { text: '👤 Ver estilistas', query: '¿Quiénes son los estilistas?' },
        { text: '📅 Agendar cita', query: 'Quiero agendar una cita para mañana' },
        { text: '📍 ¿Dónde están ubicados?', query: '¿Cuál es su dirección?' },
        { text: '💰 Precios', query: '¿Cuáles son los precios de los servicios?' },
    ];

    return (
        <Offcanvas
            isOpen={isOpen}
            toggle={toggle}
            direction="end"
            className="offcanvas-end border-0"
            style={{ width: '400px' }}
        >
            <OffcanvasHeader
                className="d-flex align-items-center p-3"
                toggle={toggle}
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderBottom: 'none'
                }}
            >
                <div className="d-flex align-items-center justify-content-between w-100">
                    <span className="m-0 text-white d-flex align-items-center gap-2">
                        <span style={{ fontSize: '20px' }}>✨</span>
                        <span style={{ fontWeight: 600 }}>Asistente de Citas</span>
                    </span>
                </div>
            </OffcanvasHeader>

            <OffcanvasBody className="p-0 d-flex flex-column" style={{ background: '#f9fafb' }}>
                {/* Error */}
                {error && (
                    <Alert color="warning" className="m-3 mb-0 py-2 small">
                        {error}
                    </Alert>
                )}

                {/* Área de mensajes */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {/* Estado vacío */}
                    {messages.length === 0 && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '20px'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💇✨</div>
                            <h5 style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#111827' }}>
                                ¡Hola! Soy tu asistente
                            </h5>
                            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#6b7280' }}>
                                Puedo ayudarte a ver servicios, estilistas y agendar citas
                            </p>

                            {/* Sugerencias */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setChatMessage(s.query);
                                            // Auto-enviar la sugerencia
                                            setTimeout(() => {
                                                const fakeEvent = { key: 'Enter', shiftKey: false, preventDefault: () => { } };
                                            }, 100);
                                        }}
                                        style={{
                                            padding: '10px 16px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            background: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '20px',
                                            cursor: 'pointer',
                                            color: '#374151',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#667eea';
                                            e.currentTarget.style.color = '#667eea';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                            e.currentTarget.style.color = '#374151';
                                        }}
                                    >
                                        {s.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mensajes */}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={{
                                display: 'flex',
                                gap: '10px',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                            }}
                        >
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    flexShrink: 0
                                }}>
                                    ✨
                                </div>
                            )}
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '18px',
                                maxWidth: '80%',
                                whiteSpace: 'pre-wrap',
                                fontSize: '14px',
                                lineHeight: 1.5,
                                ...(msg.role === 'user' ? {
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    borderBottomRightRadius: '4px'
                                } : {
                                    background: 'white',
                                    color: '#111827',
                                    borderBottomLeftRadius: '4px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                })
                            }}>
                                {msg.content}
                                {msg.isTyping && <span style={{ fontWeight: 'bold', animation: 'blink 1s infinite' }}>|</span>}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    padding: '12px 16px 16px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '10px',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '24px',
                        padding: '10px 14px'
                    }}>
                        <textarea
                            style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                fontSize: '14px',
                                resize: 'none',
                                outline: 'none',
                                minHeight: '24px',
                                maxHeight: '100px',
                                fontFamily: 'inherit',
                                color: '#374151'
                            }}
                            placeholder="Escribe tu mensaje..."
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleChatSubmit();
                                }
                            }}
                            disabled={isAiTyping}
                            rows={1}
                        />
                        <button
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: 'none',
                                background: chatMessage.trim() && !isAiTyping
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : '#e5e7eb',
                                color: 'white',
                                cursor: chatMessage.trim() && !isAiTyping ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.2s'
                            }}
                            onClick={handleChatSubmit}
                            disabled={!chatMessage.trim() || isAiTyping}
                        >
                            {isAiTyping ? (
                                <Spinner size="sm" color="light" />
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    {isAiTyping && (
                        <div style={{ fontSize: '12px', color: '#667eea', marginTop: '8px', textAlign: 'center' }}>
                            ✨ El asistente está escribiendo...
                        </div>
                    )}
                    {messages.length > 0 && !isAiTyping && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <button
                                onClick={resetChat}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <i className="ri-refresh-line"></i>
                                Nueva conversación
                            </button>
                        </div>
                    )}
                </div>
            </OffcanvasBody>

            {/* Estilos para animación del cursor */}
            <style>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </Offcanvas>
    );
};

export default FloatingChat;
