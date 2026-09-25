from fastapi import FastAPI

from app.api.share import router as share_router
from app.api.v1.public import router as public_router

app = FastAPI(title="Monorepo API", version="0.1.0")
app.include_router(public_router, prefix="/api/v1", tags=["public"])
app.include_router(share_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Frontend and backend are connected."}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
