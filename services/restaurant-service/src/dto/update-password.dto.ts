import { IsEmail, IsNotEmpty, IsString } from "class-validator"

export class UpdatePasswordDTO {
    @IsEmail()
    @IsNotEmpty()
    email: string
    @IsString()
    @IsNotEmpty()
    newPassword: string
}