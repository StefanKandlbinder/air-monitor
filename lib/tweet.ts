import { TwitterApi } from "twitter-api-v2";
import type { AirDataResult } from "@/lib/types";

function buildTweetMessage(data: AirDataResult): string {
  const from = new Date().toJSON().slice(0, 16).replace("T", " ");

  if (data.mean === "TMW" && data.component === "PM10") {
    return `Der #Tagesmittelwert #${data.component} von ${data.value} ug/m3 bei der Messstation ${data.stationHash} hat am ${from.slice(0, 10)} den Grenzwert von ${data.limit} ug/m3 #ueberschritten!`;
  }

  if (data.mean === "TMW" && data.component === "PM25") {
    return `Der #Tagesmittelwert #${data.component} von ${data.value} ug/m3 bei der Messstation ${data.stationHash} hat den jaehrlichen Grenzwert von ${data.limit} ug/m3 #ueberschritten!`;
  }

  if (data.mean === "TMW" && data.component === "NO2") {
    return `Der #Tagesmittelwert #${data.component} von ${data.value} ug/m3 bei der Messstation ${data.stationHash} hat den jaehrlichen Grenzwert von ${data.limit} ug/m3 #ueberschritten!`;
  }

  if (data.component === "PM10") {
    return `Der #Stundenmittelwert #${data.component} bei der Messstation ${data.stationHash} betraegt ${data.value} ug/m3 bei einem zulaessigen Tagesmittelwert von ${data.limit} ug/m3.`;
  }

  if (data.component === "PM25") {
    return `Der #Stundenmittelwert #${data.component} bei der Messstation ${data.stationHash} betraegt ${data.value} ug/m3 bei einem zulaessigen Jahresmittelwert von ${data.limit} ug/m3.`;
  }

  return `Der #Stundenmittelwert #${data.component} bei der Messstation ${data.stationHash} betraegt ${data.value} ug/m3 bei einem zulaessigen Jahresmittelwert von ${data.limit} ug/m3.`;
}

function getTwitterClient(): TwitterApi {
  const appKey = process.env.TWITTER_APP_KEY;
  const appSecret = process.env.TWITTER_APP_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error("Twitter credentials are missing. Set TWITTER_* env vars.");
  }

  return new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret
  });
}

export async function maybeTweet(data: AirDataResult): Promise<{ tweeted: boolean; message: string }> {
  if (parseFloat(data.value) < data.limit) {
    return { tweeted: false, message: "" };
  }

  const message = buildTweetMessage(data);
  const twitterClient = getTwitterClient();
  await twitterClient.v2.tweet(message);

  return { tweeted: true, message };
}
