# Conductor Macro Editor

[Conductor キーボード](https://github.com/pite1222/conductor) の ZMK マクロをブラウザから作成・編集・デプロイできるツールです。

Conductor Studio 2.0 ではマクロの編集ができないため、keymap ファイルを直接編集する必要があります。このツールはその作業をGUIで行えるようにします。

**https://jprabadi-ship-it.github.io/conductor-macro-editor/**

## できること

- **マクロ作成** — キーの組み合わせやディレイをGUIで組み立て
- **レイヤー割り当て** — 実機と同じキーボード表示上でクリックして配置
- **ワンクリックデプロイ** — Commit & Push するとファームウェアが自動ビルド
- **マクロのキャッシュ** — ブラウザに保存して新ブランチへの移行を簡単に
- **エクスポート/インポート** — JSON ファイルでバックアップ・共有

## はじめかた

1. [GitHub アカウント](https://github.com/signup)を作成（無料）
2. [Conductor 公式リポジトリ](https://github.com/pite1222/conductor)をフォーク
3. フォーク先の「Actions」タブで自動ビルドを有効化（初回のみ）
4. [Macro Editor](https://jprabadi-ship-it.github.io/conductor-macro-editor/) にアクセスして GitHub でログイン

詳しい手順は[セットアップガイド](https://jprabadi-ship-it.github.io/conductor-macro-editor/guide.html)をご覧ください。

## 技術情報

- 静的 SPA（vanilla HTML/CSS/JS、ビルドステップなし）
- GitHub API で keymap ファイルを直接読み書き
- GitHub OAuth Device Flow 認証（PAT 手動作成不要）
- Cloudflare Worker で OAuth エンドポイントの CORS プロキシ

### なぜ Conductor Studio ではマクロを編集できないのか

ZMK Studio は NVS（不揮発ストレージ）を通じたレイヤーバインディングのランタイム変更のみをサポートしています。マクロは可変長のキーシーケンスで構成されるため、NVS での動的管理には ZMK 本体の RPC プロトコル拡張・ファームウェア側のマクロインタプリタ・Studio UI の3層すべての開発が必要です。このツールはその制約を迂回し、keymap ファイルを直接編集する方式でマクロ機能を実現しています。

## ライセンス

MIT
