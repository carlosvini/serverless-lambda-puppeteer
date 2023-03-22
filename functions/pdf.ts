import middy from "middy";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import url from 'url';
import {
  cors,
  doNotWaitForEmptyEventLoop,
  httpHeaderNormalizer,
  httpErrorHandler
} from "middy/middlewares";

const handler = async (event: any) => {
  const executablePath = event.isOffline
    ? "./node_modules/puppeteer/.local-chromium/mac-674921/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
    : await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath
  });

  const page = await browser.newPage();
  const parsedUrl = url.parse(event.queryStringParameters.url);
  if (!parsedUrl.hostname.match(/\.salvistas\.com\.br$/)) {
    throw new Error("Invalid hostname: "+event.queryStringParameters.url);
  }
  await page.goto(event.queryStringParameters.url, {
    waitUntil: ["networkidle0", "load", "domcontentloaded"]
  });

  const pdfStream = await page.pdf();

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      "Content-type": "application/pdf"
    },
    body: pdfStream.toString("base64")
  };
};

export const generate = middy(handler)
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(doNotWaitForEmptyEventLoop())
  .use(httpErrorHandler());
