Recommended file structure of project :

index.html
./lib/script/gdrp.js
./lib/script/send/consent/index.php

# GDPR Consent Banner

Vanilla JS banner for GDPR/CCPA cookie consent with multilingual support (RU/EN), category management, and API logging.

## ✨ Features

- ✅ Pure **vanilla JS** (no jQuery/React)  
- ✅ **Multi-language** support (RU/EN, extendable)  
- ✅ Accept all / Reject / Configure categories  
- ✅ Saves consent state per domain (localStorage + expires)  
- ✅ Sends data to server API (PHP/Django ready)  
- ✅ Lightweight & easy to integrate  
- ✅ GDPR / CCPA compliant  

---

## 📂 Project Structure

```
/gdrp/
 ├── index.html   # Example usage page
 ├── gdrp.js      # Banner logic (multilingual, consent management)
 └── style.css    # Banner + modal styles
```

---

## 🚀 Quick Start

### 1. Include CSS & JS
Inside your `<head>`:

```html
<link rel="stylesheet" href="./gdrp/style.css" />
<script src="./gdrp/gdrp.js" defer></script>
```

### 2. Provide API endpoint

In `gdrp.js` configure:

```js
const API_URL = "https://rohhs.com/example/lib/script/save/consent/index.php";
```

This endpoint receives JSON consent records.

---

## 📝 API Specification

### Example JSON request

```json
{
  "datetime": "2025-08-19T12:00:00.000Z",
  "status": "accepted",
  "categories": {
    "necessary": 1,
    "analytics": 1,
    "marketing": 0
  }
}
```

### Example PHP endpoint (`index.php`)

```php
<?php
header("Content-Type: application/json; charset=UTF-8");

$file = __DIR__ . "/consents.csv";
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["status" => "error"]);
    exit;
}

$record = [
    "datetime"   => $data["datetime"] ?? date("c"),
    "status"     => $data["status"] ?? "unknown",
    "necessary"  => $data["categories"]["necessary"] ?? 1,
    "analytics"  => $data["categories"]["analytics"] ?? 0,
    "marketing"  => $data["categories"]["marketing"] ?? 0,
    "ip"         => $_SERVER["REMOTE_ADDR"] ?? "0.0.0.0",
    "user_agent" => $_SERVER["HTTP_USER_AGENT"] ?? "-"
];

if (!file_exists($file)) {
    file_put_contents($file, implode(";", array_keys($record)) . "\r\n");
}
file_put_contents($file, implode(";", $record) . "\r\n", FILE_APPEND | LOCK_EX);

echo json_encode(["status" => "ok"]);
```

---

## 🌍 Multi-language

Defined in `gdrp.js`:

```js
const I18N = {
  ru: {
    title: "Мы используем cookies и подобные технологии",
    desc: "Мы используем cookies для работы сайта, аналитики и персонализации рекламы.",
    accept: "Принять всё",
    reject: "Отклонить",
    settings: "Настроить"
  },
  en: {
    title: "We use cookies and similar technologies",
    desc: "We use cookies for site operation, analytics and ad personalization.",
    accept: "Accept all",
    reject: "Reject",
    settings: "Settings"
  }
};
```

Default language auto-detected by `navigator.language`.

---

## 🔒 Consent Storage

- Stored in `localStorage` under `gdprConsent`.  
- Persists across sessions for configurable number of days (default: 180).  
- Banner re-shows after expiration.  

Example stored JSON:

```json
{
  "status": "accepted",
  "categories": { "necessary": 1, "analytics": 1, "marketing": 0 },
  "datetime": "2025-08-19T12:00:00.000Z"
}
```

---

## 📜 License

MIT — free to use and distribute.  
