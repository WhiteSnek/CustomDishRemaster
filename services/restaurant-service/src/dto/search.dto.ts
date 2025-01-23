import {
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
  } from "class-validator";
  import { Type } from "class-transformer";
  
  class AddressDTO {
    @IsString()
    @IsOptional()
    district?: string;
  
    @IsString()
    @IsOptional()
    city?: string;
  
    @IsString()
    @IsOptional()
    state?: string;
  }
  
  export class SearchDTO {
    @IsString()
    @IsOptional()
    name?: string;
  
    @IsString()
    @IsOptional()
    category?: string;
  
    @IsString()
    @IsOptional()
    openingHours?: string;
  
    @IsObject()
    @ValidateNested()
    @Type(() => AddressDTO)
    @IsOptional() 
    address?: AddressDTO;
  }
  