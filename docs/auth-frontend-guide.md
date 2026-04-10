# Auth Frontend Guide

Base URL localda:

```text
http://localhost:4000
```

Swagger:

```text
http://localhost:4000/api/docs
```

## Umumiy Qoidalar

- Auth endpointlar public, `Bearer` token kerak emas.
- Protected endpointlar uchun header yuboring:

```http
Authorization: Bearer <accessToken>
```

- Telefon raqam backendda normalize qilinadi. Front `+998901234567` formatida yuborgani yaxshi.
- OTP muddati 120 sekund.
- `accessToken` default muddati 12 kun.
- `refreshToken` default muddati 32 kun.
- Device fieldlar optional. Push notification kerak bo'lsa `deviceId` va `fcmToken` yuboring.

Device fieldlar:

```json
{
  "deviceId": "android-7f3aa8d9-11c2-4d72-b8b8-001",
  "fcmToken": "firebase_token_min_20_chars",
  "deviceName": "Samsung S23",
  "platform": "ANDROID"
}
```

`platform` qiymatlari:

```text
ANDROID, IOS, WEB, UNKNOWN
```

## 1. OTP Yuborish

```http
POST /auth/send-otp
```

Body:

```json
{
  "phone": "+998901234567",
  "purpose": "REGISTER"
}
```

`purpose` qiymatlari:

```text
REGISTER
LOGIN
RESET_PASSWORD
```

Response:

```json
{
  "message": "OTP yuborildi"
}
```

Purpose bo'yicha backend tekshiradi:

- `REGISTER`: phone user/companyda band bo'lmasligi kerak.
- `LOGIN`: phone user yoki company sifatida mavjud bo'lishi kerak.
- `RESET_PASSWORD`: phone user yoki company sifatida mavjud bo'lishi kerak.

## 2. Ro'yxatdan O'tish

Avval `POST /auth/send-otp` ni `REGISTER` bilan chaqiring.

```http
POST /auth/register
```

Body:

```json
{
  "phone": "+998901234567",
  "firstName": "Ali",
  "lastName": "Valiyev",
  "password": "strong-password",
  "otp": "123456",
  "regionId": 1,
  "deviceId": "android-7f3aa8d9-11c2-4d72-b8b8-001",
  "fcmToken": "firebase_token_min_20_chars",
  "deviceName": "Samsung S23",
  "platform": "ANDROID"
}
```

Response:

```json
{
  "entityType": "USER",
  "user": {
    "id": 1,
    "phone": "+998901234567",
    "firstName": "Ali",
    "lastName": "Valiyev",
    "role": "USER"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

Front saqlashi kerak:

- `accessToken`
- `refreshToken`
- `entityType`
- `user` yoki `company`

## 3. OTP Bilan Login

Avval `POST /auth/send-otp` ni `LOGIN` bilan chaqiring.

```http
POST /auth/login
```

Body:

```json
{
  "phone": "+998901234567",
  "otp": "123456",
  "deviceId": "android-7f3aa8d9-11c2-4d72-b8b8-001",
  "fcmToken": "firebase_token_min_20_chars",
  "deviceName": "Samsung S23",
  "platform": "ANDROID"
}
```

User response:

```json
{
  "entityType": "USER",
  "user": {},
  "accessToken": "...",
  "refreshToken": "..."
}
```

Company response:

```json
{
  "entityType": "COMPANY",
  "company": {},
  "accessToken": "...",
  "refreshToken": "..."
}
```

Front `entityType` bo'yicha profilni ajratadi.

## 4. Parol Bilan Login

```http
POST /auth/login2
```

Body:

```json
{
  "phone": "+998901234567",
  "password": "strong-password",
  "deviceId": "android-7f3aa8d9-11c2-4d72-b8b8-001",
  "fcmToken": "firebase_token_min_20_chars",
  "deviceName": "Samsung S23",
  "platform": "ANDROID"
}
```

Response `POST /auth/login` bilan bir xil.

## 5. Parolni Tiklash

Avval `POST /auth/send-otp` ni `RESET_PASSWORD` bilan chaqiring.

```http
POST /auth/reset-password
```

Body:

```json
{
  "phone": "+998901234567",
  "otp": "123456",
  "password": "new-strong-password"
}
```

Response:

```json
{
  "message": "Parol yangilandi",
  "entityType": "USER"
}
```

Company uchun:

```json
{
  "message": "Parol yangilandi",
  "entityType": "COMPANY"
}
```

Resetdan keyin front foydalanuvchini login sahifasiga olib o'tsin yoki `login2` bilan qayta login qildirsin.

## 6. Refresh Token

```http
POST /auth/refresh
```

Body:

```json
{
  "refreshToken": "..."
}
```

Response login response bilan bir xil. Front yangi `accessToken` va `refreshToken`ni eskilarining o'rniga yozadi.

## Tavsiya Qilingan Front Flow

Register:

```text
send-otp REGISTER -> register -> tokenlarni saqlash -> app ichiga o'tish
```

OTP login:

```text
send-otp LOGIN -> login -> tokenlarni saqlash -> app ichiga o'tish
```

Password login:

```text
login2 -> tokenlarni saqlash -> app ichiga o'tish
```

Reset password:

```text
send-otp RESET_PASSWORD -> reset-password -> login2
```

## Ko'p Uchraydigan Xatolar

`400`:

```json
{
  "message": "SMS yuborishda xatolik yuz berdi"
}
```

SMS provider envlari yoki provider javobini tekshiring.

`401`:

```json
{
  "message": "OTP notogri"
}
```

OTP noto'g'ri yoki parol noto'g'ri.

`404`:

```json
{
  "message": "OTP topilmadi yoki muddati tugagan"
}
```

OTP muddati tugagan. Qayta `send-otp` qilish kerak.

`409`:

```json
{
  "message": "Bu telefon raqam user yoki company uchun allaqachon band"
}
```

Register vaqtida phone oldin ishlatilgan.
