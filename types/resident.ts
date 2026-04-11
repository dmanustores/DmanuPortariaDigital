export interface HouseholdMember {
  nome: string;
  rg?: string;
  cpf?: string;
  parentesco: string;
  isBaby?: boolean;
}

export interface Vehicle {
  modelo: string;
  cor: string;
  placa: string;
}

export interface ServiceProvider {
  nome: string;
  rg: string;
}

export interface EmergencyContact {
  nome: string;
  fone: string;
}

export type ResidentType = 'LOCATARIO' | 'PROPRIETARIO';
export type InvoiceDelivery = 'CONDOMINIO' | 'OUTRO';

export interface InvoiceAddress {
  nome: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Resident {
  id: string;
  bloco: string;
  apto: string;
  tipo: ResidentType;
  nome: string;
  celular: string;
  fone?: string;
  foneComercial?: string;
  email: string;
  localTrabalho?: string;
  enderecoComercial?: string;
  cpf: string;
  rg: string;
  householdMembers: HouseholdMember[];
  vehicles: Vehicle[];
  serviceProviders: ServiceProvider[];
  emergencyContact: EmergencyContact;
  invoiceDelivery: InvoiceDelivery;
  invoiceAddress?: InvoiceAddress;
  createdAt: string;
}
