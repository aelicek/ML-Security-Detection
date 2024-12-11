import os
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from ollama import AsyncClient
from typing import AsyncGenerator
import contextlib

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    content: str = Field(..., min_length=1, description="Содержимое сообщения")


async def generate_response_content(client: AsyncClient, prompt_text: str, model: str) -> AsyncGenerator[str, None]:
    """
    Generates a stream of responses from the model using ollama.AsyncClient.

    :param client: An AsyncClient instance to interact with the model.
    :param prompt_text: Processed message text.
    :param model: Name of the model to generate the response.
    :yield: Parts of the response from the model.
    """
    queue = asyncio.Queue()

    async def message_generator():
        try:
            async for part in await client.generate(
                model=model,
                prompt=prompt_text,
                stream=True
            ):
                await queue.put(part.response)

            await queue.put(None)

        except Exception as e:
            await queue.put(f"Ошибка при обработке сообщения: {e}")
            await queue.put(None)

    task = asyncio.create_task(message_generator())

    try:
        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            yield chunk
    finally:
        if not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task


@app.post("/send_message")
async def send_message(message: Message, model: str):
    """
    Receives a message from the user, sends it to the model,
    then returns a streaming response with the result of processing.
    """
    processed_text = (
        f"Я получил n сообщений из лога системы: {message.content} "
        "Подскажи, что бы это могло значить и к каким последствиям может привести."
    )

    model_host = os.getenv("MODEL_HOST", "http://ollama:11434")
    client = AsyncClient(host=model_host)

    return StreamingResponse(
        generate_response_content(client, processed_text, model),
        media_type="text/plain"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
