import React, { useEffect, useState } from 'react';
import PropTypes from "prop-types";
import withRouter from '../Components/Common/withRouter';
// Imports para el Tour
import { useLocation } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { tourSteps } from './tourSteps';

//import Components
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

//import actions
import {
    changeLayout, changeSidebarTheme, changeLayoutMode,
    changeLayoutWidth, changeLayoutPosition, changeTopbarTheme,
    changeLeftsidebarSizeType, changeLeftsidebarViewType, changeSidebarImageType,
    changeSidebarVisibility
} from "../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from 'reselect';

// Objeto de estilos para el Tour
const joyrideStyles = {
    options: {
      zIndex: 10000,
      primaryColor: '#438eff',
      arrowColor: '#ffffff',
      backgroundColor: '#ffffff',
      textColor: '#555',
    },
    tooltip: {
      borderRadius: '0.5rem',
      padding: '1rem 1.5rem',
    },
    buttonNext: {
      borderRadius: '0.25rem',
      fontSize: '14px',
    },
    buttonBack: {
      marginRight: 'auto',
      borderRadius: '0.25rem',
    },
};

const Layout = (props: any) => {
    const dispatch: any = useDispatch();
    const {
        layoutType, leftSidebarType, layoutModeType, layoutWidthType,
        layoutPositionType, topbarThemeType, leftsidbarSizeType,
        leftSidebarViewType, leftSidebarImageType, sidebarVisibilitytype
    } = useSelector(createSelector(
        (state: any) => state.Layout,
        (layout) => ({
            layoutType: layout.layoutType,
            leftSidebarType: layout.leftSidebarType,
            layoutModeType: layout.layoutModeType,
            layoutWidthType: layout.layoutWidthType,
            layoutPositionType: layout.layoutPositionType,
            topbarThemeType: layout.topbarThemeType,
            leftsidbarSizeType: layout.leftsidbarSizeType,
            leftSidebarViewType: layout.leftSidebarViewType,
            leftSidebarImageType: layout.leftSidebarImageType,
            sidebarVisibilitytype: layout.sidebarVisibilitytype,
        })
    ));

    // Lógica para controlar el tour
    const [runTour, setRunTour] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const tourCompleted = localStorage.getItem('settingsTourCompleted');
        if (!tourCompleted && location.pathname === '/settings') {
            setTimeout(() => {
                setRunTour(true);
            }, 500);
        }
    }, [location.pathname]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            localStorage.setItem('settingsTourCompleted', 'true');
        }
    };
    
    // --- FUNCIÓN MEJORADA PARA INICIAR EL TOUR MANUALMENTE ---
    const startTour = () => {
        // Primero, navegamos a la página de settings
        props.router.navigate('/settings');

        // Damos un pequeño respiro para que la página cargue antes de iniciar el tour
        setTimeout(() => {
            localStorage.removeItem('settingsTourCompleted');
            setRunTour(true);
        }, 150);
    };

    /*
    layout settings
    */
    useEffect(() => {
        if (
            layoutType || leftSidebarType || layoutModeType || layoutWidthType ||
            layoutPositionType || topbarThemeType || leftsidbarSizeType ||
            leftSidebarViewType || leftSidebarImageType || sidebarVisibilitytype
        ) {
            window.dispatchEvent(new Event('resize'));
            dispatch(changeLeftsidebarViewType(leftSidebarViewType));
            dispatch(changeLeftsidebarSizeType(leftsidbarSizeType));
            dispatch(changeSidebarTheme(leftSidebarType));
            dispatch(changeLayoutMode(layoutModeType));
            dispatch(changeLayoutWidth(layoutWidthType));
            dispatch(changeLayoutPosition(layoutPositionType));
            dispatch(changeTopbarTheme(topbarThemeType));
            dispatch(changeLayout(layoutType));
            dispatch(changeSidebarImageType(leftSidebarImageType));
            dispatch(changeSidebarVisibility(sidebarVisibilitytype));
        }
    }, [layoutType,
        leftSidebarType, layoutModeType, layoutWidthType,
        layoutPositionType, topbarThemeType, leftsidbarSizeType,
        leftSidebarViewType, leftSidebarImageType, sidebarVisibilitytype,
        dispatch]);
    
    const onChangeLayoutMode = (value: any) => {
        if (changeLayoutMode) {
            dispatch(changeLayoutMode(value));
        }
    };

    const [headerClass, setHeaderClass] = useState<any>("");
    useEffect(() => {
        const scrollHandler = () => scrollNavigation();
        window.addEventListener("scroll", scrollHandler, true);
        return () => window.removeEventListener("scroll", scrollHandler, true);
    }, []);
    
    function scrollNavigation() {
        var scrollup = document.documentElement.scrollTop;
        if (scrollup > 50) {
            setHeaderClass("topbar-shadow");
        } else {
            setHeaderClass("");
        }
    }

    useEffect(() => {
        const humberIcon = document.querySelector(".hamburger-icon") as HTMLElement;
        if (humberIcon) {
            if (sidebarVisibilitytype === 'show' || layoutType === "vertical" || layoutType === "twocolumn") {
                humberIcon.classList.remove('open');
            } else {
                humberIcon.classList.add('open');
            }
        }
    }, [sidebarVisibilitytype, layoutType]);

    return (
        <React.Fragment>
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous={true}
                showProgress={true}
                showSkipButton={true}
                callback={handleJoyrideCallback}
                locale={{
                    back: 'Atrás',
                    close: 'Cerrar',
                    last: 'Finalizar',
                    next: 'Siguiente',
                    skip: 'Saltar',
                }}
                styles={joyrideStyles}
            />

            <div id="layout-wrapper">
                <Header
                    headerClass={headerClass}
                    layoutModeType={layoutModeType}
                    onChangeLayoutMode={onChangeLayoutMode} />
                
                {/* --- Pasamos la función startTour al Sidebar --- */}
                <Sidebar layoutType={layoutType} startTour={startTour} />
                
                <div className="main-content">{props.children}
                    <Footer />
                </div>
            </div>
        </React.Fragment>
    );
};

Layout.propTypes = {
    children: PropTypes.object,
};

export default withRouter(Layout);