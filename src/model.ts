export interface Location {
    latitude: number;
    longitude: Number;
};

export interface User {
    id?: string;
    name: string;
    interests: string[];
    expertises: string[];
    location: Location
};
