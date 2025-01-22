import { IsNumber, IsOptional, IsString } from "class-validator"

export class UpdateDTO {
    @IsString()
    @IsOptional()
    openingHours: string

    @IsNumber()
    @IsOptional()
    deliveryRange: number
}