import { IsNotEmpty } from 'class-validator';

export class Location {
  @IsNotEmpty()
  latitude: number;
  @IsNotEmpty()
  longitude: number;
}

export class User {
  id?: string;
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  interests: string[];
  @IsNotEmpty()
  expertises: string[];
  @IsNotEmpty()
  location: Location;
}
