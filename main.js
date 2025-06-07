const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

class EcosapiensBot {
  constructor() {
    this.baseURL = "https://api.prod.ecosapiens.xyz";
    this.cookie = process.env.COOKIE;
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

  async scrapePexelsImages(searchQuery, maxImages = 100) {
    console.log(`Scraping Pexels API for query: "${searchQuery}"...`);
    if (!process.env.PEXELS_API_KEY) {
      throw new Error("Pexels API key is missing from .env file.");
    }

    try {
      const response = await axios.get(`https://api.pexels.com/v1/search`, {
        params: {
          query: searchQuery,
          per_page: maxImages,
          orientation: "square",
        },
        headers: { Authorization: process.env.PEXELS_API_KEY },
        timeout: 10000,
      });

      if (
        response.data &&
        response.data.photos &&
        response.data.photos.length > 0
      ) {
        return response.data.photos.map((photo) => ({
          url: photo.src.large,
          alt: photo.alt || searchQuery,
        }));
      }
      return [];
    } catch (error) {
      console.log(`Failed to scrape Pexels API: ${error.message}`);
      return [];
    }
  }

  async downloadImageToBuffer(url) {
    const response = await axios({
      method: "GET",
      url: url,
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

  async checkScanResult(scanId) {
    return (
      await axios.get(`${this.baseURL}/api/scans/${scanId}`, {
        headers: this.getHeaders(),
        timeout: 5000,
      })
    ).data;
  }

  async waitForScanComplete(scanId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.checkScanResult(scanId);
      if (result.status === "completed") {
        process.stdout.write("\r" + " ".repeat(50) + "\r");
        return result;
      } else if (result.status === "failed") {
        process.stdout.write("\n");
        throw new Error(
          `Scan failed: ${result.failure_reason || "Unknown reason"}`
        );
      }
      process.stdout.write(
        `Processing scan ${scanId}... (${i + 1}/${maxAttempts})\r`
      );
      await this.sleep(2000);
    }
    process.stdout.write("\n");
    throw new Error("Scan timeout");
  }

  async performSimpleScan() {
    const randomCategory =
      this.searchCategories[
        Math.floor(Math.random() * this.searchCategories.length)
      ];
    const searchQuery = `${randomCategory} product`;

    const imageUrls = await this.scrapePexelsImages(searchQuery);

    if (imageUrls.length === 0) {
      throw new Error(`No images found for "${searchQuery}" on Pexels.`);
    }

    const randomImage = imageUrls[Math.floor(Math.random() * imageUrls.length)];
    console.log(`Selected image from Pexels: ${randomImage.alt}`);

    console.log(`Downloading image...`);
    const imageBuffer = await this.downloadImageToBuffer(randomImage.url);
    const filename = `scan_${Date.now()}.jpg`;

    console.log("Uploading image for scanning...");
    const scanResult = await this.uploadImageBuffer(imageBuffer, filename);
    console.log(`Scan initiated with ID: ${scanResult.id}`);

    const completedScan = await this.waitForScanComplete(scanResult.id);

    if (completedScan.product) {
      console.log(
        `Product Scanned: ${completedScan.product.name || "Unknown"}`
      );
      console.log(`Score: ${completedScan.product.score || "Not available"}`);
    } else {
      console.log("No product information in result");
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getUserInfo() {
    return (
      await axios.get(`${this.baseURL}/api/session`, {
        headers: this.getHeaders(),
        timeout: 5000,
      })
    ).data.current_user;
  }

  async validateCookie() {
    if (!this.cookie) {
      console.log("COOKIE not set in .env file.");
      return false;
    }
    if (!process.env.PEXELS_API_KEY) {
      console.log("PEXELS_API_KEY not set in .env file.");
      return false;
    }
    return true;
  }

  async run() {
    try {
      if (!(await this.validateCookie())) return;

      const userInfo = await this.getUserInfo();
      console.log("User Information:");
      console.log(
        `Name: ${userInfo?.name || userInfo?.first_name || "Unknown"}`
      );
      console.log(`Email: ${userInfo?.email || "Unknown"}`);
      console.log(`User ID: ${userInfo?.id || "Unknown"}`);
      console.log();

      let successCount = 0;
      let failCount = 0;
      let scanNumber = 1;

      process.on("SIGINT", () => {
        console.log("\n\nScan stopped by user.");
        console.log("Final Summary:");
        console.log(`Successful scans: ${successCount}`);
        console.log(`Failed scans: ${failCount}`);
        process.exit(0);
      });

      console.log(
        "Starting continuous scanning (with Pexels API)... Press CTRL+C to stop."
      );
      console.log();

      while (true) {
        try {
          console.log(`--- Performing scan #${scanNumber} ---`);
          await this.performSimpleScan();
          console.log(`Scan #${scanNumber} completed successfully!`);
          successCount++;
        } catch (error) {
          console.log(`Scan #${scanNumber} failed: ${error.message}`);
          failCount++;
        }

        scanNumber++;
        console.log("--------------------------------------");
        console.log(
          `Current stats: ${successCount} success, ${failCount} fail`
        );
        console.log("Waiting before next scan cycle...");
        console.log();
        await this.sleep(5000 + Math.random() * 3000);
      }
    } catch (error) {
      console.log(`Bot crashed: ${error.message}`);
    }
  }
}

const bot = new EcosapiensBot();
bot.run();
