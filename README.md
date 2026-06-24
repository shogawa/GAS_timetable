# 教員用置き時計ダッシュボード README

## 概要

古いスマホ・タブレット・PCのブラウザで常時表示する、教員用の置き時計ダッシュボードです。

時計、現在の時限、残り時間、次の授業、Google Calendar予定、今日・明日の時間割、特別日課、曜日振替、個別変更、前期・後期切替、夏季・春季休業、夜間モード、全画面表示、PWA風ホーム画面追加、ファビコン・ホーム画面アイコンに対応しています。

古いiPadなど、通常版の `index.html` が表示できない端末向けに、機能を絞った `legacy.html` も用意できます。

Google Apps Script と Google Spreadsheet を使って動作します。

---

## できること

- 時計表示
- 秒表示
- 現在の時限表示
- 授業終了までの残り時間表示
- 次の時限表示
- 今日のGoogle Calendar予定表示
- 明日の時間割表示
- 今日詳細・明日詳細の表示切替
- 時間割のスプレッドシート管理
- 教室表示
- メモ表示
- 特別日課対応
- 短縮授業対応
- 休校対応
- 曜日振替対応
- 個別変更対応
- 前期・後期の時間割切替
- 夏季・春季休業などの休業期間表示
- 夜間モード
- 夜間モードの手動ON/OFF
- 焼き付き防止
- 手動再読込
- レスポンシブ表示
- PWA風ホーム画面追加
- 画面ONボタン
- 全画面表示ボタン
- ファビコン設定
- ホーム画面アイコン設定
- 古いiPad・古いSafari向けのレガシー表示

---

## ファイル構成

Google Apps Script 側には次の3ファイルを置きます。

| ファイル | 内容 |
|---|---|
| `Code.gs` | Calendar、Spreadsheet、各種設定の読み込み、manifest生成、favicon設定 |
| `index.html` | 通常版。画面表示、時計、表示モード切替、夜間モード、全画面表示など |
| `legacy.html` | 古いiPad・古いSafari向けの軽量版。時計、今日の時間割、明日の時間割、予定表示などに絞った表示 |

v14では、通常版の `index.html` に加えて、古い端末向けの `legacy.html` に対応しています。`Code.gs` と `index.html` は必ずセットで貼り替えてください。古いiPadでも表示したい場合は、`legacy.html` も追加してください。

---

## 初期設定

### 1. Apps Scriptを作成する

Google Apps Scriptで新規プロジェクトを作成します。

### 2. ファイルを貼り付ける

- `Code.gs` にGASコードを貼り付ける
- `index.html` に通常版のHTMLコードを貼り付ける
- 古いiPad向け表示も使う場合は、HTMLファイル `legacy` を追加し、`legacy.html` のコードを貼り付ける

### 3. スクリプト プロパティを設定する

`SECRET_KEY` と `SPREADSHEET_ID` は、コードに直接書かず Apps Script のスクリプト プロパティで管理します。

Apps Script エディタで「プロジェクトの設定」→「スクリプト プロパティ」を開き、以下を設定します。

| プロパティ | 内容 |
|---|---|
| `SECRET_KEY` | WebアプリURLに付ける秘密キー。長いランダム文字列にする |
| `SPREADSHEET_ID` | 管理用スプレッドシートのID |
| `CALENDAR_ID` | 任意。未設定なら `primary` |

`Code.gs` の先頭はこのような形です。

```javascript
var prop = PropertiesService.getScriptProperties().getProperties();

const CONFIG = {
  SECRET_KEY: prop.SECRET_KEY || '',
  CALENDAR_ID: prop.CALENDAR_ID || 'primary',
  SPREADSHEET_ID: prop.SPREADSHEET_ID || '',
  // ...
};
```

シート名を変更した場合は、`CONFIG` 側も合わせます。

### 4. レガシー表示を使う場合の `doGet(e)` 設定

古いiPad向けの `legacy.html` を追加した場合は、`doGet(e)` でURLパラメータ `legacy=1` を見て、通常版とレガシー版を切り替えます。

