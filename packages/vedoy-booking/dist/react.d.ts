export type VedoyBookingService = {
    id: string;
    name: string;
    duration: number;
    price: number;
    description: string;
    color?: "blue" | "green" | "violet" | "orange";
};
export type VedoyBookingDestination = "digital" | "customer" | "office";
export type VedoyBookingSelection = {
    service: VedoyBookingService;
    plan: string;
    destination: VedoyBookingDestination;
    address: string;
};
export type VedoyBookingConfiguratorProps = {
    services: VedoyBookingService[];
    plans?: string[];
    initialServiceId?: string;
    onChange?: (selection: VedoyBookingSelection) => void;
};
export declare function VedoyBookingConfigurator({ services, plans, initialServiceId, onChange }: VedoyBookingConfiguratorProps): import("react").JSX.Element | null;
