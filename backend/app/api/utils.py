from typing import Annotated

from fastapi import Header, HTTPException, status

from app.core.security import verify_firebase_token


async def get_firebase_claims(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty token")
    try:
        return verify_firebase_token(token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e
