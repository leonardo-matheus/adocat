export type Pet = {
    id: string;
    name: string;
    species: 'cat' | 'dog';
    sex: 'female' | 'male';
    ageGroup: 'kitten' | 'adult' | 'senior';
    ageLabel: string;
    size: 'small' | 'medium' | 'large';
    city: string;
    image: string;
    description: string;
    temperament: string[];
    vaccinated: boolean;
    neutered: boolean;
    status: 'available' | 'treatment' | 'adopted';
    vaccineDate?: string;
    neuterDate?: string;
};

export type Campaign = {
    id: string;
    title: string;
    description: string;
    image: string;
    target: number;
    raised: number;
    status: 'active' | 'completed';
    category: string;
    externalUrl?: string;
};

export type AdoptionApplication = {
    id: string;
    petId: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    homeType: 'house' | 'apartment';
    screened: boolean;
    otherPets: string;
    routine: string;
    consent: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'contacted';
    createdAt: string;
};

export type VolunteerApplication = {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    interests: string[];
    availability: string;
    message: string;
    consent: boolean;
    status: 'pending' | 'contacted' | 'active';
    createdAt: string;
};

export type PublicConfig = {
    pixConfigured: boolean;
    pixKey?: string | null;
    donationRecipient?: string | null;
    donationCity?: string | null;
};

export type Session = { authenticated: boolean; csrfToken?: string };
export type AdoptionPayload = Omit<AdoptionApplication, 'id' | 'status' | 'createdAt'>;
export type VolunteerPayload = Omit<VolunteerApplication, 'id' | 'status' | 'createdAt'>;
