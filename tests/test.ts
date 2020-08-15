import {
  sanitizeFilename,
  extractJSONLink,
  fetchJSON,
  extractFallbackURL,
  makeAudioURL,
  downloadVideo
} from "../src/index";

jest.setTimeout(60000);

const REDDIT_LINK = `https://www.reddit.com/r/PewdiepieSubmissions/comments/ia0kw4/i_think_youll_enjoy_this_one/?utm_medium=android_app&utm_source=share`;
const EXPECTED_JSON_LINK = `https://www.reddit.com/r/PewdiepieSubmissions/comments/ia0kw4/i_think_youll_enjoy_this_one.json`;
const EXPECTED_FALLBACK_URL = `https://v.redd.it/267bw5ug73h51/DASH_1080.mp4?source=fallback`;
const EXPECTED_AUDIO_URL = `https://v.redd.it/267bw5ug73h51/DASH_audio.mp4`;
const POST_NAME = `I think you'll enjoy this one`;
const OUTPUT_FILENAME = `I_think_youll_enjoy_this_one`;

test(`Extract JSON Link`, () => {
  expect(extractJSONLink(REDDIT_LINK))
    .toBe(EXPECTED_JSON_LINK);
});

test(`Fetch JSON`, async () => {
  const fetchedJSON = await fetchJSON(EXPECTED_JSON_LINK);
  console.log(fetchedJSON[0].data.children[0].data.secure_media);

  expect(fetchedJSON)
    .toBeTruthy();
});

test(`Extract Fallback URL`, async () => {
  const fetchedJSON = await fetchJSON(EXPECTED_JSON_LINK);
  const fallbackURL = extractFallbackURL(fetchedJSON);

  expect(fallbackURL)
    .toBe(EXPECTED_FALLBACK_URL);
});

test(`Make Audio URL`, () => {
  const audioURL = makeAudioURL(EXPECTED_FALLBACK_URL);

  expect(audioURL)
    .toBe(EXPECTED_AUDIO_URL);
});

test(`Dowload Audio and Video files`, async () => {
  const fileCode = await downloadVideo(REDDIT_LINK);
  console.log(`File Code:`, fileCode);

  expect(fileCode)
    .toBeTruthy();
});

test(`Path`, () => {
  const outputFilename = sanitizeFilename(POST_NAME);
  console.log(outputFilename);

  expect(outputFilename)
    .toBe(OUTPUT_FILENAME);
});
