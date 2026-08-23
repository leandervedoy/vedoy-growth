"use client";

import { useMemo, useState } from "react";

export type VedoyBookingService = { id: string; name: string; duration: number; price: number; description: string; color?: "blue" | "green" | "violet" | "orange" };
export type VedoyBookingDestination = "digital" | "customer" | "office";
export type VedoyBookingSelection = { service: VedoyBookingService; plan: string; destination: VedoyBookingDestination; address: string };
export type VedoyBookingConfiguratorProps = { services: VedoyBookingService[]; plans?: string[]; initialServiceId?: string; onChange?: (selection: VedoyBookingSelection) => void };

const labels: Record<VedoyBookingDestination, { title: string; description: string }> = {
  digital: { title: "Digitalt", description: "Telefon, Teams eller sikker skjermdeling" },
  customer: { title: "Hos deg", description: "Hjemmebesøk eller hos virksomheten" },
  office: { title: "Hos Vedøy", description: "Møte på Bleikemyr i Haugesund" },
};

export function VedoyBookingConfigurator({ services, plans = ["Ingen plan", "Enkelttime", "Trygg", "Growth"], initialServiceId, onChange }: VedoyBookingConfiguratorProps) {
  const initial = services.find((item) => item.id === initialServiceId) || services[0];
  const [service, setService] = useState(initial);
  const [plan, setPlan] = useState(plans[0]);
  const [destination, setDestination] = useState<VedoyBookingDestination>("digital");
  const [address, setAddress] = useState("");
  const selection = useMemo(() => ({ service, plan, destination, address }), [service, plan, destination, address]);
  function change(next: Partial<VedoyBookingSelection>) { const value = { ...selection, ...next }; if (next.service) setService(next.service); if (next.plan) setPlan(next.plan); if (next.destination) setDestination(next.destination); if (next.address !== undefined) setAddress(next.address); onChange?.(value); }
  if (!initial) return null;
  return <aside className="vedoy-booking-configurator">
    <small>VELG TJENESTE</small><h2>Vedøy Booking</h2><p>Velg tjeneste, pris og hvor avtalen skal skje.</p>
    <div className="vedoy-booking-services">{services.map((item) => <button type="button" key={item.id} className={`vedoy-booking-service ${service.id === item.id ? "is-selected" : ""}`} aria-pressed={service.id === item.id} onClick={() => change({ service: item })}><span aria-hidden="true" className={`vedoy-booking-service-line ${item.color || "blue"}`} /><strong>{item.name}</strong><small>{item.duration} min · {item.price.toLocaleString("nb-NO")} kr</small><p>{item.description}</p></button>)}</div>
    <section className="vedoy-booking-section"><small>PLASSERING</small><div className="vedoy-booking-destinations">{(Object.keys(labels) as VedoyBookingDestination[]).map((item) => <button type="button" key={item} aria-pressed={destination === item} className={destination === item ? "is-selected" : ""} onClick={() => change({ destination: item })}><strong>{labels[item].title}</strong><span>{labels[item].description}</span></button>)}</div>{destination === "customer" && <label>Adresse eller sted<input value={address} onChange={(event) => change({ address: event.target.value })} placeholder="F.eks. Smedasundet 66, Haugesund" /></label>}</section>
    <section className="vedoy-booking-section"><small>VELG PLAN</small><div className="vedoy-booking-plans">{plans.map((item) => <button type="button" key={item} aria-pressed={plan === item} className={plan === item ? "is-selected" : ""} onClick={() => change({ plan: item })}>{item}</button>)}</div></section>
    <div className="vedoy-booking-price"><span>Estimert pris</span><strong>{service.price.toLocaleString("nb-NO")} kr</strong><small>{service.duration} min · {labels[destination].title}</small></div>
  </aside>;
}
