import type { Vehicle } from '../types';

// Usable capacities, consumption and peak DC power are rounded,
// demo-grade figures — close to real-world but not official specs.
export const vehicles: Vehicle[] = [
  { id: 'tesla-model-3', name: 'Tesla Model 3', make: 'Tesla', model: 'Model 3', trim: 'Long Range RWD', batteryKWh: 60, efficiencyWhKm: 142, maxDcKW: 170, color: '#2B4CC8', colorName: 'Deep Blue', body: 'sedan' },
  { id: 'tesla-model-y', name: 'Tesla Model Y', make: 'Tesla', model: 'Model Y', trim: 'Long Range AWD', batteryKWh: 75, efficiencyWhKm: 158, maxDcKW: 250, color: '#E9ECEF', colorName: 'Pearl White', body: 'suv' },
  { id: 'porsche-taycan', name: 'Porsche Taycan', make: 'Porsche', model: 'Taycan', trim: '4S Performance+', batteryKWh: 97, efficiencyWhKm: 195, maxDcKW: 320, color: '#B8325B', colorName: 'Frozen Berry', body: 'sport' },
  { id: 'hyundai-ioniq-5', name: 'Hyundai Ioniq 5', make: 'Hyundai', model: 'Ioniq 5', trim: 'Long Range AWD', batteryKWh: 84, efficiencyWhKm: 178, maxDcKW: 235, color: '#3E8C8A', colorName: 'Digital Teal', body: 'suv' },
  { id: 'kia-ev6', name: 'Kia EV6', make: 'Kia', model: 'EV6', trim: 'GT-Line', batteryKWh: 84, efficiencyWhKm: 172, maxDcKW: 240, color: '#B42318', colorName: 'Runway Red', body: 'sport' },
  { id: 'bmw-i4', name: 'BMW i4', make: 'BMW', model: 'i4', trim: 'eDrive40', batteryKWh: 81, efficiencyWhKm: 168, maxDcKW: 205, color: '#1D4ED8', colorName: 'Portimão Blue', body: 'sedan' },
  { id: 'mercedes-eqe', name: 'Mercedes EQE', make: 'Mercedes-Benz', model: 'EQE', trim: '350+', batteryKWh: 89, efficiencyWhKm: 170, maxDcKW: 170, color: '#1F2937', colorName: 'Obsidian Black', body: 'sedan' },
  { id: 'audi-q8-etron', name: 'Audi Q8 e-tron', make: 'Audi', model: 'Q8 e-tron', trim: '55 quattro', batteryKWh: 106, efficiencyWhKm: 225, maxDcKW: 170, color: '#6B7280', colorName: 'Chronos Grey', body: 'suv' },
  { id: 'byd-seal', name: 'BYD Seal', make: 'BYD', model: 'Seal', trim: 'Excellence AWD', batteryKWh: 82, efficiencyWhKm: 165, maxDcKW: 150, color: '#7DB3E8', colorName: 'Arctic Blue', body: 'sedan' },
  { id: 'lucid-air', name: 'Lucid Air', make: 'Lucid', model: 'Air', trim: 'Grand Touring', batteryKWh: 112, efficiencyWhKm: 145, maxDcKW: 300, color: '#C9A45C', colorName: 'Eureka Gold', body: 'sport' },
];

export const vehicleById = (id: string) => vehicles.find((v) => v.id === id) ?? vehicles[0];
