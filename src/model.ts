export interface Location {
    latitude: number;
    longitude: number;
};

export interface User {
    id?: string;
    name: string;
    interests: string[];
    expertises: string[];
    location: Location
};
