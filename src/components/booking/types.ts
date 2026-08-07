export interface PublicService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  services: PublicService[];
}

export interface PublicProfessional {
  id: string;
  name: string;
}
