from fastapi import APIRouter
from pydantic import BaseModel


class MessageBase(BaseModel):
    message: str


class MessageModel(MessageBase):
    id: int

    class Config:
        orm_mode = True


class AppResponse:
    def __init__(self):
        self.response = "Testmessage from FastAPI"

    def set_response(self, new_response: str):
        self.response = new_response

    def get_response(self):
        return self.response




message = AppResponse()
server = APIRouter(prefix="/message", tags=["message"])


@server.get("/response")
async def get_prompt_respone():
    return message.get_response()
