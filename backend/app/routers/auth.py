from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_db
from app.core.security import verify_password, create_access_token, hash_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Issue a JWT for a dashboard user (normal user or security analyst/admin)."""
    db = get_db()
    user = await db.users.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    token = create_access_token({"sub": user["username"], "role": user.get("role_name", "user")})
    return {"access_token": token, "token_type": "bearer", "role": user.get("role_name", "user")}


@router.post("/register", status_code=201)
async def register(username: str, password: str, full_name: str = "", email: str = ""):
    """Convenience endpoint for seeding the first admin/user during setup.
    In production, gate this behind an existing admin session."""
    db = get_db()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=409, detail="Username already exists")
    await db.users.insert_one({
        "username": username,
        "password_hash": hash_password(password),
        "full_name": full_name,
        "email": email,
        "role_name": "user",
        "is_active": True,
    })
    return {"message": "User created"}
