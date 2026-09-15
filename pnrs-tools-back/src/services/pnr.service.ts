// src/services/pnr.service.ts

export interface FlightSegment {
    from: string; to: string; flight: string; class: string; date: string; time: string; rerouting: string; type: string;
}

const formatDate = (date: string): string => {
    if (date.length !== 8) return date;
    return `${date.substring(4, 8)}-${date.substring(2, 4)}-${date.substring(0, 2)}`;
};

const formatFlight = (flight: string): string => flight.replace(/\D/g, '').slice(-4);

export const generateApiString = (
    pnr: string, 
    flight: string, 
    flightClass: string, 
    date: string, 
    from: string, 
    to: string, 
    rerouting: string, 
    type: string, 
    lastName: string
): string => {
    return `${pnr};${formatFlight(flight)};${flightClass || ''};${formatDate(date)};${from};${to};${rerouting || ''};${type || ''};${lastName}`;
};
