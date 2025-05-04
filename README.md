# GPT-4.1 Chat (Web版)

このリポジトリは、OpenAI社のAPIを使って簡単にチャットができるウェブアプリ「GPT-4.1 Chat」です。

## 主な特徴

- 複数のセッション（会話）管理
- 選べるOpenAIモデル（GPT-4.1 / 4o 等各種モデル）
- APIキーは端末内のみで管理（サーバー保存なし）

## クイックスタート

1. リポジトリをダウンロードまたはクローン（[GitHubページ](https://github.com/your-repo/your-app)）
2. 任意のWebサーバーまたはローカルで`index.html`を開く
3. 画面左上「メニュー」→ APIキーを入力（またはクリップボードから貼り付け）
   - [OpenAI APIキーはこちらで発行](https://platform.openai.com/account/api-keys)
4. モデル選択と入力欄を利用してチャットスタート
5. 履歴やセッション情報はお使いのブラウザ内（ローカルストレージ）で自動管理されます

## 必要なもの

- ご自身の [OpenAI APIキー](https://platform.openai.com/account/api-keys)
- モダンなWebブラウザ（Chrome, Edge, Firefox, 最新Safari等）

## 使い方

- 新しい会話を始める場合：「メニュー」→「＋新しいセッション」
- モデル切替：入力バー上部のプルダウン
- 入力：エンターで送信／Shift+エンターで改行
- APIキー貼り付け：鍵入力欄横の📋ボタン

## 注意
- APIキーはブラウザのローカルにのみ保存されます。OpenAIのAPIサーバーを除く外部に送信はしません。
- 本アプリは個人・検証用のサンプルです。API利用料金などは自己責任でご利用ください。
- GitHub Pages等で公開する場合、APIキーの管理には十分ご注意ください。
