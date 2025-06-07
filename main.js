const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const Table = require("cli-table3");
const logUpdate = require("log-update");

class EcosapiensBot {
  constructor(cookie, pexelsApiKey) {
    this.baseURL = "https://api.prod.ecosapiens.xyz";
    this.cookie = cookie;
    this.pexelsApiKey = pexelsApiKey;
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36";

    this.searchCategories = [
      "shampoo bottle",
      "soda can",
      "cereal box",
      "milk carton",
      "biscuit package",
      "chocolate bar",
      "toothpaste box",
      "canned soup",
      "laundry detergent",
      "book cover",
      "vitamin bottle",
      "instant noodle package",
      "coffee bag",
      "tea box",
      "juice box",
      "snack bag",
    ];
  }

  getHeaders() {
    return {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": this.userAgent,
      cookie: this.cookie,
      Referer: "https://prod.ecosapiens.xyz/",
    };
  }

  async getLootTotal() {
    const response = await axios.get(
      `${this.baseURL}/api/users/me/loot_total`,
      {
        headers: this.getHeaders(),
        timeout: 5000,
      }
    );
    return response.data?.total_points;
  }

  async performSimpleScan(onProgress) {
    const randomCategory =
      this.searchCategories[
        Math.floor(Math.random() * this.searchCategories.length)
      ];
    const searchQuery = `${randomCategory} product`;

    onProgress(`Scraping Pexels...`);
    const imageUrls = await this.scrapePexelsImages(searchQuery);

    if (imageUrls.length === 0)
      throw new Error(`No images found: ${searchQuery}`);

    onProgress(`Downloading image...`);
    const imageBuffer = await this.downloadImageToBuffer(
      imageUrls[Math.floor(Math.random() * imageUrls.length)].url
    );

    onProgress("Uploading image...");
    const scanResult = await this.uploadImageBuffer(
      imageBuffer,
      `scan_${Date.now()}.jpg`
    );

    onProgress(`Waiting for scan result...`);
    return await this.waitForScanComplete(scanResult.id, onProgress);
  }

  async scrapePexelsImages(searchQuery, maxImages = 100) {
    if (!this.pexelsApiKey) throw new Error("Pexels API key is missing.");
    try {
      const response = await axios.get("https://api.pexels.com/v1/search", {
        params: {
          query: searchQuery,
          per_page: maxImages,
          orientation: "square",
        },
        headers: { Authorization: this.pexelsApiKey },
        timeout: 10000,
      });
      return (
        response.data?.photos?.map((p) => ({
          url: p.src.large,
          alt: p.alt || searchQuery,
        })) || []
      );
    } catch (error) {
      throw new Error(`Pexels API Error: ${error.message}`);
    }
  }

  async downloadImageToBuffer(url) {
    const response = await axios({
      method: "GET",
      url,
      responseType: "arraybuffer",
      timeout: 15000,
    });
    return Buffer.from(response.data);
  }

  async uploadImageBuffer(imageBuffer, filename) {
    const formData = new FormData();
    formData.append("image", imageBuffer, {
      filename,
      contentType: "image/jpeg",
    });
    const response = await axios.post(`${this.baseURL}/api/scans`, formData, {
      headers: { ...this.getHeaders(), ...formData.getHeaders() },
      timeout: 15000,
    });
    return response.data;
  }

