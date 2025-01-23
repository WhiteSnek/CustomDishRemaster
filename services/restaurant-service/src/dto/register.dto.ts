import { IsArray, IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class AddressDTO {
    @IsString()
    @IsNotEmpty()
    houseNo: string;

    @IsString()
    @IsNotEmpty()
    streetNo: string;

    @IsString()
    @IsNotEmpty()
    district: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    state: string;

    @IsNumber()
    @IsNotEmpty()
    postalCode: number;
}

export class RegisterDTO {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsArray()
    @IsNotEmpty()
    mobileNumber: string[];

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsNotEmpty()
    openingHours: string;

    @IsNumber()
    @IsNotEmpty()
    deliveryRange: number;

    @IsObject()
    @ValidateNested()
    @Type(() => AddressDTO)
    @IsNotEmpty()
    address: AddressDTO;
}