```javascript
function doGet(e) {
  const key = e && e.parameter ? e.parameter.k : '';

  if (CONFIG.SECRET_KEY && key !== CONFIG.SECRET_KEY) {
    return HtmlService.createHtmlOutput('Unauthorized');
  }

  const useLegacy = e && e.parameter && e.parameter.legacy === '1';
  const template = HtmlService.createTemplateFromFile(useLegacy ? 'legacy' : 'index');

  return template
    .evaluate()
    .setTitle(CONFIG.APP_NAME || '置き時計')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

すでに既存の `doGet(e)` がある場合は、次の2行だけを組み込めば切り替えできます。

```javascript
const useLegacy = e && e.parameter && e.parameter.legacy === '1';
const template = HtmlService.createTemplateFromFile(useLegacy ? 'legacy' : 'index');
```

`legacy=1` を付けない場合は、今まで通り `index.html` が表示されます。

### 5. 権限を許可する

GASエディタで `getDashboardData()` を一度実行し、CalendarとSpreadsheetの権限を許可します。

### 6. Webアプリとしてデプロイする

「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選びます。

- 実行ユーザー：自分
- アクセス：用途に応じて設定

発行されたURLに秘密キーを付けてアクセスします。

通常版：

```text
https://script.google.com/macros/s/xxxxxxxxxxxx/exec?k=SECRET_KEY
```

古いiPad向けのレガシー版：

```text
https://script.google.com/macros/s/xxxxxxxxxxxx/exec?k=SECRET_KEY&legacy=1
```

秘密キーを使っていない場合は、次のように `legacy=1` だけを付けます。

```text
https://script.google.com/macros/s/xxxxxxxxxxxx/exec?legacy=1
```

---

## スプレッドシート構成

このアプリでは、以下のシートを使います。

| シート名 | 役割 |
|---|---|
| `time_table` | 通常の時間割 |
| `period` | 時程 |
| `special` | 特別日課・曜日振替 |
| `kobetsu` | その日だけの個別変更 |
| `setting` | 表示設定 |
| `term` | 前期・後期、夏季・春季休業などの期間設定 |

実際のシート名は `Code.gs` の `CONFIG` に合わせてください。

---

## `time_table` シート

通常の時間割を管理します。

| 曜日 | 時限ID | 表示名 | 教室 | メモ | 開始上書き | 終了上書き | term |
|---|---|---|---|---|---|---|---|
| 月 | 1 | 1年A組 現代文 | 1A | 小テスト |  |  | 前期 |
| 月 | 2 | 空き | 職員室 | 採点 |  |  | 前期 |
| 火 | 3 | 2年B組 古典 | 2B |  | 13:10 | 14:30 | 後期 |

### 列の意味

| 列 | 内容 |
|---|---|
| 曜日 | 月、火、水、木、金、土、日 |
| 時限ID | `period` シートの時限IDと一致させる |
| 表示名 | 授業名、空き、会議など |
| 教室 | 表示する教室 |
| メモ | 小テスト、持ち物、注意など |
| 開始上書き | そのコマだけ開始時刻を変える場合に入力 |
| 終了上書き | そのコマだけ終了時刻を変える場合に入力 |
| term | 前期、後期など。空欄なら通年扱い |

---

## `period` シート

通常・短縮・テストなどの時程を管理します。

| 種別 | 時限ID | ラベル | 開始 | 終了 |
|---|---|---|---|---|
| 通常 | 1 | 1時間目 | 08:50 | 10:20 |
| 通常 | 2 | 2時間目 | 10:30 | 12:00 |
| 通常 | lunch | 昼休み | 12:00 | 13:00 |
| 通常 | 3 | 3時間目 | 13:00 | 14:30 |
| 短縮 | 1 | 1時間目 | 08:50 | 09:35 |
| 短縮 | 2 | 2時間目 | 09:45 | 10:30 |

### 種別について

`special` シートの `種別` と一致させます。

例：

- 通常
- 短縮
- テスト
- 午前
- 行事

---

## `special` シート

特別日課、休校、曜日振替を管理します。

| 日付 | 種別 | メモ | 時間割曜日 |
|---|---|---|---|
| 2026/06/24 | 短縮 | 短縮45分日課 |  |
| 2026/06/25 | 休校 | 創立記念日 |  |
| 2026/06/30 | 通常 | 月曜授業日 | 月 |
| 2026/07/01 | 短縮 | 月曜授業・短縮 | 月 |

### 使い方

火曜日だけど月曜授業をする場合：

| 日付 | 種別 | メモ | 時間割曜日 |
|---|---|---|---|
| 2026/06/30 | 通常 | 月曜授業日 | 月 |

短縮日課で月曜授業をする場合：

| 日付 | 種別 | メモ | 時間割曜日 |
|---|---|---|---|
| 2026/07/01 | 短縮 | 月曜授業・短縮 | 月 |

休校にする場合：

| 日付 | 種別 | メモ | 時間割曜日 |
|---|---|---|---|
| 2026/07/02 | 休校 | 創立記念日 |  |

---

## `kobetsu` シート

その日だけの変更を管理します。

| 日付 | 時限ID | 表示名 | 教室 | メモ | 開始上書き | 終了上書き | 扱い |
|---|---|---|---|---|---|---|---|
| 2026/06/24 | 3 |  | 視聴覚室 | 今日だけ教室変更 |  |  | 変更 |
| 2026/06/25 | 4 | 休講 |  | 出張のため |  |  | 休講 |
| 2026/06/26 | 2 |  |  | HR延長で10分遅れ | 10:40 | 12:00 | 変更 |
| 2026/06/27 | 5 |  |  | 行事のためカット |  |  | 削除 |

### 扱い

| 扱い | 内容 |
|---|---|
| 変更 | その日だけ表示名・教室・メモ・時刻を上書き |
| 休講 | そのコマを休講として表示 |
| 削除 | そのコマを画面に出さない |

空欄の場合は `変更` 扱いです。

---

## `term` シート

前期・後期などの授業期間に加えて、夏季休業・春季休業などの休業期間を管理します。

| term | start | end | memo | kind |
|---|---|---|---|---|
| 前期 | 2026/04/01 | 2026/09/30 | 前期時間割 | 授業 |
| 夏季休業 | 2026/07/21 | 2026/08/31 | 夏休み | 休業 |
| 後期 | 2026/10/01 | 2027/03/31 | 後期時間割 | 授業 |
| 春季休業 | 2027/03/20 | 2027/03/31 | 春休み | 休業 |

この日付範囲を見て、表示する時間割を自動で切り替えます。

`kind` が `休業` の行に該当する日は、授業時程を表示せず、画面には休業期間として表示します。`kind` を空欄にしても、`term` に `夏季休業`、`春季休業`、`休暇` などの文字が含まれる場合は休業扱いになります。

前期期間の中に夏季休業を重ねて書いても、休業行が優先されます。同じ優先度の行が重なった場合は、下の行が優先されます。

`setting` シートの `currentTerm` を空欄にしている場合、自動判定されます。

---

## `setting` シート

表示設定を管理します。

| key | value | memo |
|---|---|---|
| nightStart | 22:00 | 夜間モード開始 |
| nightEnd | 06:00 | 夜間モード終了 |
| showSeconds | TRUE | 秒表示 |
| refreshMinutes | 5 | 自動再読込間隔 |
| burnInShiftMinutes | 5 | 焼き付き防止の移動間隔 |
| burnInShiftAmount | 12 | 移動量px |
| maxTodayEvents | 5 | 今日の予定表示数 |
| maxTomorrowEvents | 3 | 明日の予定表示数 |
| maxTomorrowPeriods | 5 | 通常画面に出す明日の時限数 |
| defaultMode | normal | 起動時表示。`normal` / `today` / `tomorrow` |
| nightOpacity | 0.58 | 夜間モードの薄さ |
| nightBrightness | 0.72 | 夜間モードの明るさ |
| appName | 置き時計 | ホーム画面表示名 |
| shortName | 置き時計 | ホーム画面短縮名 |
| themeColor | #05070a | テーマカラー |
| backgroundColor | #05070a | 起動時背景色 |
| enableWakeLock | TRUE | 画面ONボタン表示 |
| showInstallHint | TRUE | ホーム画面追加ヒント表示 |
| enableFullscreen | TRUE | 全画面ボタン表示 |
| faviconUrl | https://example.com/favicon.png | ブラウザのファビコン |
| appleTouchIconUrl | https://example.com/apple-touch-icon.png | iPhone/iPadホーム画面用アイコン |
| icon192Url | https://example.com/icon-192.png | PWA/Android用192pxアイコン |
| icon512Url | https://example.com/icon-512.png | PWA/Android用512pxアイコン |
| showTermLabel | TRUE | 前期・後期を画面に表示 |
| currentTerm |  | termを手動固定する場合に入力 |

### アイコンURLについて

アイコン画像は、公開HTTPS URLを指定します。

おすすめは、`.png` や `.ico` で終わるURLです。

```text
https://example.com/classclock/favicon.png
https://example.com/classclock/apple-touch-icon.png
https://example.com/classclock/icon-192.png
https://example.com/classclock/icon-512.png
```

Google Driveの共有URLは、ファイル拡張子で終わらないことが多いため、ファビコンやホーム画面アイコンではうまく反映されないことがあります。

未設定の場合は、アプリ側の自動生成アイコンで動作します。

---

## 日々の運用

### 予定を追加したい

Google Calendarに予定を追加します。

数分後に自動反映されます。すぐ反映したい場合は、画面右下の `再読込` を押します。

### 今日だけ教室を変えたい

`kobetsu` に1行追加します。

| 日付 | 時限ID | 表示名 | 教室 | メモ | 開始上書き | 終了上書き | 扱い |
|---|---|---|---|---|---|---|---|
| 2026/06/24 | 3 |  | 視聴覚室 | 今日だけ教室変更 |  |  | 変更 |

### 今日だけ開始時刻を変えたい

`kobetsu` に開始上書きを入力します。

| 日付 | 時限ID | 表示名 | 教室 | メモ | 開始上書き | 終了上書き | 扱い |
|---|---|---|---|---|---|---|---|
| 2026/06/24 | 2 |  |  | HR延長で10分遅れ | 10:40 | 12:00 | 変更 |

### 火曜日だけど月曜授業にしたい

`special` に入力します。

| 日付 | 種別 | メモ | 時間割曜日 |
|---|---|---|---|
| 2026/06/30 | 通常 | 月曜授業日 | 月 |

### 短縮日課にしたい

`special` に入力します。

| 日付 | 種別 | メモ | 時間割曜日 |
|---|---|---|---|
| 2026/06/24 | 短縮 | 短縮45分日課 |  |

### 後期時間割に切り替えたい

`term` シートの日付範囲を確認します。

| term | start | end | memo |
|---|---|---|---|
| 後期 | 2026/10/01 | 2027/03/31 | 後期時間割 |

`time_table` の `term` 列に `後期` の行を用意します。

### 夏季休業・春季休業を設定したい

`term` シートに `kind` が `休業` の行を追加します。

| term | start | end | memo | kind |
|---|---|---|---|---|
| 夏季休業 | 2026/07/21 | 2026/08/31 | 夏休み | 休業 |
| 春季休業 | 2027/03/20 | 2027/03/31 | 春休み | 休業 |

休業期間中は、通常画面に `休業期間` と表示され、時間割は表示されません。Google Calendarの予定は通常どおり表示されます。

休業期間中でも、その日だけ授業や講習を表示したい場合は、`special` にその日付の行を追加します。`special` に明示的な行がある日は、休業よりもその日の設定が優先されます。

### ファビコンやホーム画面アイコンを変更したい

`setting` シートに以下を設定します。

| key | value |
|---|---|
| faviconUrl | `https://example.com/favicon.png` |
| appleTouchIconUrl | `https://example.com/apple-touch-icon.png` |
| icon192Url | `https://example.com/icon-192.png` |
| icon512Url | `https://example.com/icon-512.png` |