  async waitForScanComplete(scanId, onProgress) {
    for (let i = 0; i < 30; i++) {
      const result = await this.checkScanResult(scanId);
      if (result.status === "completed") return result;
      if (result.status === "failed")
        throw new Error(`Scan failed: ${result.failure_reason || "Unknown"}`);
      onProgress(`Processing... (${i + 1}/30)`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Scan timeout");
  }

  async checkScanResult(scanId) {
    return (
      await axios.get(`${this.baseURL}/api/scans/${scanId}`, {
        headers: this.getHeaders(),
        timeout: 5000,
      })
    ).data;
  }

  async getUserInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/api/session`, {
        headers: this.getHeaders(),
        timeout: 5000,
      });
      return response.data.current_user;
    } catch (error) {
      if (error.response?.status === 401)
        throw new Error("Cookie is invalid or expired.");
      throw error;
    }
  }
}

async function main() {
  console.log("Ecosapiens BOT");
  console.log("https://t.me/infomindao");

  let pexelsApiKey, cookies;
  try {
    pexelsApiKey = fs.readFileSync("api.key", "utf-8").trim();
    cookies = fs
      .readFileSync("cookie.key", "utf-8")
      .split(/\r?\n/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (!pexelsApiKey || cookies.length === 0)
      throw new Error("Config file missing or empty.");
  } catch (e) {
    console.error(
      `Error: Pastikan 'api.key' dan 'cookie.key' ada dan tidak kosong. ${e.message}`
    );
    return;
  }

  let accountsStatus = cookies.map((_, i) => ({
    id: i + 1,
    user: "Initializing...",
    points: "N/A",
    status: "Queued",
    lastProduct: "N/A",
    lastScore: "N/A",
    success: 0,
    fail: 0,
  }));
  let totalSuccess = 0,
    totalFail = 0;
  let globalMessage = "";

  const renderDashboard = () => {
    const table = new Table({
      head: [
        "#",
        "User",
        "Points",
        "Status",
        "Last Product",
        "Score",
        "Success",
        "Fail",
      ],
      colWidths: [3, 22, 10, 22, 25, 7, 9, 6],
      style: { head: ["cyan"] },
    });
    accountsStatus.forEach((acc) => {
      let statusColor = { fg: "yellow" };
      if (acc.status.toLowerCase().includes("success"))
        statusColor = { fg: "green" };
      if (
        acc.status.toLowerCase().includes("fail") ||
        acc.status.toLowerCase().includes("error")
      )
        statusColor = { fg: "red" };
      table.push([
        acc.id,
        acc.user,
        { content: acc.points, style: { fg: "magenta" } },
        { content: acc.status, style: statusColor },
        acc.lastProduct,
        acc.lastScore,
        { content: acc.success, style: { fg: "green" } },
        { content: acc.fail, style: { fg: "red" } },
      ]);
    });
    const summary = `\nTotal Success: ${totalSuccess} | Total Fails: ${totalFail} | Total Accounts: ${cookies.length}\nPress CTRL+C to exit.`;
    logUpdate(table.toString() + summary + `\n\n${globalMessage}`);
  };

  const dynamicSleep = async (durationMs, onTick) => {
    const steps = Math.floor(durationMs / 1000);
    for (let i = steps; i >= 1; i--) {
      onTick(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  process.on("SIGINT", () => {
    logUpdate.done();
    console.log("\n\nScan stopped by user.");
    process.exit(0);
  });

  globalMessage = "Fetching user info for all accounts...";
  renderDashboard();
  for (let i = 0; i < accountsStatus.length; i++) {
    const bot = new EcosapiensBot(cookies[i], pexelsApiKey);
    try {
      const userInfo = await bot.getUserInfo();
      const lootTotal = await bot.getLootTotal();
      accountsStatus[i].user =
        userInfo?.name ||
        userInfo?.first_name ||
        userInfo?.email ||
        `User ${i + 1}`;
      accountsStatus[i].points = lootTotal ?? "N/A";
    } catch (e) {
      accountsStatus[i].user = `User ${i + 1}`;
      accountsStatus[i].status = "Error: Invalid Cookie";
      accountsStatus[i].fail++;
      totalFail++;
    }
  }
  globalMessage = "Initialization complete. Starting cycles...";
  renderDashboard();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  while (true) {
    for (let i = 0; i < cookies.length; i++) {
      if (accountsStatus[i].status.includes("Error:")) continue;

      const bot = new EcosapiensBot(cookies[i], pexelsApiKey);
      try {
        const scanResult = await bot.performSimpleScan((progress) => {
          accountsStatus[i].status = progress;
          globalMessage = `Account ${i + 1} is running...`;
          renderDashboard();
        });

        if (scanResult.product) {
          accountsStatus[i].status = "Success";
          accountsStatus[i].lastProduct =
            scanResult.product.name?.substring(0, 22) || "Unknown";
          accountsStatus[i].lastScore = scanResult.product.score ?? "N/A";
        } else {
          accountsStatus[i].status = "Success (No Product)";
          accountsStatus[i].lastProduct = "No product found";
          accountsStatus[i].lastScore = "N/A";
        }
        accountsStatus[i].success++;
        totalSuccess++;

        accountsStatus[i].status = "Updating points...";
        renderDashboard();
        try {
          const updatedPoints = await bot.getLootTotal();
          accountsStatus[i].points = updatedPoints ?? accountsStatus[i].points;
        } catch (pointError) {}
      } catch (error) {
        accountsStatus[i].fail++;
        totalFail++;
        accountsStatus[i].status = `Failed: ${error.message.substring(0, 20)}`;
        accountsStatus[i].lastProduct = "-------";
        accountsStatus[i].lastScore = "---";
      }
      renderDashboard();

      if (i < cookies.length - 1) {
        const delay = 5000 + Math.random() * 3000;
        await dynamicSleep(delay, (s) => {
          accountsStatus[i].status = `Waiting...`;
          globalMessage = `Next account starting in ${s}s`;
          renderDashboard();
        });
      }
    }

    const cycleDelay = 10000 + Math.random() * 5000;
    accountsStatus.forEach((acc) => {
      if (!acc.status.includes("Error")) acc.status = "Queued for next cycle";
    });
    await dynamicSleep(cycleDelay, (s) => {
      globalMessage = `All accounts processed. Next cycle in ${s}s...`;
      renderDashboard();
    });
  }
}

main().catch((e) => console.error(`\nBot crashed: ${e.message}`));
