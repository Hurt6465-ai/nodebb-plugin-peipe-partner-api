# nodebb-plugin-peipe-partner-api

Peipe 语伴 / 附近的人统一接口插件。这个版本特意换了插件名、包名、全局变量和接口路径，避免和你已有的语伴插件冲突。

## 为什么改名

旧版名称：

```txt
nodebb-plugin-language-partner
```

新版名称：

```txt
nodebb-plugin-peipe-partner-api
```

新版接口也改成了：

```txt
/api/peipe-partners
/api/peipe-partners/location
/api/peipe-partners/me/profile-status
/api/peipe-partners/me/profile
```

前端全局对象改成：

```js
window.PeipePartnerAPI
```

## 已适配你的自定义用户属性

ACP 里的字段：

```txt
language_flag      国籍 / 国家
language_fluent    母语，多选
language_learning  正在学习的语言，多选
gender             性别
lat                纬度
lng                经度
```

新版额外支持年龄：

```txt
age                年龄
```

`age` 不一定要先在 ACP 创建，插件的自动弹窗会直接写入用户字段；但建议你在 ACP 也创建一个 `age` 自定义用户属性，后期后台查看和编辑更方便。

定位上传时会写入 `lat` / `lng`，并额外写入插件内部时间字段：

```txt
peipePartnerGeoUpdatedAt
peipePartnerGeoExpiresAt
```

这两个时间字段不用在 ACP 创建，用于实现：24 小时内最多定位一次、服务端位置 7 天后过期。

## 已加入注册后自动弹窗填资料

插件前端脚本会在用户登录后检查资料是否完整。缺少下面任意字段时，会自动弹窗：

```txt
language_flag
language_fluent
language_learning
gender
age
```

弹窗里的选项不是纯中文，已经加了中英和部分本地语言标签，例如：

```txt
中国 / China / တရုတ်
缅甸 / Myanmar / မြန်မာ
越南 / Vietnam / Việt Nam
中文 / Chinese / တရုတ်ဘာသာ
缅甸语 / Burmese / မြန်မာဘာသာ
越南语 / Vietnamese / Tiếng Việt
男 / Male / ကျား
女 / Female / မ
```

这样缅甸、越南、新加坡等用户不会只看到中文选项。

## 设计目标

- 做成 NodeBB 插件，不改 NodeBB 核心代码。
- 不和你已有的语伴插件重名。
- `找语伴` 和 `附近的人` 共用一个接口：`GET /api/peipe-partners`。
- 通过 `mode=recommend` 或 `mode=nearby` 区分推荐模式。
- 后端每 30 分钟构建一次语伴卡片池。
- 前端不再逐个请求 `/api/user/:userslug`。
- 登录用户优先不重复推荐；未看过的人不足时才补已看过的人。
- 定位 24 小时内最多更新一次。
- 定位在服务端保存 7 天，之后不参与附近推荐。
- 接口不返回真实经纬度，只返回 `distanceText`。
- 语伴卡片返回年龄字段 `age` / `ageText`。

## 文件结构

```txt
nodebb-plugin-peipe-partner-api/
  package.json
  plugin.json
  library.js
  lib/partner.js
  public/src/peipe-partner-client.js
  examples/find-partners-page.html
  examples/nearby-page.html
```

## 上传到 GitHub 后安装

推荐仓库名：

```txt
nodebb-plugin-peipe-partner-api
```

在 NodeBB 服务器执行：

```bash
cd /path/to/nodebb
npm install git+https://github.com/YOUR_NAME/nodebb-plugin-peipe-partner-api.git
./nodebb build
./nodebb restart
```

然后进入 ACP 后台启用插件：

```txt
Peipe Partner API
```

私有仓库可以用 SSH：

```bash
cd /path/to/nodebb
npm install git+ssh://git@github.com/YOUR_NAME/nodebb-plugin-peipe-partner-api.git
./nodebb build
./nodebb restart
```

如果插件导致启动失败，可以先禁用：

```bash
./nodebb reset -p nodebb-plugin-peipe-partner-api
./nodebb restart
```

## 接口

### 找语伴

```http
GET /api/peipe-partners?mode=recommend&limit=20&cursor=0
```

### 附近的人

```http
GET /api/peipe-partners?mode=nearby&limit=20&cursor=0
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
PUT /api/peipe-partners/location
Content-Type: application/json
x-csrf-token: <csrf_token>

{
  "lat": 13.7563,
  "lng": 100.5018
}
```

24 小时内已经更新过时，返回：

```json
{
  "ok": true,
  "skipped": true,
  "reason": "location_recently_updated"
}
```

### 检查当前用户资料是否完整

```http
GET /api/peipe-partners/me/profile-status
```

返回：

```json
{
  "ok": true,
  "complete": false,
  "missing": ["age"],
  "profile": {
    "language_flag": "中国",
    "language_fluent": ["中文"],
    "language_learning": ["越南语"],
    "gender": "男",
    "age": ""
  }
}
```

### 保存当前用户语伴资料

```http
PUT /api/peipe-partners/me/profile
Content-Type: application/json
x-csrf-token: <csrf_token>

{
  "language_flag": "中国",
  "language_fluent": ["中文"],
  "language_learning": ["越南语", "缅甸语"],
  "gender": "男",
  "age": 22
}
```

## 语伴列表返回字段

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
      "age": 22,
      "ageText": "22岁",
      "nativeCode": "CN",
      "learnCode": "VI",
      "nativeCodes": ["CN"],
      "learnCodes": ["VI", "MM"],
      "bio": "想练越南语，可以教中文",
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
window.PeipePartnerAPI.list({ mode: 'recommend', limit: 20 })
window.PeipePartnerAPI.list({ mode: 'nearby', limit: 20 })
window.PeipePartnerAPI.updateLocation({ lat, lng })
window.PeipePartnerAPI.profileStatus()
window.PeipePartnerAPI.updateProfile(profile)
```

你现有页面要把旧调用改成：

```js
window.PeipePartnerAPI.list({ mode: 'recommend', limit: 20 })
```

不要再用：

```js
window.LanguagePartnerAPI
```

## 去重逻辑

插件为每个登录用户、每个模式保存一个 24 小时的已看列表：

```txt
peipePartner:seen:recommend:<uid>
peipePartner:seen:nearby:<uid>
```

推荐时：

1. 优先返回未看过的语伴。
2. 未看过的人不足一页时，才从已看过的人里面补。
3. 每 30 分钟重新计算排序，但是 24 小时内尽量不重复。

## 国家和语言映射

已支持你的字段值：

```txt
language_flag: 中国 / 缅甸 / 新加坡 / 越南
language_fluent: 中文 / 缅甸语 / 越南语 / 英语 / 泰语 / 日语 / 韩语
language_learning: 中文 / 缅甸语 / 越南语 / 英语 / 泰语 / 日语 / 韩语
```

也兼容常见英文 / 代码值，例如：`cn`, `zh`, `myanmar`, `vi`, `vietnam`, `th`, `ja`, `ko`。