設定後、画面右下の `再読込` を押します。反映されない場合は、ブラウザやiOSのキャッシュが残っている可能性があります。

---

## 画面操作

### 表示モード切替

画面をタップすると表示モードが切り替わります。

```text
通常表示
↓
今日詳細
↓
明日詳細
↓
通常表示
```

### 再読込

右下の `再読込` を押すと、CalendarとSpreadsheetを再取得します。

### 夜間モード切替

右下の `夜間ON` または `夜間OFF` を押すと、夜間モードを手動で切り替えます。

`自動へ` を押すと、settingの `nightStart` / `nightEnd` に基づく自動判定に戻ります。

### 画面ON

右下の `画面ON` を押すと、対応ブラウザでは画面スリープ防止を有効にします。

### 全画面

右下の `全画面` を押すと、対応ブラウザでは全画面表示になります。

全画面中はボタン表示が `全画面解除` に変わります。

対応していないブラウザでは `全画面不可` と表示されます。

---

## 古いiPad向けレガシー表示

通常版の `index.html` が古いiPadで表示されない場合は、URLに `legacy=1` を付けて開きます。

秘密キーあり：

```text
https://script.google.com/macros/s/xxxxxxxxxxxx/exec?k=SECRET_KEY&legacy=1
```

秘密キーなし：

