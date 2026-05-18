# Dashboard API — Frontend Qo'llanmasi

> Base URL: `http://localhost:4000`  
> Swagger: `http://localhost:4000/api/docs`

---

## Mundarija

1. [Autentifikatsiya](#autentifikatsiya)
2. [REST Endpointlar](#rest-endpointlar)
   - [Home](#home)
   - [Ustalar](#ustalar)
   - [Ko'chmas Mulk](#kochmas-mulk)
   - [Qidiruv](#qidiruv)
   - [Tavsiyalar](#tavsiyalar)
   - [Platforma Statistikasi](#platforma-statistikasi)
   - [Top Shaharlar](#top-shaharlar)
   - [Sevimlilar](#sevimlilar-auth)
   - [Qoralamalar](#qoralamalar-auth)
3. [WebSocket — Valyuta Kurslari](#websocket--valyuta-kurslari)

---

## Autentifikatsiya

Himoyalangan endpointlar (`🔒`) uchun so'rovga `Authorization` headerini qo'shing:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## REST Endpointlar

---

### Home

#### `GET /home/stats`

Bosh sahifa uchun umumiy statistika.

**Request:**
```
GET /home/stats
```

**Response `200`:**
```json
{
  "users": "12K+",
  "realEstates": "8K+",
  "masters": "850+",
  "jobs": "320+",
  "newUsersThisWeek": 47,
  "newUsersThisMonth": 183
}
```

---

#### `GET /home/categories`

Kategoriyalar bo'yicha e'lonlar soni.

**Request:**
```
GET /home/categories
```

**Response `200`:**
```json
[
  { "key": "APARTMENT", "name": "Kvartira",  "count": 4120 },
  { "key": "HOUSE",     "name": "Hovli-uy",  "count": 1830 },
  { "key": "OFFICE",    "name": "Ofis",      "count": 640  },
  { "key": "RETAIL",    "name": "Do'kon",    "count": 290  },
  { "key": "MASTER",    "name": "Ustalar",   "count": 850  },
  { "key": "JOB",       "name": "Ishlar",    "count": 320  }
]
```

---

#### `GET /home/hero`

Hero sektsiya matni va rasmi.

**Response `200`:**
```json
{
  "title": "PROHOME bilan orzuingizdagi uyni toping",
  "subtitle": "O'zbekiston bo'ylab eng yaxshi uy-joy va ustalar platformasi",
  "ctaText": "Boshlash",
  "backgroundImageUrl": "https://cdn.prohome.uz/images/hero-bg.jpg"
}
```

---

#### `GET /home/features`

Platforma afzalliklari bloki.

**Response `200`:**
```json
[
  { "title": "Ishonchli va xavfsiz", "description": "Barcha e'lonlar moderatsiyadan o'tgan" },
  { "title": "Eng yaxshi narxlar",   "description": "Bozordagi eng yaxshi takliflar" },
  { "title": "Tezkor aloqa",         "description": "Sotuvchi bilan tez bog'lanish" }
]
```

---

### Ustalar

#### `GET /masters/stats`

Ustalar bo'yicha umumiy statistika.

**Response `200`:**
```json
{
  "total": "850+",
  "freeMasters": "530+",
  "rating": "4.8★",
  "totalRatings": 2340,
  "responseTime": "~24h"
}
```

---

#### `GET /masters/top`

Eng ko'p like va yuqori reytingli ustalar.

**Query params:**

| Param   | Type   | Default | Tavsif              |
|---------|--------|---------|---------------------|
| `limit` | number | `10`    | Qaytariladigan soni |

**Request:**
```
GET /masters/top?limit=5
```

**Response `200`:**
```json
[
  {
    "id": 1,
    "profileImg": "https://...",
    "experience": 5,
    "bio": "Santexnika bo'yicha mutaxassis",
    "salary": "150000.00",
    "isFree": true,
    "likeCount": 128,
    "viewCount": 940,
    "avgRating": 4.9,
    "ratingsCount": 37,
    "user": {
      "id": 12,
      "firstName": "Jasur",
      "lastName": "Toshmatov",
      "phone": "+998901234567"
    },
    "skills": [
      {
        "skill": {
          "id": 3,
          "name": "Santexnika",
          "type": { "id": 1, "name": "Qurilish" }
        }
      }
    ]
  }
]
```

---

### Ko'chmas Mulk

#### `GET /real-estate/options`

Filter uchun barcha variantlar (enum qiymatlar).

**Response `200`:**
```json
{
  "dealTypes":     ["SALE", "RENT"],
  "propertyTypes": ["APARTMENT", "HOUSE", "OFFICE", "RETAIL"],
  "repairs":       ["EURO", "AVERAGE", "NO_REPAIR"],
  "heating":       ["CENTRAL", "AUTONOMOUS"],
  "gas":           ["YES", "NO"],
  "water":         ["YES", "NO"],
  "parking":       ["OPEN", "CLOSED"]
}
```

---

#### `GET /real-estate/stats`

Ko'chmas mulk statistikasi: sotish/ijara, turlar bo'yicha, so'nggi e'lonlar.

**Response `200`:**
```json
{
  "forSale": 3240,
  "forRent": 880,
  "totalViews": 184920,
  "byType": [
    { "type": "APARTMENT", "count": 4120 },
    { "type": "HOUSE",     "count": 1830 },
    { "type": "OFFICE",    "count": 640  },
    { "type": "RETAIL",    "count": 290  }
  ],
  "recentlyAdded": [
    {
      "id": 101,
      "title": "3 xonali kvartira, Yunusobod",
      "price": "85000.00",
      "propertyType": "APARTMENT",
      "dealType": "SALE",
      "areaSize": 78.5,
      "roomCount": 3,
      "createdAt": "2026-05-16T08:30:00.000Z",
      "location": { "id": 5, "name": "Toshkent", "type": "CITY" },
      "media": [{ "url": "https://...", "isMain": true, "mediaType": "IMAGE" }]
    }
  ]
}
```

---

### Qidiruv

#### `GET /search/suggestions`

Qidiruv maydoniga yozish paytida avtoto'ldirish (debounce bilan ishlatish tavsiya etiladi).

**Query params:**

| Param | Type   | Majburiy | Tavsif                  |
|-------|--------|----------|-------------------------|
| `q`   | string | Ha       | Qidiruv so'zi (min 2 ta belgi) |

**Request:**
```
GET /search/suggestions?q=kvart
```

**Response `200`:**
```json
[
  { "text": "3 xonali kvartira, Yunusobod", "type": "real-estate" },
  { "text": "Kvartira ta'mirlash ishi",     "type": "job" },
  { "text": "2 xonali kvartira, Chilonzor", "type": "real-estate" }
]
```

> `type` qiymati: `"real-estate"` yoki `"job"` — qaysi sahifaga yo'naltirish kerakligini bildiradi.

---

### Tavsiyalar

#### `GET /recommendations`

Ko'p ko'rilgan ko'chmas mulklar, top ustalar va ochiq ishlar.

**Response `200`:**
```json
{
  "realEstates": [
    {
      "id": 55,
      "title": "2 xonali kvartira, Mirzo Ulugbek",
      "price": "65000.00",
      "propertyType": "APARTMENT",
      "dealType": "SALE",
      "viewCount": 1230,
      "location": { "id": 5, "name": "Toshkent" },
      "media": [{ "url": "https://...", "isMain": true }]
    }
  ],
  "masters": [
    {
      "id": 1,
      "profileImg": "https://...",
      "isFree": true,
      "avgRating": 4.8,
      "user": { "firstName": "Jasur", "lastName": "Toshmatov" },
      "skills": [{ "skill": { "name": "Santexnika" } }]
    }
  ],
  "jobs": [
    {
      "id": 22,
      "title": "Hovli ta'mirlash kerak",
      "price": "500000.00",
      "status": "OPEN",
      "viewCount": 87,
      "location": { "name": "Toshkent" },
      "skillType": { "name": "Qurilish" }
    }
  ]
}
```

---

### Platforma Statistikasi

#### `GET /platform/overview`

Admin panel uchun to'liq statistika.

**Response `200`:**
```json
{
  "users": {
    "total": 12480,
    "newThisMonth": 183,
    "newThisWeek": 47
  },
  "realEstates": {
    "total": 8200,
    "active": 6100,
    "sold": 1800,
    "archived": 300
  },
  "masters": {
    "total": 850,
    "free": 530,
    "busy": 320
  },
  "jobs": {
    "total": 1420,
    "open": 320,
    "completed": 980,
    "other": 120
  },
  "engagement": {
    "totalRatings": 2340,
    "avgRating": 4.7,
    "jobLikes": 8900,
    "masterLikes": 14200
  }
}
```

---

### Top Shaharlar

#### `GET /locations/top`

Eng ko'p faol e'lonlari bor shaharlar.

**Query params:**

| Param   | Type   | Default | Tavsif              |
|---------|--------|---------|---------------------|
| `limit` | number | `10`    | Qaytariladigan soni |

**Request:**
```
GET /locations/top?limit=5
```

**Response `200`:**
```json
[
  {
    "location": { "id": 5, "name": "Toshkent", "type": "CITY" },
    "listingsCount": 3840
  },
  {
    "location": { "id": 12, "name": "Samarqand", "type": "CITY" },
    "listingsCount": 920
  }
]
```

---

### Sevimlilar `🔒`

#### `GET /favorites`

Foydalanuvchining sevimlilari (ishlar va ustalar).

**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response `200`:**
```json
{
  "jobs": [
    {
      "id": 22,
      "title": "Hovli ta'mirlash kerak",
      "status": "OPEN",
      "likedAt": "2026-05-10T14:00:00.000Z",
      "location": { "name": "Toshkent" },
      "skillType": { "name": "Qurilish" }
    }
  ],
  "masters": [
    {
      "id": 1,
      "profileImg": "https://...",
      "avgRating": 4.9,
      "likedAt": "2026-05-12T09:00:00.000Z",
      "user": { "firstName": "Jasur", "lastName": "Toshmatov" },
      "skills": [{ "skill": { "name": "Santexnika" } }]
    }
  ]
}
```

---

### Qoralamalar `🔒`

#### `GET /drafts`

```
GET /drafts
Authorization: Bearer <TOKEN>
```

**Response `200`:** `[]` *(hozircha bo'sh, keyingi versiyada)*

---

#### `POST /drafts`

```
POST /drafts
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "type": "real-estate",
  "data": {
    "title": "Test uy",
    "price": 50000
  }
}
```

**Response `200`:**
```json
{ "success": true }
```

---

#### `DELETE /drafts/:id`

```
DELETE /drafts/5
Authorization: Bearer <TOKEN>
```

**Response `200`:**
```json
{ "success": true }
```

---

## WebSocket — Valyuta Kurslari

### Ulanish

```
ws://localhost:4000/exchange-rates
```

Socket.IO library ishlatiladi (vanilla WebSocket emas).

### O'rnatish

```bash
npm install socket.io-client
```

---

### Events jadval

| Yo'nalish           | Event nomi            | Ma'lumot                           |
|---------------------|-----------------------|------------------------------------|
| Server → Client     | `exchange_rates`      | Joriy valyuta kurslari (NBU dan)   |
| Server → Client     | `exchange_rates_error`| Xato xabari                        |
| Client → Server     | `get_rates`           | Kursni qo'lda so'rash              |

---

### `exchange_rates` (server → client)

Har **60 soniyada** avtomatik yuboriladi. Ulanganda darhol kesh qiymat keladi.

```json
{
  "USD": 12897.50,
  "EUR": 14105.30,
  "RUB": 148.20,
  "updatedAt": "2026-05-16T08:00:00.000Z"
}
```

> Barcha kurslar **UZS (so'm)** da — 1 USD = 12897.50 so'm.

---

### `exchange_rates_error` (server → client)

NBU API javob bermasa yuboriladi.

```json
{ "message": "Kurslarni yuklashda xatolik" }
```

---

### `get_rates` (client → server)

Kursni kutmasdan darhol olish uchun.

```js
socket.emit('get_rates');
// Javob: 'exchange_rates' eventi orqali keladi
```

---

### Frontend Misollari

#### Vanilla JavaScript

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/exchange-rates');

// Ulanganda yoki har daqiqada yangi kurs keladi
socket.on('exchange_rates', (data) => {
  console.log('USD:', data.USD);   // 12897.50
  console.log('EUR:', data.EUR);   // 14105.30
  console.log('RUB:', data.RUB);   // 148.20
  console.log('Yangilangan:', data.updatedAt);

  // UI ga chiqarish
  document.getElementById('usd').textContent = data.USD?.toLocaleString() + " so'm";
  document.getElementById('eur').textContent = data.EUR?.toLocaleString() + " so'm";
  document.getElementById('rub').textContent = data.RUB?.toLocaleString() + " so'm";
});

// Xato bo'lganda
socket.on('exchange_rates_error', (err) => {
  console.error('Kurs xatosi:', err.message);
});

// Qo'lda so'rash
socket.emit('get_rates');

// Ulanish uzilganda
socket.on('disconnect', () => {
  console.log('WebSocket uzildi');
});
```

---

#### React Hook

```tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ExchangeRates {
  USD: number | null;
  EUR: number | null;
  RUB: number | null;
  updatedAt: string;
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket: Socket = io('http://localhost:4000/exchange-rates');

    socket.on('exchange_rates', (data: ExchangeRates) => {
      setRates(data);
      setError(null);
    });

    socket.on('exchange_rates_error', (err: { message: string }) => {
      setError(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { rates, error };
}
```

**Komponentda ishlatish:**

```tsx
function CurrencyWidget() {
  const { rates, error } = useExchangeRates();

  if (error) return <p>Xatolik: {error}</p>;
  if (!rates) return <p>Yuklanmoqda...</p>;

  return (
    <div>
      <p>USD: {rates.USD?.toLocaleString()} so'm</p>
      <p>EUR: {rates.EUR?.toLocaleString()} so'm</p>
      <p>RUB: {rates.RUB?.toLocaleString()} so'm</p>
      <small>Yangilangan: {new Date(rates.updatedAt).toLocaleTimeString()}</small>
    </div>
  );
}
```

---

#### Vue 3 Composable

```ts
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export function useExchangeRates() {
  const rates = ref(null);
  const error = ref(null);
  let socket;

  onMounted(() => {
    socket = io('http://localhost:4000/exchange-rates');

    socket.on('exchange_rates', (data) => {
      rates.value = data;
      error.value = null;
    });

    socket.on('exchange_rates_error', (err) => {
      error.value = err.message;
    });
  });

  onUnmounted(() => {
    socket?.disconnect();
  });

  return { rates, error };
}
```

---

### Ishlash tartibi (diagramma)

```
Server start
    │
    ▼
afterInit() ──► NBU API ──► cachedRates saqlash
    │
    ▼
@Interval(60s) ──► NBU API ──► server.emit('exchange_rates') ──► Barcha clientlar
    │
    ▼
Yangi client ulanadi
    │
    ├─ cachedRates bor ──► darhol emit (API kutmasdan)
    └─ cachedRates yo'q ──► keyingi @Interval da oladi

Client 'get_rates' yuboradi
    │
    ├─ cachedRates bor ──► darhol emit
    └─ cachedRates yo'q ──► NBU API ──► emit
```

---

## Xatolar

| HTTP kodi | Sabab                                    |
|-----------|------------------------------------------|
| `400`     | So'rov parametri noto'g'ri               |
| `401`     | Token yo'q yoki muddati o'tgan (`🔒` uchun) |
| `500`     | Server xatosi                            |

WebSocket xatosi uchun `exchange_rates_error` eventini kuting.
