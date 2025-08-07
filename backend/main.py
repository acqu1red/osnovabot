from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import json
import os
import requests
from config import SUBSCRIPTIONS_PATH, PAYMENTS_PATH, QUESTIONS_PATH, LAVA_API_KEY, ADMIN_IDS, CHANNEL_ID

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class Subscription(BaseModel):
    user_id: int
    username: str
    email: EmailStr
    tariff: str
    start_date: str
    end_date: str
    payment_id: str

class Payment(BaseModel):
    user_id: int
    username: str
    email: EmailStr
    tariff: str
    amount: int
    method: str
    payment_id: str
    status: str
    created_at: str

class Question(BaseModel):
    user_id: int
    username: str
    message: str
    email: EmailStr = None
    file_url: str = None
    answer: str = None
    is_admin: bool = False
    created_at: str = None

# --- Utils ---
def read_json(path):
    if not os.path.exists(path):
        return []
    with open(path, 'r') as f:
        return json.load(f)

def write_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# --- Subscriptions ---
@app.get("/subscriptions")
def get_subscriptions():
    return read_json(SUBSCRIPTIONS_PATH)

@app.post("/subscriptions")
def add_subscription(sub: Subscription):
    data = read_json(SUBSCRIPTIONS_PATH)
    data.append(sub.dict())
    write_json(SUBSCRIPTIONS_PATH, data)
    return {"status": "ok"}

# --- Payments ---
@app.get("/payments")
def get_payments():
    return read_json(PAYMENTS_PATH)

@app.post("/payments")
def add_payment(payment: Payment):
    data = read_json(PAYMENTS_PATH)
    data.append(payment.dict())
    write_json(PAYMENTS_PATH, data)
    return {"status": "ok"}

# --- Questions ---
@app.get("/questions")
def get_questions(user_id: int = None, admin: bool = False):
    data = read_json(QUESTIONS_PATH)
    if admin:
        return data
    if user_id:
        return [q for q in data if q.get('user_id') == user_id]
    return []

@app.post("/questions")
def post_question(q: Question):
    data = read_json(QUESTIONS_PATH)
    q.created_at = q.created_at or ""
    data.append(q.dict())
    write_json(QUESTIONS_PATH, data)
    # Отправка в Telegram-канал (через бота)
    send_to_telegram_channel(q)
    return {"status": "ok"}

@app.post("/questions/answer")
def answer_question(user_id: int, answer: str):
    data = read_json(QUESTIONS_PATH)
    found = False
    for q in data:
        if q['user_id'] == user_id and not q.get('answer'):
            q['answer'] = answer
            found = True
    write_json(QUESTIONS_PATH, data)
    if found:
        notify_user_answer(user_id, answer)
    return {"status": "ok"}

# --- File upload for questions ---
@app.post("/questions/upload")
def upload_file(file: UploadFile = File(...)):
    path = os.path.join("uploads", file.filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return {"file_url": f"/uploads/{file.filename}"}

# --- LAVA Payment Integration ---
@app.post("/lava/create_invoice")
def create_lava_invoice(amount: int, order_id: str, email: str, username: str, tariff: str, method: str):
    url = "https://api.lava.top/api/v2/invoice/create"
    headers = {"Authorization": f"Bearer {LAVA_API_KEY}"}
    payload = {
        "amount": amount,
        "orderId": order_id,
        "comment": f"CATALYST CLUB {tariff}",
        "email": email,
        "customFields": {"username": username, "tariff": tariff, "method": method}
    }
    r = requests.post(url, json=payload, headers=headers)
    if r.status_code == 200:
        return r.json()
    raise HTTPException(status_code=400, detail=r.text)

# --- Telegram Integration ---
BOT_WEBHOOK_URL = os.getenv('BOT_WEBHOOK_URL', 'http://localhost:8001')

def send_to_telegram_channel(q: Question):
    try:
        payload = {
            "user_id": q.user_id,
            "username": q.username,
            "message": q.message,
            "file_url": q.file_url
        }
        requests.post(f"{BOT_WEBHOOK_URL}/webhook_question", json=payload, timeout=3)
    except Exception as e:
        print(f"[send_to_telegram_channel] Error: {e}")

def notify_user_answer(user_id: int, answer: str):
    try:
        payload = {"user_id": user_id, "answer": answer}
        requests.post(f"{BOT_WEBHOOK_URL}/webhook_answer", json=payload, timeout=3)
    except Exception as e:
        print(f"[notify_user_answer] Error: {e}")

@app.get("/oferta")
def get_oferta():
    return FileResponse(os.path.join(os.path.dirname(__file__), '../miniapp/public/ОФЕРТА.pdf'))