```text
https://script.google.com/macros/s/xxxxxxxxxxxx/exec?legacy=1
```

レガシー表示では、古いSafariで止まりやすい新しめのJavaScript構文やAPIを避けています。

主な違い：

| 項目 | 通常版 `index.html` | レガシー版 `legacy.html` |
|---|---|---|
| 対象 | 比較的新しいブラウザ | 古いiPad・古いSafari |
| 表示 | フル機能 | 基本表示中心 |
| 表示モード切替 | 対応 | 簡易表示 |
| 夜間モード | 対応 | 自動の簡易夜間表示 |
| 画面ON | 対応ブラウザで利用可能 | 非対応 |
| 全画面 | 対応ブラウザで利用可能 | 非対応 |
| PWA風表示 | 対応 | 非対応 |

レガシー表示でも、SpreadsheetやCalendarから取得するデータは通常版と同じです。

---

## ホーム画面に追加

### iPhone / iPad

1. SafariでWebアプリを開く
2. 共有ボタンを押す
3. `ホーム画面に追加` を選ぶ
4. 追加する

`setting` の `appleTouchIconUrl` を設定している場合、ホーム画面アイコンとして使われます。

### Android

1. ChromeでWebアプリを開く
2. メニューを開く
3. `ホーム画面に追加` を選ぶ
4. 追加する

