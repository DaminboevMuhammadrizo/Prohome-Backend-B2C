# ProHome Backend

NestJS + Prisma asosidagi backend. Frontend va admin panel uchun tayyor API’lar shu loyihada ishlaydi.

## Ishga tushirish

```bash
npm install
npm run build
npm run start:dev
```

Swagger:

```text
http://localhost:4000/api/docs
```

Asosiy base URL:

```text
http://localhost:4000
```

## `.env`

Minimal kerak bo‘ladigan o‘zgaruvchilar:

```env
DATABASE_URL="postgresql://postgres:2008@localhost:5432/prohome?schema=public"
PORT=4000
HOST=localhost
APP_BASE_URL=http://localhost:4000

ADMIN_PHONE=+998901234567
ADMIN_PASSWORD=Admin123
ADMIN_ROLE=SUPERADMIN

FIREBASE_PROJECT_ID=prohome-b2c
FIREBASE_SERVICE_ACCOUNT_PATH=/home/kali/Downloads/Telegram Desktop/prohome-b2c-firebase-adminsdk-fbsvc-daa345354a.json
```

`ADMIN_PHONE` yoki `ADMIN_PASSWORD` berilmasa, seed avtomatik quyidagini yaratadi:

- `phone`: `+998901234567`
- `password`: `Admin123`
- `role`: `SUPERADMIN`

## Seeder

Admin user `SeederService` ichida app start bo‘lganda yaratiladi.

Login uchun:

```http
POST /auth/login2
Content-Type: application/json
```

```json
{
  "phone": "+998901234567",
  "password": "Admin123"
}
```

## Frontend uchun muhim qoida

- Himoyalangan endpointlar uchun `Authorization: Bearer <accessToken>` yuboriladi.
- Banner va apartment rasmlari serverda saqlanadi.
- Saqlangan rasm URL’i odatda `image/<filename>` ko‘rinishida qaytadi.
- Brauzerda ishlatish uchun `APP_BASE_URL` bilan birga ishlating: `http://localhost:4000/image/<filename>` yoki backend qaytargan relative pathni base URL bilan birlashtiring.
- Firebase push notification ishlashi uchun frontend foydalanuvchidan notification permission olishi va `fcmToken` ni backendga yuborishi kerak.

## Firebase holati

Backendda Firebase Admin ulandi va `Firebase Admin muvaffaqiyatli ishga tushdi` logi bilan tekshirildi.

Ishlaydigan qismlar:

- service account `.env` orqali ulandi
- register/login paytida device saqlash tayyor
- alohida device CRUD endpointlari tayyor
- notification bazaga yoziladi
- notification userning barcha aktiv qurilmalariga yuboriladi

Bazadagi yangi jadvallar:

- `user_devices`
- `notifications`

## Auth API

### 1. OTP yuborish

```http
POST /auth/send-otp
```

```json
{
  "phone": "+998901234567"
}
```

### 2. Register

```http
POST /auth/register
```

Frontend flow:

1. `send-otp` chaqiriladi.
2. Foydalanuvchi OTP kiritadi.
3. `register` ga phone + otp + password yuboriladi.

Register paytida device yuborish mumkin:

```json
{
  "phone": "+998901234567",
  "firstName": "Ali",
  "lastName": "Valiyev",
  "password": "secret123",
  "otp": "123456",
  "regionId": 1,
  "deviceId": "android-device-001",
  "fcmToken": "firebase-device-token",
  "deviceName": "Samsung S23",
  "platform": "ANDROID"
}
```

### 3. Login

- `POST /auth/login` - OTP bilan login
- `POST /auth/login2` - parol bilan login
- `POST /auth/refresh` - refresh token orqali yangi token olish

Login va login2 da ham device yuborish mumkin:

```json
{
  "phone": "+998901234567",
  "password": "Admin123",
  "deviceId": "web-device-001",
  "fcmToken": "firebase-device-token",
  "deviceName": "Chrome on Linux",
  "platform": "WEB"
}
```

## Front uchun asosiy public endpointlar

### Regions

- `GET /regions`
- `GET /regions/:id`

### Apartment categories

- `GET /apartment-categories`
- `GET /apartment-categories/:id`

### Apartments

