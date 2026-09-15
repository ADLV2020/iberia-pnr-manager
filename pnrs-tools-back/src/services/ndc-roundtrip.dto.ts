// src/services/ndc-roundtrip.dto.ts

export type PassengerType = 'ADULT' | 'CHILD' | 'YOUTH' | 'INFANT';
export type GenderType = 'MALE' | 'FEMALE';
export type TitleType = 'MR' | 'MRS' | 'MS';

export interface PassengerCountDto {
  passengerType: PassengerType;
  count: number;
}

export interface PassengerInfoDto {
  firstName: string;
  firstSurname: string;
  birthDate: string; // YYYY-MM-DD
  gender: GenderType;
  title: TitleType;
}

export interface CreateNdcRoundTripDto {
  origin: string; // Ej: "MAD"
  destination: string; // Ej: "BRU"
  outboundDate: string; // YYYY-MM-DD
  inboundDate: string; // YYYY-MM-DD
  passengers: PassengerCountDto[];
  passengerDetails: PassengerInfoDto[];
  emailContact: string;
  phoneContact: string;
  marketCode?: string;
  preferredCabin?: string;
}
