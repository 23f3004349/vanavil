from pydantic import BaseModel, EmailStr, Field, validator


def ensure_password_bytes(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes long")
    return password


class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)

    _validate_password = validator("password", allow_reuse=True)(ensure_password_bytes)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)

    _validate_password = validator("password", allow_reuse=True)(ensure_password_bytes)