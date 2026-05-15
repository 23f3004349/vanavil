from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def ensure_bcrypt_safe(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes long")
    return password


def hash_password(password: str):
    ensure_bcrypt_safe(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    ensure_bcrypt_safe(plain_password)
    return pwd_context.verify(plain_password, hashed_password)