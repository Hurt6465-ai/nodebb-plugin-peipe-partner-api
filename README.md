# nodebb-plugin-language-partner

NodeBB 语伴 / 附近的人统一接口插件。

## 已按你的自定义用户属性适配

ACP 里的字段：

```txt
language_flag      国籍 / 国家
language_fluent    母语，多选
language_learning  正在学习的语言，多选
gender             性别
lat                纬度
lng                经度
```

插件读取这些字段生成卡片数据。定位上传时会写入 `lat` / `lng`，并额外写入插件内部时间字段：

```txt
languagePartnerGeoUpdatedAt
languagePartnerGeoExpiresAt
```

这两个时间字段不需要在 ACP 创建。它们用于实现：24 小时内最多定位一次、服务端位置 7 天后过期。

## 设计目标

- 做成 NodeBB 插件，不改 NodeBB 核心代码。
- `找语伴` 和 `附近的人` 共用一个接口：`GET /api/language-partners`。
- 通过 `mode=recommend` 或 `mode=nearby` 区分推荐模式。
- 后端每 30 分钟构建一次语伴卡片池。
- 前端不再逐个请求 `/api/user/:userslug`。
- 登录用户优先不重复推荐；未看过的人不足时才补已看过的人。
- 定位 24 小时内最多更新一次。
- 定位在服务端保存 7 天，之后不参与附近推荐。
- 接口不返回真实经纬度，只返回 `distanceText`。

## 文件结构

```txt
nodebb-plugin-language-partner/
  package.json
  plugin.json
  library.js
  lib/partner.js
  public/src/language-partner-client.js
  examples/find-partners-page.html
  examples/nearby-page.html
```

## 上传到 GitHub 后安装

推荐仓库名和包名保持一致：

```txt
nodebb-plugin-language-partner
```

在 NodeBB 服务器执行：

```bash
cd /path/to/nodebb
npm install git+https://github.com/YOUR_NAME/nodebb-plugin-language-partner.git
./nodebb build
./nodebb restart
```

然后进入 ACP 后台启用插件。

如果是私有仓库，可以用 SSH：

```bash
cd /path/to/nodebb
npm install git+ssh://git@github.com/YOUR_NAME/nodebb-plugin-language-partner.git
./nodebb build
./nodebb restart
```

如果插件导致启动失败，可以先禁用：

```bash
./nodebb reset -p nodebb-plugin-language-partner
./nodebb restart
```

## 接口

### 找语伴

```http
GET /api/language-partners?mode=recommend&limit=20&cursor=0
```

### 附近的人

```http
GET /api/language-partners?mode=nearby&limit=20&cursor=0
```

如果当前用户没有有效定位，返回：

```json
{
  "mode": "nearby",
  "needLocation": true,
  "users": [],
  "message": "开启位置后可以发现附近语伴"
}
```

### 上传定位

```http
PUT /api/language-partners/location
Content-Type: application/json
x-csrf-token: <csrf_token>

{
  "lat": 13.7563,
  "lng": 100.5018
}
```

返回：

```json
{
  "ok": true,
  "skipped": false,
  "updatedAt": 1710000000000,
  "expiresAt": 1710604800000,
  "nextAllowedAt": 1710086400000
}
```

如果 24 小时内已经更新过：

```json
{
  "ok": true,
  "skipped": true,
  "reason": "location_recently_updated"
}
```

## 返回字段

```json
{
  "mode": "recommend",
  "needLocation": false,
  "users": [
    {
      "uid": 1001,
      "username": "Mina",
      "userslug": "mina",
      "picture": "https://example.com/avatar.png",
      "genderCode": "F",
      "nativeCode": "CN",
      "learnCode": "EN",
      "nativeCodes": ["CN"],
      "learnCodes": ["EN"],
      "bio": "想练英语，可以教中文",
      "countryCode": "cn",
      "flagSrc": "https://flagcdn.com/w40/cn.png",
      "isOnline": true,
      "statusText": "当前在线",
      "profileLink": "/user/mina/topics",
      "canChat": true,
      "distanceText": "3km内"
    }
  ],
  "nextCursor": "1",
  "refreshAfter": 1800,
  "poolCount": 120,
  "candidateCount": 88
}
```

`distanceText` 只在 `mode=nearby` 时返回。

## 前端接入

插件会注入：

```js
window.LanguagePartnerAPI.list({ mode: 'recommend', limit: 20 })
window.LanguagePartnerAPI.list({ mode: 'nearby', limit: 20 })
window.LanguagePartnerAPI.updateLocation({ lat, lng })
```

你现有页面可以删除：

- 母语筛选
- 性别筛选
- `fetchProfiles()`
- `fetchOneProfile()`
- `mergeUser()`
- 前端语言 / 国家 / 性别二次解析

保留：

- 卡片 HTML
- 打招呼按钮
- 骨架屏
- 图片 fallback
- 无限滚动

## 去重逻辑

插件为每个登录用户、每个模式保存一个 24 小时的已看列表：

```txt
languagePartner:seen:recommend:<uid>
languagePartner:seen:nearby:<uid>
```

推荐时：

1. 优先返回未看过的语伴。
2. 未看过的人不足一页时，才从已看过的人里面补。
3. 每 30 分钟重新计算排序，但是 24 小时内尽量不重复。

## 国家和语言映射

已支持你的字段值：

```txt
language_flag: 中国 / 缅甸 / 新加坡 / 越南
language_fluent: 中文 / 缅甸语 / 越南语
language_learning: 中文 / 缅甸语 / 越南语
```

也兼容常见英文 / 代码值，例如：`cn`, `zh`, `myanmar`, `vi`, `vietnam`, `th`, `ja`, `ko`。
# nodebb-plugin-language-partner

