
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ManzaiLine, ManzaiScript } from "../types";

// Generates a manzai script using Gemini 3 Pro for complex creative writing
export const generateManzaiScript = async (params: {
  duoName: string;
  concept: string;
  length: string;
  tone: string;
}): Promise<ManzaiScript> => {
  // Initialize AI client right before use to catch the latest API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  const prompt = `あなたは日本屈指の放送作家です。以下の条件で、爆笑を誘う最高の漫才台本を執筆してください。
  
  【条件】
  ・コンビ風スタイル: ${params.duoName}
  ・ネタのコンセプト: ${params.concept}
  ・尺（想定長さ）: ${params.length}
  ・笑いのテンション: ${params.tone}
  
  【出力形式】
  JSON形式で、以下の構造で出力してください。
  {
    "title": "ネタのタイトル",
    "duoStyle": "${params.duoName}",
    "content": [
      {"role": "Boke", "text": "セリフ内容"},
      {"role": "Tsukkomi", "text": "セリフ内容"},
      {"role": "Action", "text": "（動作や状況説明）"}
    ]
  }
  
  ボケとツッコミの掛け合いを大切にし、${params.duoName}らしい口癖や間を再現してください。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // Gemini 3 Pro supports thinking for better reasoning in creative tasks
      thinkingConfig: { thinkingBudget: 4000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          duoStyle: { type: Type.STRING },
          content: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING, enum: ["Boke", "Tsukkomi", "Action"] },
                text: { type: Type.STRING }
              },
              required: ["role", "text"]
            }
          }
        },
        required: ["title", "duoStyle", "content"]
      }
    }
  });

  // response.text is a getter, handle potential undefined
  const rawJson = response.text || "{}";
  const parsed = JSON.parse(rawJson);
  
  if (!parsed.content) {
    throw new Error("Failed to generate script content");
  }

  return {
    ...parsed,
    content: (parsed.content || []).map((line: any, index: number) => ({
      ...line,
      id: `line-${index}`
    }))
  };
};

// Remakes a specific boke line using a faster model
export const remakeBoke = async (originalLine: string, duoName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const prompt = `以下の漫才のボケを、${duoName}らしい、より面白くパンチのあるボケに書き換えてください。
  元のボケ: "${originalLine}"
  出力は書き換えたセリフのみを返してください。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  
  return response.text?.trim() || originalLine;
};

// Generates a simulation video using Veo 3.1
export const generateSimulationVideo = async (
  prompt: string, 
  images: string[] // base64 strings
): Promise<string> => {
  // Initialize AI client right before use as Veo models require up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  let videoConfig: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A dynamic manzai comedy duo performing on stage with a spotlight. ${prompt}. High quality, 4k, cinematic lighting.`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  };

  // If we have images, use the first as starting frame. Base64 data only.
  if (images.length > 0) {
    const base64Data = images[0].includes(',') ? images[0].split(',')[1] : images[0];
    videoConfig.image = {
      imageBytes: base64Data,
      mimeType: 'image/png'
    };
  }

  let operation = await ai.models.generateVideos(videoConfig);
  
  // Polling for video generation completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation failed - no download link returned");
  }
  
  // Append API key to the download link as required by the documentation
  return `${downloadLink}&key=${process.env.API_KEY}`;
};