- `GET /apartments`
- `GET /apartments/sold/all`
- `GET /apartments/:id`
- `POST /apartments/:id/view`
- `GET /apartments/:id/interaction` - auth kerak
- `POST /apartments/:id/like` - auth kerak

### Complexes

- `GET /complexes`
- `GET /complexes/:id`

### Companies

- `GET /companies`
- `GET /companies/:id`
- `POST /companies/:id/view`

### Banners

- `GET /banners`
- `GET /banners/:id`

### Dashboard

- `GET /dashboard/summary`

### Masters va rating

- `GET /master-profiles`
- `GET /master-profiles/:id`
- `GET /ratings`
- `GET /ratings/master/:masterProfileId`

## User cabinet uchun endpointlar

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/favorite-apartments`
- `GET /users/me/saved-masters`

## Admin panel uchun endpointlar

### Regions

- `POST /regions`
- `PATCH /regions/:id`
- `DELETE /regions/:id`

### Apartment categories

- `POST /apartment-categories`
- `PATCH /apartment-categories/:id`
- `DELETE /apartment-categories/:id`

### Companies

- `POST /companies`
- `PATCH /companies/:id`
- `PATCH /companies/:id/status`
- `DELETE /companies/:id`

### Complexes

- `POST /complexes`
- `PATCH /complexes/:id`
- `DELETE /complexes/:id`

### Apartment layouts

- `POST /apartment-layouts`
- `PATCH /apartment-layouts/:id`
- `DELETE /apartment-layouts/:id`

### Apartments

- `POST /apartments`
- `PATCH /apartments/:id`
- `PATCH /apartments/:id/status`
- `DELETE /apartments/:id`

### Banners

- `GET /banners/admin/all`
- `POST /banners`
- `PATCH /banners/:id`
- `PATCH /banners/:id/status`
- `DELETE /banners/:id`

### Users

- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/block`
- `PATCH /users/:id/archive`
- `DELETE /users/:id`

### Job categories

- `GET /job-categories`
- `POST /job-categories`
- `PATCH /job-categories/:id`
- `PATCH /job-categories/:id/archive`
- `PATCH /job-categories/:id/unarchive`
- `PATCH /job-categories/:id/status`
- `PATCH /job-categories/:id/status-toggle`
- `DELETE /job-categories/:id`

## Uy qo‘shish: endi 3 ta rasm bilan ishlaydi

`POST /apartments` va `PATCH /apartments/:id` endi `multipart/form-data` qabul qiladi.

Muhim qoidalar:

- `images` nomli field ishlatiladi
- create paytida `kamida 3 ta rasm` yuborilishi shart
- update paytida yangi rasmlar yuborilsa, `1 ta yoki undan ko‘p` yuborish mumkin
- agar update paytida yangi rasm yuborilsa, eski rasmlar almashtiriladi

### Kerakli fieldlar

- `titleUz`
- `titleUzCyrl`
- `titleRu`
- `price`
- `area`
- `roomCount`
- `regionId`
- `categoryId`
- `address`
- `images`

### Ixtiyoriy fieldlar

- `descriptionUz`
- `descriptionUzCyrl`
- `descriptionRu`
- `floor`
- `totalFloors`
- `landArea`
- `isCottage`
- `listingType`
- `complexId`
- `layoutId`

### Frontend `FormData` namunasi

```ts
const formData = new FormData();

formData.append('titleUz', "Yangi uy");
formData.append('titleUzCyrl', "Янги уй");
formData.append('titleRu', "Новая квартира");
formData.append('price', '85000');
formData.append('area', '72');
formData.append('roomCount', '3');
formData.append('regionId', '1');
formData.append('categoryId', '2');
formData.append('address', "Toshkent shahri");
formData.append('isCottage', 'false');
formData.append('listingType', 'SOTISH');

formData.append('images', file1);
formData.append('images', file2);
formData.append('images', file3);

await fetch('http://localhost:4000/apartments', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### Update namunasi

```ts
const formData = new FormData();
formData.append('price', '91000');
formData.append('images', newFile1);
formData.append('images', newFile2);
formData.append('images', newFile3);

