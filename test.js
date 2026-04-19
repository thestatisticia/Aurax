const SELANET_API_KEY = "REPLACED_WITH_SECURE_TOKEN"; // DO NOT HARDCODE KEYS

async function testApi() {
  const url = `https://api.selanet.ai/v1/browse`;
  const req = {
    parse_only: true,
    x_params: { feature: 'profile', url: 'https://x.com/elonmusk' }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SELANET_API_KEY}`,
      },
      body: JSON.stringify(req),
    });

    const data = await res.json();
    console.log("Root keys:", Object.keys(data));
    if (data.content) {
      console.log("Content length:", data.content.length);
      console.log("First item keys:", Object.keys(data.content[0]));
      console.log("First item role:", data.content[0].role);
      
      const profileItem = data.content.find(c => c.role === 'profile');
      if (profileItem) {
        console.log("Found profile item, fields:", Object.keys(profileItem.fields));
      } else {
        console.log("NO PROFILE ITEM FOUND in content array!");
      }
    } else {
      console.log("NO CONTENT ARRAY", data);
    }
  } catch(e) {
    console.error(e);
  }
}

testApi();
