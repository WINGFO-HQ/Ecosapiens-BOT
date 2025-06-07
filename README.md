# Ecosapiens Bot

A simple Node.js bot for automating scans on Ecosapiens. It features multi-account support and a real-time dynamic dashboard in your terminal.

## Features

- **Multi-Account Support**: Run the bot for multiple accounts by simply adding their cookies to a file.
- **Dynamic Dashboard**: A clean, real-time terminal dashboard shows the status, points, and latest scan results for each account.
- **Automated Scanning**: Uses the Pexels API to find and scan random product images.
- **Real-time Point Updates**: Automatically fetches and updates user points after each successful scan.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm (comes with Node.js)

## Setup

Follow these steps to set up and configure the bot.

### 1\. Register for Ecosapiens

If you don't have an account, you can register using the link below:

- **Registration Link**: [Ecosapiens](https://prod.ecosapiens.xyz/mobile/login/register/?referral_code=OLYQU5V6)

After registering, make sure to **verify your email address**.

### 2\. Get Pexels API Key

The bot uses Pexels to get images for scanning.

- Create a free Pexels account and get your API key here: [https://www.pexels.com](https://www.pexels.com/api/key/)

### 3\. Get Your Ecosapiens Cookie

You need to get the session cookie from your browser after logging in.

1.  Log in to your [Ecosapiens account](https://prod.ecosapiens.xyz/mobile/login/).
2.  After a successful login, press `F12` on your keyboard to open the Developer Tools.
3.  Go to the **Network** tab.
4.  Refresh the page (press `F5`). You will see a list of network requests.
5.  Find and click on any request to `api.prod.ecosapiens.xyz` (e.g., `loot_total`).
6.  In the panel that appears, look for the **Request Headers** section.
7.  Find the `cookie` header. The value will be a long string of text that starts with `_ecolink_session=...`.
8.  **Copy the entire value** of the cookie.

### 4\. Configure the Bot

In the same directory as the `main.js` file, create two new files:

- **`api.key`**:
  Create this file and paste your **Pexels API Key** into it.

- **`cookie.key`**:
  Create this file and paste the **Ecosapiens cookie** you copied in the previous step. If you have multiple accounts, paste each cookie on a new line.

  _Example `cookie.key` for two accounts:_

  ```
  _ecolink_session=first_account_cookie_string...
  _ecolink_session=second_account_cookie_string...
  ```

### 5\. Install Dependencies

Open your terminal or command prompt in the project directory and run:

```bash
npm install
```

## Usage

To run the bot, execute the following command in your terminal:

```bash
node main.js
```

The dashboard will appear and the bot will start its cycle. To stop the bot, press `CTRL+C`.

## Dashboard Preview

```
┌───┬────────────────────────┬──────────┬────────────────────────┬───────────────────────────┬───────┬─────────┬──────┐
│ # │ User                   │ Points   │ Status                 │ Last Product              │ Score │ Success │ Fail │
├───┼────────────────────────┼──────────┼────────────────────────┼───────────────────────────┼───────┼─────────┼──────┤
│ 1 │ jawir123               │ 1520     │ Success                │ Shampoo Bottle XYZ        │ 85    │ 2       │ 0    │
├───┼────────────────────────┼──────────┼────────────────────────┼───────────────────────────┼───────┼─────────┼──────┤
│ 2 │ jawir1234              │ 875      │ Processing... (15/30)  │ Biscuit Package ABC       │ 72    │ 1       │ 0    │
└───┴────────────────────────┴──────────┴────────────────────────┴───────────────────────────┴───────┴─────────┴──────┘

Total Success: 3 | Total Fails: 0 | Total Accounts: 2
Press CTRL+C to exit.


Account 2 is running...

**Disclaimer:** This bot is for educational purposes only. The use of automation tools may be against the terms of service of the target website. Use it at your own risk.
```