await fetch('http://localhost:4000/apartments/12', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

## Banner upload

`POST /banners` va `PATCH /banners/:id` ham `multipart/form-data` ishlatadi.

- fayl field nomi: `image`
- admin token kerak

## Frontend integration tavsiyasi

### Public sayt

1. Header yoki splash ochilganda `GET /regions`, `GET /apartment-categories`, `GET /banners`.
2. Listing sahifasida `GET /apartments`.
3. Detail sahifasida `GET /apartments/:id` va keyin `POST /apartments/:id/view`.
4. Login qilgan user bo‘lsa `GET /apartments/:id/interaction`.
5. Like bosilganda `POST /apartments/:id/like`.
6. Push notification uchun login/register payloadiga `deviceId + fcmToken + platform` yuboring.

### Admin panel

1. `POST /auth/login2` bilan admin login qiling.
2. Tokenni local storage yoki cookie’da saqlang.
3. CRUD ekranlarini Swagger’dagi request body bo‘yicha ulang.
4. Apartment create/edit ekranida oddiy JSON emas, `FormData` ishlating.
5. Banner create/edit ekranida `image` nomli bitta fayl yuboring.
6. Userga notification yuborish uchun `POST /notifications/users/:userId` endpointidan foydalaning.

## Notification API

### Frontend foydalanuvchi qurilmasini saqlash

```http
POST /notifications/devices
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "deviceId": "web-device-001",
  "fcmToken": "firebase-device-token",
  "deviceName": "Chrome on Linux",
  "platform": "WEB"
}
```

### Current user qurilmalari

- `GET /notifications/devices`
- `DELETE /notifications/devices/:id`

### Current user notificationlari

- `GET /notifications/me`
- `GET /notifications/me/:id`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:id`

### Current user test push

```http
POST /notifications/test
Authorization: Bearer <token>
```

```json
{
  "title": "Test notification",
  "body": "Bu test push",
  "data": {
    "screen": "home"
  }
}
```

### Admin bitta userga notification yuborishi

```http
POST /notifications/users/:userId
Authorization: Bearer <adminToken>
```

```json
{
  "title": "Yangi e'lon",
  "body": "Sizning hududingizda yangi uy joylandi",
  "data": {
    "screen": "apartment_detail",
    "apartmentId": "25"
  }
}
```

Bu endpoint:

- notificationni bazaga yozadi
- userning barcha aktiv device larini oladi
- barcha `fcmToken` larga push yuboradi
- invalid tokenlarni avtomatik tozalaydi

### Admin user device larini ko‘rishi

- `GET /notifications/users/:userId/devices`

## Frontend Firebase oqimi

1. Frontend notification permission so‘raydi.
2. Firebase SDK orqali `fcmToken` oladi.
3. Login yoki register vaqtida backendga `deviceId`, `deviceName`, `platform`, `fcmToken` yuboradi.
4. Agar token keyinroq olingan bo‘lsa, `POST /notifications/devices` chaqiriladi.
5. Foydalanuvchi app ochganda `GET /notifications/me`.
6. Notification ochilganda `PATCH /notifications/:id/read`.

## Frontend kod namunasi

### Login2 bilan device yuborish

```ts
await fetch('http://localhost:4000/auth/login2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phone: '+998901234567',
    password: 'Admin123',
    deviceId: 'web-device-001',
    fcmToken,
    deviceName: 'Chrome on Linux',
    platform: 'WEB',
  }),
});
```

### Token keyinroq kelsa device save qilish

```ts
await fetch('http://localhost:4000/notifications/devices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    deviceId: 'web-device-001',
    fcmToken,
    deviceName: 'Chrome on Linux',
    platform: 'WEB',
  }),
});
```

### Notification list olish

```ts
await fetch('http://localhost:4000/notifications/me?page=1&limit=20', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Notification o‘qilgan qilish

```ts
await fetch('http://localhost:4000/notifications/12/read', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Tavsiya etilgan admin sahifalar

- Login
- Dashboard summary
- Regions CRUD
- Apartment categories CRUD
- Companies CRUD
- Complexes CRUD
- Apartment layouts CRUD
- Apartments CRUD
- Banners CRUD
- Users list / block / archive
- Job categories CRUD

## Tekshirish

Swagger orqali barcha endpointlarni sinash mumkin:

```text
http://localhost:4000/api/docs
```

Eng muhim testlar:

1. `POST /auth/login2`
2. `GET /regions`
3. `GET /apartment-categories`
4. `POST /apartments` with `multipart/form-data`
5. `PATCH /apartments/:id`
6. `POST /banners`
