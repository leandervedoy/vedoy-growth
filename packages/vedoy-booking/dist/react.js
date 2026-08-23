"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
const labels = {
    digital: { title: "Digitalt", description: "Telefon, Teams eller sikker skjermdeling" },
    customer: { title: "Hos deg", description: "Hjemmebesøk eller hos virksomheten" },
    office: { title: "Hos Vedøy", description: "Møte på Bleikemyr i Haugesund" },
};
export function VedoyBookingConfigurator({ services, plans = ["Ingen plan", "Enkelttime", "Trygg", "Growth"], initialServiceId, onChange }) {
    const initial = services.find((item) => item.id === initialServiceId) || services[0];
    const [service, setService] = useState(initial);
    const [plan, setPlan] = useState(plans[0]);
    const [destination, setDestination] = useState("digital");
    const [address, setAddress] = useState("");
    const selection = useMemo(() => ({ service, plan, destination, address }), [service, plan, destination, address]);
    function change(next) { const value = { ...selection, ...next }; if (next.service)
        setService(next.service); if (next.plan)
        setPlan(next.plan); if (next.destination)
        setDestination(next.destination); if (next.address !== undefined)
        setAddress(next.address); onChange?.(value); }
    if (!initial)
        return null;
    return _jsxs("aside", { className: "vedoy-booking-configurator", children: [_jsx("small", { children: "VELG TJENESTE" }), _jsx("h2", { children: "Ved\u00F8y Booking" }), _jsx("p", { children: "Velg tjeneste, pris og hvor avtalen skal skje." }), _jsx("div", { className: "vedoy-booking-services", children: services.map((item) => _jsxs("button", { type: "button", className: `vedoy-booking-service ${service.id === item.id ? "is-selected" : ""}`, "aria-pressed": service.id === item.id, onClick: () => change({ service: item }), children: [_jsx("span", { "aria-hidden": "true", className: `vedoy-booking-service-line ${item.color || "blue"}` }), _jsx("strong", { children: item.name }), _jsxs("small", { children: [item.duration, " min \u00B7 ", item.price.toLocaleString("nb-NO"), " kr"] }), _jsx("p", { children: item.description })] }, item.id)) }), _jsxs("section", { className: "vedoy-booking-section", children: [_jsx("small", { children: "PLASSERING" }), _jsx("div", { className: "vedoy-booking-destinations", children: Object.keys(labels).map((item) => _jsxs("button", { type: "button", "aria-pressed": destination === item, className: destination === item ? "is-selected" : "", onClick: () => change({ destination: item }), children: [_jsx("strong", { children: labels[item].title }), _jsx("span", { children: labels[item].description })] }, item)) }), destination === "customer" && _jsxs("label", { children: ["Adresse eller sted", _jsx("input", { value: address, onChange: (event) => change({ address: event.target.value }), placeholder: "F.eks. Smedasundet 66, Haugesund" })] })] }), _jsxs("section", { className: "vedoy-booking-section", children: [_jsx("small", { children: "VELG PLAN" }), _jsx("div", { className: "vedoy-booking-plans", children: plans.map((item) => _jsx("button", { type: "button", "aria-pressed": plan === item, className: plan === item ? "is-selected" : "", onClick: () => change({ plan: item }), children: item }, item)) })] }), _jsxs("div", { className: "vedoy-booking-price", children: [_jsx("span", { children: "Estimert pris" }), _jsxs("strong", { children: [service.price.toLocaleString("nb-NO"), " kr"] }), _jsxs("small", { children: [service.duration, " min \u00B7 ", labels[destination].title] })] })] });
}