`setting` の `icon192Url` / `icon512Url` を設定している場合、PWA/Android用アイコンとして使われます。

---

## トラブルシューティング

### 古いiPadで画面が表示されない

古いiPadのSafariでは、通常版のJavaScriptやブラウザAPIに対応しておらず、画面が真っ白になったり、読み込み中のまま止まったりすることがあります。

この場合は、レガシー版URLを使います。

```text
https://script.google.com/macros/s/xxxxxxxxxxxx/exec?k=SECRET_KEY&legacy=1
```

秘密キーを使っていない場合：

```text
https://script.google.com/macros/s/xxxxxxxxxxxx/exec?legacy=1
```

それでも表示されない場合は、以下を確認します。

- Apps Scriptに `legacy.html` を追加しているか
- Apps Script上のHTMLファイル名が `legacy` になっているか
- `doGet(e)` で `legacy=1` の切り替え処理を入れているか
- URLのパラメータが、既に `?k=...` を含む場合は `&legacy=1` になっているか
- iPadの日時設定が大きくずれていないか

### `legacy=1` を付けても通常版が出る

`Code.gs` の `doGet(e)` で、次のように `legacy` と `index` を切り替えているか確認します。

```javascript
const useLegacy = e && e.parameter && e.parameter.legacy === '1';
const template = HtmlService.createTemplateFromFile(useLegacy ? 'legacy' : 'index');
```

また、Webアプリを更新した後は、必要に応じて新しいデプロイまたは既存デプロイの更新を行ってください。

### レガシー表示で全画面や画面ONが使えない

レガシー表示では、古いブラウザで止まりやすい機能を避けるため、画面ONボタン、全画面ボタン、PWA風表示などは省略しています。

必要な場合は、端末側の設定で自動ロック時間を長めに変更してください。

### スプシを編集したのに反映されない

右下の `再読込` を押します。

それでも反映されない場合は、以下を確認します。

- シート名が `CONFIG` と一致しているか
- 日付の形式が正しいか
- 時限IDが `period` シートと一致しているか
- `term` が現在の期間と一致しているか

### 時間割が表示されない

以下を確認します。

- `time_table` に該当曜日の行があるか
- `term` 列が現在のtermと一致しているか
- `term` 列が空欄なら通年扱いになっているか
- `period` に同じ時限IDがあるか

### 今日が月曜授業にならない

`special` の `時間割曜日` に `月` と入っているか確認します。

### 短縮日課にならない

`special` の `種別` と、`period` シートの `種別` が完全に一致しているか確認します。

### 後期に切り替わらない

`term` シートの日付範囲を確認します。

