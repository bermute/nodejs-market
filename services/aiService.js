const OpenAI = require("openai");

let client;

// OpenAI 클라이언트를 한 번만 생성해 재사용합니다.
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return client;
}

// 판매글 기본 설명을 생성하는 함수 (이미지까지 함께 전달)
async function generateSalePostDescription({
  title,
  price,
  location,
  extraDescription = "",
  imageBase64 = "",
  imageMime = "image/jpeg"
}) {
  const openai = getClient();

  const baseSystemPrompt = `
당신은 중고거래 플랫폼의 판매글을 대신 써주는 도우미입니다.
이미지와 사용자가 입력한 정보를 모두 참고해 물건을 정확히 파악하려고 노력하세요.
반드시 제품 정보를 바탕으로 제목 / 가격 멘트 / 상세 설명을 만들어 주세요.
사용기간이 모호하면 "사용기간: OO년 사용"과 같이 표기해 주세요.
`.trim();

  const userText = `
아래 이미지는 사용자가 중고거래로 판매하려는 물건입니다.
이미지와 텍스트를 모두 참고해서,
1) 판매글 제목(1줄)
2) 가격 관련 멘트(시세, 에누리 가능 여부 등)
3) 상세 설명(상태, 특징, 색상, 용도, 사용기간 미확실 시 "사용기간: OO년 사용")
을 한국어로 자연스럽게 작성해주세요.

사용자 입력 정보:
- 제목(초안): ${title || "(미입력)"}
- 희망 가격: ${price ? `${price}원` : "(미입력)"}
- 거래 지역: ${location || "(미입력)"}
- 추가 설명: ${extraDescription || "(없음)"}
`.trim();

  async function requestCompletion({ includeImage, model = "gpt-4o" }) {
    const content = [{ type: "input_text", text: userText }];
    if (includeImage && imageBase64) {
      content.push({
        type: "input_image",
        image_url: `data:${imageMime};base64,${imageBase64}`
      });
    }

    const response = await openai.responses.create({
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: includeImage ? baseSystemPrompt : `${baseSystemPrompt}\n이미지는 제공되지 않았습니다. 텍스트 정보를 바탕으로만 작성하세요.` }] },
        { role: "user", content }
      ]
    });

    return response.output_text || "";
  }

  function looksLikeRefusal(text) {
    return /죄송하지만|도와드리기 어렵습니다|I'm sorry/i.test(text);
  }

  let textOutput = "";
  try {
    textOutput = await requestCompletion({ includeImage: Boolean(imageBase64), model: "gpt-4o" });
  } catch (error) {
    console.error("이미지 포함 요청 실패, 텍스트만으로 재시도합니다.", error);
  }

  if (!textOutput || looksLikeRefusal(textOutput)) {
    textOutput = await requestCompletion({ includeImage: false, model: "gpt-4o-mini" });
  }

  const [firstLine, ...rest] = textOutput.split("\n").filter(Boolean);
  return {
    title: firstLine?.trim() || `${title || "새 상품"} 중고 판매글`,
    body: rest.join("\n").trim() || textOutput.trim()
  };
}

module.exports = {
  generateSalePostDescription
};

