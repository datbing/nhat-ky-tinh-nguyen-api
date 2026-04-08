import { IsString, MinLength } from 'class-validator';

// Login
export class LoginDto {
  @IsString()
  studentId!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

// User
export class UpdatePasswordDto {
  @IsString()
  oldPassword!: string;
  @IsString()
  newPassword!: string;
}


// Mission
export class MissionUploadDto {
  @IsString()
  missionId!: number;

  @IsString()
  studentId!: string;

  @IsString()
  imageLink!: string;

  @IsString()
  note!: string;

  @IsString()
  status!: "pending"
}