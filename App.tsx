
import React, { useState, useCallback, useRef } from 'react';
import { 
  ComedyStyle, 
  ScriptLength, 
  ToneType, 
  ManzaiScript, 
  ManzaiLine, 
  PresetCharacter 
} from './types';
import { DUO_PRESETS, CHARACTER_PRESETS } from './constants';
import { generateManzaiScript, remakeBoke, generateSimulationVideo } from './services/gemini';
import { Button } from './components/Button';

// Extend Window interface for aistudio properties
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  // Input States
  const [selectedDuo, setSelectedDuo] = useState(DUO_PRESETS[0].name);
  const [concept, setConcept] = useState('');
  const [length, setLength] = useState<ScriptLength>(ScriptLength.MEDIUM);
  const [tone, setTone] = useState<ToneType>(ToneType.CLASSIC);
  
  // Script State
  const [script, setScript] = useState<ManzaiScript | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  
  // Simulation State
  const [showSimulation, setShowSimulation] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<PresetCharacter | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!concept) return;
    setIsGenerating(true);
    try {
      const newScript = await generateManzaiScript({
        duoName: selectedDuo,
        concept,
        length,
        tone
      });
      setScript(newScript);
    } catch (error) {
      console.error(error);
      alert('台本の生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemakeBoke = async (lineId: string) => {
    if (!script) return;
    const lineIndex = script.content.findIndex(l => l.id === lineId);
    if (lineIndex === -1) return;

    const line = script.content[lineIndex];
    try {
      const newText = await remakeBoke(line.text, script.duoStyle);
      const newContent = [...script.content];
      newContent[lineIndex] = { ...line, text: newText };
      setScript({ ...script, content: newContent });
    } catch (error) {
      console.error(error);
    }
  };

  // Fixed type inference issues for file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            setUploadedImages(prev => [...prev, result].slice(-2));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleStartSimulation = async () => {
    if (!script) return;
    
    // Check for Veo API Key access if required
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
            // Proceed anyway due to race condition guidance
        }
    }

    setShowSimulation(true);
    setIsVideoLoading(true);
    setVideoError(null);
    try {
      const url = await generateSimulationVideo(
        `Manzai script title: ${script.title}. Performers: ${selectedDuo}. Concept: ${concept}.`,
        uploadedImages
      );
      setVideoUrl(url);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
          setVideoError("APIキーの権限エラーです。再設定してください。");
          if (window.aistudio) window.aistudio.openSelectKey();
      } else {
          setVideoError("動画の生成に失敗しました。");
      }
    } finally {
      setIsVideoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-zinc-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 crimson-gradient rounded-full flex items-center justify-center shadow-lg shadow-red-900/40">
              <span className="text-xl font-black text-white italic">M</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white">
              ネタ書き<span className="text-red-600">・名人</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" className="text-sm">保存済み</Button>
            <Button variant="ghost" className="text-sm">使い方</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-red-600 rounded-full inline-block"></span>
              ネタの構成
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">芸人フィルタ（スタイル）</label>
                <select 
                  value={selectedDuo}
                  onChange={(e) => setSelectedDuo(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none"
                >
                  {DUO_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">コンセプト / 話題</label>
                <textarea 
                  placeholder="例：結婚式、コンビニの店員、最近ムカついたこと..."
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-red-600 outline-none resize-none"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">尺（長さ）</label>
                  <select 
                    value={length}
                    onChange={(e) => setLength(e.target.value as ScriptLength)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    <option value={ScriptLength.SHORT}>1分 (ショート)</option>
                    <option value={ScriptLength.MEDIUM}>3分 (賞レース)</option>
                    <option value={ScriptLength.LONG}>5分 (寄席)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">テンション</label>
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ToneType)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    {Object.values(ToneType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                isLoading={isGenerating} 
                className="w-full py-4 text-lg"
              >
                ネタを生成する
              </Button>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-zinc-600 rounded-full inline-block"></span>
              シミュレーション設定
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">自分の写真を使って、漫才を視覚化できます。</p>
              
              <div className="grid grid-cols-2 gap-2">
                {uploadedImages.length > 0 ? (
                   uploadedImages.map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-black border border-zinc-700 overflow-hidden relative group">
                        <img src={img} alt="Uploaded" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                    </div>
                   ))
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl bg-black border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-red-800 transition-colors"
                  >
                    <span className="text-2xl mb-1">+</span>
                    <span className="text-xs text-zinc-500 text-center px-2">写真を<br/>アップロード</span>
                  </div>
                )}
                {uploadedImages.length === 1 && (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl bg-black border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-red-800 transition-colors"
                    >
                        <span className="text-2xl mb-1">+</span>
                        <span className="text-xs text-zinc-500">2枚目</span>
                    </div>
                )}
              </div>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Preset Models</label>
                <div className="grid grid-cols-2 gap-2">
                   {CHARACTER_PRESETS.map(char => (
                     <button
                        key={char.id}
                        onClick={() => setSelectedCharacter(char)}
                        className={`p-2 rounded-xl border text-xs text-left transition-all ${
                          selectedCharacter?.id === char.id ? 'bg-red-900/30 border-red-600' : 'bg-black border-zinc-700 hover:border-zinc-500'
                        }`}
                     >
                       <p className="font-bold">{char.name}</p>
                       <p className="text-zinc-500 truncate">{char.description}</p>
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Preview Area */}
        <section className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-140px)] sticky top-[84px]">
          {/* Header Controls for Preview */}
          <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
            <div className="flex gap-2">
              <Button 
                variant={!isVertical ? 'secondary' : 'ghost'} 
                onClick={() => setIsVertical(false)}
                className="px-4 py-2 text-xs"
              >
                横書き
              </Button>
              <Button 
                variant={isVertical ? 'secondary' : 'ghost'} 
                onClick={() => setIsVertical(true)}
                className="px-4 py-2 text-xs"
              >
                縦書き
              </Button>
            </div>
            
            {script && (
              <Button 
                variant="primary" 
                onClick={handleStartSimulation} 
                disabled={isVideoLoading}
                className="px-6 py-2"
              >
                {isVideoLoading ? '生成中...' : 'シミュレーション開始'}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-hidden grid grid-rows-2 gap-6">
            {/* Simulation Pane */}
            <div className="bg-black rounded-3xl border border-zinc-800 relative overflow-hidden group shadow-inner">
               {!showSimulation ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
                    <div className="w-16 h-16 border-2 border-zinc-800 rounded-full flex items-center justify-center mb-4 text-3xl">🎬</div>
                    <p className="text-lg font-bold">シミュレーション画面</p>
                    <p className="text-sm">ネタを生成後、「シミュレーション開始」を押すと<br/>AIアバターが台本に合わせて動きます。</p>
                 </div>
               ) : (
                 <div className="absolute inset-0 bg-zinc-950 flex flex-col">
                    <div className="flex-1 flex items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]">
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
                      
                      {isVideoLoading ? (
                        <div className="text-center z-10 space-y-4">
                           <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                           <p className="text-red-500 font-bold animate-pulse">舞台を準備しています...</p>
                           <p className="text-xs text-zinc-400">これには数分かかる場合があります。</p>
                        </div>
                      ) : videoUrl ? (
                         <video 
                           src={videoUrl} 
                           controls 
                           autoPlay 
                           loop 
                           className="max-h-full w-full object-contain shadow-2xl shadow-red-900/20" 
                         />
                      ) : (
                        <div className="text-red-500 p-4 text-center z-10">
                           <p className="font-bold">{videoError || '動画生成に失敗しました。'}</p>
                           <Button variant="outline" className="mt-4" onClick={handleStartSimulation}>再試行</Button>
                        </div>
                      )}

                      {/* Sampachi Mic Decoration */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-48 metallic-accent rounded-t-full opacity-40 blur-[2px]"></div>
                      <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-12 h-12 metallic-accent rounded-full border-4 border-zinc-600 shadow-lg flex items-center justify-center">
                         <div className="grid grid-cols-3 gap-0.5 w-6">
                            {[...Array(9)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black/40 rounded-full"></div>)}
                         </div>
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-3 border-t border-zinc-800 flex items-center justify-between">
                       <p className="text-xs font-bold text-zinc-400">
                         {script?.title} - {script?.duoStyle}
                       </p>
                       <Button variant="ghost" className="px-3 py-1 text-[10px]" onClick={() => setShowSimulation(false)}>
                         閉じる
                       </Button>
                    </div>
                 </div>
               )}
            </div>

            {/* Script Pane */}
            <div className={`bg-white text-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden flex flex-col transition-all shadow-2xl`}>
               <div className="bg-zinc-100 p-3 border-b border-zinc-200 flex items-center justify-between px-6">
                  <h3 className="font-black font-serif text-lg tracking-wider italic">
                    {script ? script.title : '台本プレビュー'}
                  </h3>
                  <div className="flex gap-2">
                     <Button variant="secondary" className="px-3 py-1 text-xs text-zinc-400">PDF</Button>
                     <Button variant="secondary" className="px-3 py-1 text-xs text-zinc-400">TXT</Button>
                  </div>
               </div>
               
               <div className={`flex-1 overflow-auto p-8 relative ${isVertical ? 'manzai-vertical font-serif' : 'font-sans'}`}>
                  {script ? (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <div className={`mb-12 border-b-2 border-zinc-300 pb-4 ${isVertical ? 'mb-0 border-b-0 border-l-2 pl-4 ml-8' : ''}`}>
                         <p className="text-2xl font-bold mb-1 underline decoration-red-600 underline-offset-8">
                           {script.title}
                         </p>
                         <p className="text-sm text-zinc-500">
                           スタイル：{script.duoStyle} / 作：ネタ書き・名人
                         </p>
                      </div>

                      {script.content.map((line) => (
                        <div key={line.id} className="group relative">
                          {line.role === 'Action' ? (
                            <p className="text-zinc-400 text-sm italic py-2">
                              {line.text}
                            </p>
                          ) : (
                            <div className="flex gap-4">
                              <span className={`font-black min-w-[5rem] ${line.role === 'Boke' ? 'text-red-700' : 'text-blue-700'}`}>
                                {line.role === 'Boke' ? 'ボケ' : 'ツッコミ'}：
                              </span>
                              <span className="flex-1 text-lg leading-relaxed font-medium">
                                {line.text}
                              </span>
                              {line.role === 'Boke' && (
                                <button 
                                  onClick={() => handleRemakeBoke(line.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-200 hover:bg-zinc-300 px-2 py-1 rounded text-[10px] font-bold self-start whitespace-nowrap"
                                >
                                  ボケ追加 ✨
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="py-20 text-center opacity-30">
                        <p className="font-serif text-xl">— 完 —</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
                       <div className="text-6xl opacity-10">📄</div>
                       <p className="font-bold text-zinc-400">ここに生成された台本が表示されます</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="p-4 text-center text-zinc-600 text-[10px] bg-stone-950 border-t border-zinc-900">
        &copy; 2024 ネタ書き・名人 AI Script Master. Powered by Gemini API.
      </footer>
    </div>
  );
};

export default App;