また、`setting` の `currentTerm` に値が入っている場合、自動判定ではなく手動固定が優先されます。

### 夏季休業・春季休業にならない

以下を確認します。

- `term` シートの日付範囲が正しいか
- `kind` に `休業` と入っているか
- `term` 名に `夏季休業`、`春季休業`、`休暇` などの文字が入っているか
- 前期・後期の行と期間が重なっている場合、休業行が `term` シートに存在するか
- `setting` の `currentTerm` で別termに手動固定していないか
- `special` にその日付の明示的な行があり、休業表示を上書きしていないか

### スクリプト プロパティの設定漏れ

`SECRET_KEY` または `SPREADSHEET_ID` が未設定だと、認証やスプレッドシート読み込みで失敗します。

Apps Scriptの「プロジェクトの設定」→「スクリプト プロパティ」で以下を確認します。

- `SECRET_KEY`
- `SPREADSHEET_ID`
- 必要に応じて `CALENDAR_ID`

### 画面ONが効かない

ブラウザや端末が Screen Wake Lock API に対応していない可能性があります。

その場合は、端末側の画面スリープ設定を長めに変更します。

### 全画面が効かない

ブラウザや端末が Fullscreen API に対応していない可能性があります。

iPhone Safariでは全画面APIが制限される場合があります。ホーム画面に追加して使う方法も試してください。

### ファビコンが反映されない

以下を確認します。

- `setting` の `faviconUrl` が正しいか
- URLが公開HTTPSになっているか
- URLが `.png` や `.ico` などの拡張子で終わっているか
- ブラウザキャッシュが残っていないか

### ホーム画面アイコンが反映されない

以下を確認します。

- `appleTouchIconUrl` / `icon192Url` / `icon512Url` が正しいか
- URLが公開HTTPSになっているか
- iPhone/iPadの場合、既に追加済みのホーム画面アイコンを削除してから追加し直したか

---

## 年度更新時にやること

1. `term` シートの日付を新年度に更新する
2. `term` シートに夏季休業・春季休業などの休業期間を入れる
3. `time_table` の前期・後期時間割を更新する
4. `period` の時程を確認する
5. `special` に年間行事・短縮日課を入れる
6. `kobetsu` は必要に応じて整理する
7. `setting` の表示設定を確認する
8. スクリプト プロパティの `SECRET_KEY` / `SPREADSHEET_ID` を確認する
9. GASの `CONFIG` のシート名を確認する
10. Webアプリを開いて `再読込` を押す

---

## 更新履歴

### v14

- 古いiPad・古いSafari向けの `legacy.html` に対応
- URLパラメータ `legacy=1` で通常版とレガシー版を切り替え
- レガシー表示の説明とトラブルシューティングをREADMEに追加

### v13

- `SECRET_KEY` / `SPREADSHEET_ID` のスクリプト プロパティ管理に対応
- `term` シートの `kind` 列に対応
- 夏季休業・春季休業などの休業期間表示に対応
- 休業期間中は時間割を出さず、Google Calendar予定だけ表示

### v12

- ファビコン設定に対応
- ホーム画面アイコン設定
- 古いiPad・古いSafari向けのレガシー表示に対応
- `setting` に `faviconUrl` / `appleTouchIconUrl` / `icon192Url` / `icon512Url` を追加
- manifest icons を `setting` 由来に変更
- `HtmlOutput.setFaviconUrl()` 対応

### v11

- 全画面表示ボタンに対応
- `setting` に `enableFullscreen` を追加

### v10

- 前期・後期の時間割切替に対応
- `term` シート対応
- `time_table` の `term` 列対応

### v9

- PWA風表示に対応
- ホーム画面追加ヒントを追加
- 画面ONボタンを追加

### v8

- `setting` シート対応

### v7

- レスポンシブ表示に対応

### v6

- 手動再読込に対応
- GASキャッシュ強制更新に対応

### v5

- 夜間モード手動ON/OFFに対応

### v4

- 夜間モード
- 焼き付き防止
- 最終更新表示

### v3

- 秒表示
- タップで表示モード切替

### v2

- 明日表示

### v1

- 時計
- 現在の時限
- 次の時限
- Google Calendar予定
- 時間割スプレッドシート連携

## License

MIT License.

Copyright (c) 2026 Shoji Ogawa
