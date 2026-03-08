export async function loadMetadata() {
  const base = "https://raw.githubusercontent.com/SartorialGrunt0";

  async function load(url: string) {
    const res = await fetch(url);

    const text = await res.text();
    console.log("Fetching:", url);
    console.log("Response preview:", text.slice(0, 200));

    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("JSON parse error for:", url);
      console.error(err);
      throw err;
    }
  }

  const extruders = await load(
    `${base}/Awesome-Extruders/main/metadata.json`
  );

  const toolheads = await load(
    `${base}/Awesome-Toolheads/main/metadata.json`
  );

  const hotends = await load(
    `${base}/Awesome-Hotends/main/metadata.json`
  );

  return { extruders, toolheads, hotends };
}


