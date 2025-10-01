import React, { useEffect, useCallback } from 'react';
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";
import { Collapse } from 'reactstrap';

// Import Data
import navdata from "../LayoutMenuData";
//i18n
import { withTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { createSelector } from 'reselect';
 
const VerticalLayout = (props : any) => {
    const navData = navdata().props.children;

    const {
        leftsidbarSizeType, sidebarVisibilitytype, layoutType
    } = useSelector(createSelector(
        (state: any) => state.Layout,
        (layout) => ({
            leftsidbarSizeType: layout.leftsidbarSizeType,
            sidebarVisibilitytype: layout.sidebarVisibilitytype,
            layoutType: layout.layoutType
        })
    ));

    const resizeSidebarMenu = useCallback(() => {
        var windowSize = document.documentElement.clientWidth;
        const humberIcon = document.querySelector(".hamburger-icon") as HTMLElement;
        var hamburgerIcon = document.querySelector(".hamburger-icon");
        if (windowSize >= 1025) {
            if (document.documentElement.getAttribute("data-layout") === "vertical") {
                document.documentElement.setAttribute("data-sidebar-size", leftsidbarSizeType);
            }
            if (document.documentElement.getAttribute("data-layout") === "semibox") {
                document.documentElement.setAttribute("data-sidebar-size", leftsidbarSizeType);
            }
            if ((sidebarVisibilitytype === "show" || layoutType === "vertical" || layoutType === "twocolumn") && document.querySelector(".hamburger-icon")) {
                if (hamburgerIcon !== null) {
                    hamburgerIcon.classList.remove("open");
                }
            } else {
                if (hamburgerIcon !== null) {
                    hamburgerIcon.classList.add("open");
                }
            }
        } else if (windowSize < 1025 && windowSize > 767) {
            document.body.classList.remove("twocolumn-panel");
            if (document.documentElement.getAttribute("data-layout") === "vertical") {
                document.documentElement.setAttribute("data-sidebar-size", "sm");
            }
            if (document.documentElement.getAttribute("data-layout") === "semibox") {
                document.documentElement.setAttribute("data-sidebar-size", "sm");
            }
            if (humberIcon) {
                humberIcon.classList.add("open");
            }
        } else if (windowSize <= 767) {
            document.body.classList.remove("vertical-sidebar-enable");
            if (document.documentElement.getAttribute("data-layout") !== "horizontal") {
                document.documentElement.setAttribute("data-sidebar-size", "lg");
            }
            if (humberIcon) {
                humberIcon.classList.add("open");
            }
        }
    }, [leftsidbarSizeType, sidebarVisibilitytype, layoutType]);

    useEffect(() => {
        window.addEventListener("resize", resizeSidebarMenu, true);
        return () => window.removeEventListener("resize", resizeSidebarMenu, true);
    }, [resizeSidebarMenu]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const initMenu = () => {
            const pathName = process.env.PUBLIC_URL + props.router.location.pathname;
            const ul: any = document.getElementById("navbar-nav");
            const items = ul.getElementsByTagName("a");
            let itemsArray = [...items];
            removeActivation(itemsArray);
            let matchingMenuItem = itemsArray.find((x) => {
                return x.pathname === pathName;
            });
            if (matchingMenuItem) {
                activateParentDropdown(matchingMenuItem);
            }
        };
        if (props.layoutType === "vertical") {
            initMenu();
        }
    }, [props.router.location.pathname, props.layoutType]);

    function activateParentDropdown(item: any) {
        item.classList.add("active");
        let parentCollapseDiv = item.closest(".collapse.menu-dropdown");
        if (parentCollapseDiv) {
            parentCollapseDiv.classList.add("show");
            parentCollapseDiv.parentElement.children[0].classList.add("active");
            parentCollapseDiv.parentElement.children[0].setAttribute("aria-expanded", "true");
            if (parentCollapseDiv.parentElement.closest(".collapse.menu-dropdown")) {
                parentCollapseDiv.parentElement.closest(".collapse").classList.add("show");
                if (parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling)
                    parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling.classList.add("active");
                if (parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling.closest(".collapse")) {
                    parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling.closest(".collapse").classList.add("show");
                    parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling.closest(".collapse").previousElementSibling.classList.add("active");
                }
            }
            return false;
        }
        return false;
    }

    const removeActivation = (items: any) => {
        let actiItems = items.filter((x: any) => x.classList.contains("active"));
        actiItems.forEach((item: any) => {
            if (item.classList.contains("menu-link")) {
                if (!item.classList.contains("active")) {
                    item.setAttribute("aria-expanded", false);
                }
                if (item.nextElementSibling) {
                    item.nextElementSibling.classList.remove("show");
                }
            }
            if (item.classList.contains("nav-link")) {
                if (item.nextElementSibling) {
                    item.nextElementSibling.classList.remove("show");
                }
                item.setAttribute("aria-expanded", false);
            }
            item.classList.remove("active");
        });
    };


    return (
        <React.Fragment>
            {/* menu Items */}
            {(navData || []).map((item: any, key: any) => {
                return (
                    <React.Fragment key={key}>
                        {/* Main Header */}
                        {item['isHeader'] ?
                            <li className="menu-title"><span data-key="t-menu">{props.t(item.label)}</span></li>
                            : (
                                // --- INICIO DEL BLOQUE DE LÓGICA CORREGIDO ---
                                
                                // Caso 1: Es un botón de acción (nuestro botón de tour)
                                item.isAction ? (
                                    <li className="nav-item">
                                        <a
                                            href="#!"
                                            id={item.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (props.startTour) {
                                                    props.startTour();
                                                }
                                            }}
                                            className="nav-link menu-link"
                                        >
                                            <i className={item.icon}></i> <span>{props.t(item.label)}</span>
                                        </a>
                                    </li>
                                )

                                // Caso 2: El ítem está deshabilitado (lógica del candado)
                                : item.disabled ? (
                                    <li className="nav-item">
                                        <a
                                            href="#!"
                                            id={item.id}
                                            onClick={item.onClick}
                                            className="nav-link menu-link"
                                            style={{ cursor: 'pointer', opacity: 0.6 }}
                                        >
                                            <i className={item.icon}></i> <span>{props.t(item.label)}</span>
                                        </a>
                                    </li>
                                )

                                // Caso 3: Es un ítem normal con submenú (tu código original)
                                : item.subItems ? (
                                    <li className="nav-item">
                                        <Link
                                            id={item.id}
                                            onClick={item.click}
                                            className="nav-link menu-link"
                                            to={item.link ? item.link : "/#"}
                                            data-bs-toggle="collapse"
                                        >
                                            <i className={item.icon}></i> <span data-key="t-apps">{props.t(item.label)}</span>
                                        </Link>
                                        <Collapse
                                            className="menu-dropdown"
                                            isOpen={item.stateVariables}
                                            id="sidebarApps">
                                            <ul className="nav nav-sm flex-column test">
                                                {(item.subItems || []).map((subItem: any, key: any) => (
                                                    <React.Fragment key={key}>
                                                         {/* (Tu lógica compleja de sub-items anidados va aquí, sin cambios) */}
                                                    </React.Fragment>
                                                ))}
                                            </ul>
                                        </Collapse>
                                    </li>
                                )
                                
                                // Caso 4: Es un ítem normal y corriente
                                : (
                                    <li className="nav-item">
                                        <Link
                                            id={item.id}
                                            className="nav-link menu-link"
                                            to={item.link ? item.link : "/#"}>
                                            <i className={item.icon}></i> <span>{props.t(item.label)}</span>
                                        </Link>
                                    </li>
                                )
                                // --- FIN DEL BLOQUE DE LÓGICA CORREGIDO ---
                            )
                        }
                    </React.Fragment>
                );
            })}
        </React.Fragment>
    );
};

VerticalLayout.propTypes = {
    location: PropTypes.object,
    t: PropTypes.any,
    startTour: PropTypes.func, // Añadimos la nueva prop para validación
};

export default withRouter(withTranslation()(VerticalLayout));