NodeBB 语伴 / 附近的人统一接口插件。

## 已按你的自定义用户属性适配

ACP 里的字段：

```txt
language_flag      国籍 / 国家
language_fluent    母语，多选
language_learning  正在学习的语言，多选
gender             性别
lat                纬度
lng                经度
```

插件读取这些字段生成卡片数据。定位上传时会写入 `lat` / `lng`，并额外写入插件内部时间字段：

```txt
languagePartnerGeoUpdatedAt
languagePartnerGeoExpiresAt
```

这两个时间字段不需要在 ACP 创建。它们用于实现：24 小时内最多定位一次、服务端位置 7 天后过期。

## 设计目标

- 做成 NodeBB 插件，不改 NodeBB 核心代码。
- `找语伴` 和 `附近的人` 共用一个接口：`GET /api/language-partners`。
- 通过 `mode=recommend` 或 `mode=nearby` 区分推荐模式。
- 后端每 30 分钟构建一次语伴卡片池。
- 前端不再逐个请求 `/api/user/:userslug`。
- 登录用户优先不重复推荐；未看过的人不足时才补已看过的人。
- 定位 24 小时内最多更新一次。
- 定位在服务端保存 7 天，之后不参与附近推荐。
- 接口不返回真实经纬度，只返回 `distanceText`。

## 文件结构

```txt
nodebb-plugin-language-partner/
  package.json
  plugin.json
  library.js
  lib/partner.js
  public/src/language-partner-client.js
  examples/find-partners-page.html
  examples/nearby-page.html
```

## 上传到 GitHub 后安装

推荐仓库名和包名保持一致：

```txt
nodebb-plugin-language-partner
```

在 NodeBB 服务器执行：

```bash
cd /path/to/nodebb
npm install git+https://github.com/YOUR_NAME/nodebb-plugin-language-partner.git
./nodebb build
./nodebb restart
```

然后进入 ACP 后台启用插件。

如果是私有仓库，可以用 SSH：

```bash
cd /path/to/nodebb
npm install git+ssh://git@github.com/YOUR_NAME/nodebb-plugin-language-partner.git
./nodebb build
./nodebb restart
```

如果插件导致启动失败，可以先禁用：

```bash
./nodebb reset -p nodebb-plugin-language-partner
./nodebb restart
```

## 接口

### 找语伴

```http
GET /api/language-partners?mode=recommend&limit=20&cursor=0
```

### 附近的人

```http
GET /api/language-partners?mode=nearby&limit=20&cursor=0
```

如果当前用户没有有效定位，返回：

```json
{
  "mode": "nearby",
  "needLocation": true,
  "users": [],
  "message": "开启位置后可以发现附近语伴"
}
```

### 上传定位

```http
PUT /api/language-partners/location
Content-Type: application/json
x-csrf-token: <csrf_token>

{
  "lat": 13.7563,
  "lng": 100.5018
}
```

返回：

```json
{
  "ok": true,
  "skipped": false,
  "updatedAt": 1710000000000,
  "expiresAt": 1710604800000,
  "nextAllowedAt": 1710086400000
}
```

如果 24 小时内已经更新过：

```json
{
  "ok": true,
  "skipped": true,
  "reason": "location_recently_updated"
}
```

## 返回字段

```json
{
  "mode": "recommend",
  "needLocation": false,
  "users": [
    {
      "uid": 1001,
      "username": "Mina",
      "userslug": "mina",
      "picture": "https://example.com/avatar.png",
      "genderCode": "F",
      "nativeCode": "CN",
      "learnCode": "EN",
      "nativeCodes": ["CN"],
      "learnCodes": ["EN"],
      "bio": "想练英语，可以教中文",
      "countryCode": "cn",
      "flagSrc": "https://flagcdn.com/w40/cn.png",
      "isOnline": true,
      "statusText": "当前在线",
      "profileLink": "/user/mina/topics",
      "canChat": true,
      "distanceText": "3km内"
    }
  ],
  "nextCursor": "1",
  "refreshAfter": 1800,
  "poolCount": 120,
  "candidateCount": 88
}
```

`distanceText` 只在 `mode=nearby` 时返回。

## 前端接入

插件会注入：

```js
window.LanguagePartnerAPI.list({ mode: 'recommend', limit: 20 })
window.LanguagePartnerAPI.list({ mode: 'nearby', limit: 20 })
window.LanguagePartnerAPI.updateLocation({ lat, lng })
```

你现有页面可以删除：

- 母语筛选
- 性别筛选
- `fetchProfiles()`
- `fetchOneProfile()`
- `mergeUser()`
- 前端语言 / 国家 / 性别二次解析

保留：

- 卡片 HTML
- 打招呼按钮
- 骨架屏
- 图片 fallback
- 无限滚动

## 去重逻辑

插件为每个登录用户、每个模式保存一个 24 小时的已看列表：

```txt
languagePartner:seen:recommend:<uid>
languagePartner:seen:nearby:<uid>
```

推荐时：

1. 优先返回未看过的语伴。
2. 未看过的人不足一页时，才从已看过的人里面补。
3. 每 30 分钟重新计算排序，但是 24 小时内尽量不重复。

## 国家和语言映射

已支持你的字段值：

```txt
language_flag: 中国 / 缅甸 / 新加坡 / 越南
language_fluent: 中文 / 缅甸语 / 越南语
language_learning: 中文 / 缅甸语 / 越南语
```

也兼容常见英文 / 代码值，例如：`cn`, `zh`, `myanmar`, `vi`, `vietnam`, `th`, `ja`, `ko`。
