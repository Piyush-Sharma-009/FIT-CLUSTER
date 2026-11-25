import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function MealScanner() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [logging, setLogging] = useState(false);

  const [scanResult, setScanResult] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [hasLogged, setHasLogged] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type) || file.size > 8 * 1024 * 1024) {
      setSelectedFile(null);
      setPreviewUrl('');
      setScanResult(null);
      setEditableItems([]);
      setSuccessMsg('');
      setHasLogged(false);
      setError(
        !supportedTypes.includes(file.type)
          ? 'Choose a JPG, PNG, or WEBP image to scan.'
          : 'Choose an image smaller than 8 MB.'
      );
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanResult(null);
    setEditableItems([]);
    setSuccessMsg('');
    setError('');
    setHasLogged(false);
  };

  const handleAnalyzePlate = async () => {
    if (!selectedFile) {
      setError('Select or capture a plate photo first.');
      return;
    }

    setAnalyzing(true);
    setError('');
    setSuccessMsg('');
    setHasLogged(false);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const { data } = await API.post('/vision/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setScanResult(data);
      setEditableItems(
        (data.items || []).map((item) => ({
          ...item,
          finalGrams: item.estimatedGrams,
          gramsDraft: String(item.estimatedGrams),
          included: true,
        }))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze plate image.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItemGrams = (index, newGramsRaw) => {
    const newGrams = Math.min(1000, Math.max(5, Number(newGramsRaw) || 5));
    setEditableItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const factor = newGrams / 100;
        return {
          ...item,
          finalGrams: newGrams,
          gramsDraft: String(newGrams),
          calories: Math.round(item.calPer100g * factor),
          protein: Number((item.proPer100g * factor).toFixed(1)),
          carbs: Number((item.carbsPer100g * factor).toFixed(1)),
          fats: Number((item.fatPer100g * factor).toFixed(1)),
        };
      })
    );
  };

  const handleGramsChange = (index, rawValue) => {
    setEditableItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;

        const grams = Number(rawValue);
        if (
          rawValue === '' ||
          !Number.isFinite(grams) ||
          grams < 5 ||
          grams > 1000
        ) {
          return { ...item, gramsDraft: rawValue };
        }

        const factor = grams / 100;
        return {
          ...item,
          gramsDraft: rawValue,
          finalGrams: grams,
          calories: Math.round(item.calPer100g * factor),
          protein: Number((item.proPer100g * factor).toFixed(1)),
          carbs: Number((item.carbsPer100g * factor).toFixed(1)),
          fats: Number((item.fatPer100g * factor).toFixed(1)),
        };
      })
    );
  };

  const normalizeGrams = (index, item) => {
    const grams = Number(item.gramsDraft);
    if (!Number.isFinite(grams)) {
      updateItemGrams(index, item.finalGrams);
      return;
    }
    updateItemGrams(index, Math.min(1000, Math.max(5, grams)));
  };

  const toggleItemIncluded = (index) => {
    setEditableItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, included: !item.included } : item
      )
    );
  };

  const handleConfirmAndLog = async () => {
    const activeItems = editableItems.filter((item) => item.included);
    if (activeItems.length === 0) {
      setError('Keep at least one food item selected to log.');
      return;
    }

    setLogging(true);
    setError('');
    setSuccessMsg('');

    try {
      const { data } = await API.post('/vision/log-meal', {
        items: activeItems,
        plateBox: scanResult?.plateBox || [],
        detectorMode: scanResult?.detectorMode,
      });

      const correctionMessage = data.correctionsRecorded
        ? ` ${data.correctionsRecorded} portion correction(s) recorded.`
        : '';
      setSuccessMsg(
        `Logged ${data.loggedCount} item(s) to today's tracker.${correctionMessage}`
      );
      setHasLogged(true);

      const feedbackItems = activeItems.filter(
        (item) =>
          scanResult?.detectorMode === 'custom-yolov8' &&
          item.portionFeedbackSupported &&
          Math.abs(item.finalGrams - item.estimatedGrams) >= 2
      );
      const feedbackResults = await Promise.allSettled(
        feedbackItems.map((item) => {
          const formData = new FormData();
          formData.append('image', selectedFile);
          formData.append('foodKey', item.foodKey);
          formData.append('predictedGrams', String(item.estimatedGrams));
          formData.append('correctedGrams', String(item.finalGrams));
          formData.append('bbox', JSON.stringify(item.bbox));
          formData.append('plateBox', JSON.stringify(scanResult.plateBox));
          return API.post('/vision/submit-feedback', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })
      );
      const queuedCount = feedbackResults.filter(
        (result) => result.status === 'fulfilled' && result.value.data?.queued
      ).length;
      const failedCount = feedbackItems.length - queuedCount;

      if (queuedCount > 0) {
        setSuccessMsg(
          (previous) =>
            `${previous} ${queuedCount} portion correction(s) queued for review; model weights were not changed.`
        );
      }
      if (failedCount > 0) {
        const failedResult = feedbackResults.find(
          (result) => result.status === 'rejected'
        );
        const reason = failedResult?.reason;
        const detail =
          reason?.response?.data?.message ||
          reason?.response?.data?.detail ||
          'Review queue unavailable.';
        setError(
          `Meal logged, but ${failedCount} portion correction(s) could not be queued. ${detail}`
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log scanned meal.');
    } finally {
      setLogging(false);
    }
  };

  const activeTotals = editableItems
    .filter((i) => i.included)
    .reduce(
      (acc, item) => ({
        grams: acc.grams + item.finalGrams,
        calories: acc.calories + item.calories,
        protein: Number((acc.protein + item.protein).toFixed(1)),
        carbs: Number((acc.carbs + item.carbs).toFixed(1)),
        fats: Number((acc.fats + item.fats).toFixed(1)),
      }),
      { grams: 0, calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

  const imgW = scanResult?.imageDimensions?.width || 1;
  const imgH = scanResult?.imageDimensions?.height || 1;

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold tracking-widest uppercase text-red-500">
                COMPUTER VISION MACRO & PORTION ENGINE
              </span>
              {scanResult?.detectorMode && (
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                  {scanResult.detectorMode}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold mt-1">AI Plate & Meal Scanner</h1>
            <p className="text-xs text-neutral-400 mt-1">
              YOLOv8 food detection with ResNet18 portion estimates
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/diet-plan')}
              className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 transition"
            >
              Diet Optimizer
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition"
            >
              Dashboard
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-950/60 border border-red-600 text-red-300 text-sm">
            {error}
          </div>
        )}

        {scanResult?.warning && (
          <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-600/60 text-amber-200 text-sm">
            {scanResult.warning}
          </div>
        )}

        {successMsg && (
          <div role="status" aria-live="polite" className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-600/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm text-emerald-300 font-medium">{successMsg}</span>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition self-start sm:self-auto"
            >
              View on Dashboard →
            </button>
          </div>
        )}

        {/* Main 2-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Image Upload + SVG Bounding-Box Canvas */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                STEP 1 • CAPTURE OR UPLOAD PLATE
              </span>
              <h2 className="text-lg font-bold mt-0.5">Plate Image & Detections</h2>
            </div>

            <label className="block w-full p-4 rounded-xl border border-dashed border-neutral-700 hover:border-red-600 bg-black/70 text-center cursor-pointer transition">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileChange}
                disabled={analyzing || logging}
                className="hidden"
              />
              <span className="text-xs font-semibold text-neutral-300 block">
                {selectedFile ? selectedFile.name : 'Click to upload or capture a plate photo'}
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">
                JPG, PNG, or WEBP · maximum 8 MB
              </span>
            </label>

            {previewUrl && (
              <div className="relative w-full rounded-xl overflow-hidden border border-neutral-800 bg-black">
                <img
                  src={previewUrl}
                  alt="Uploaded meal plate"
                  className="w-full h-auto block"
                />

                {/* SVG Overlay for Plate & Food Bounding Boxes */}
                {scanResult && (
                  <svg
                    viewBox={`0 0 ${imgW} ${imgH}`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {scanResult.plateBox?.length === 4 && (
                      <rect
                        x={scanResult.plateBox[0]}
                        y={scanResult.plateBox[1]}
                        width={scanResult.plateBox[2] - scanResult.plateBox[0]}
                        height={scanResult.plateBox[3] - scanResult.plateBox[1]}
                        fill="none"
                        stroke="#737373"
                        strokeWidth={Math.max(2, imgW * 0.004)}
                        strokeDasharray="10 6"
                      />
                    )}

                    {editableItems.map((item, idx) => {
                      if (!item.included || item.bbox?.length !== 4) return null;
                      const [x1, y1, x2, y2] = item.bbox;
                      const strokeW = Math.max(2, imgW * 0.005);
                      const fontSize = Math.max(14, imgW * 0.026);
                      return (
                        <g key={`${item.foodKey}-${idx}`}>
                          <rect
                            x={x1}
                            y={y1}
                            width={x2 - x1}
                            height={y2 - y1}
                            fill="rgba(220, 38, 38, 0.14)"
                            stroke="#ef4444"
                            strokeWidth={strokeW}
                          />
                          <text
                            x={x1 + 6}
                            y={Math.max(fontSize + 4, y1 - 6)}
                            fill="#ffffff"
                            fontSize={fontSize}
                            fontWeight="bold"
                          >
                            {item.name} ({item.finalGrams}g)
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!selectedFile || analyzing || logging}
              onClick={handleAnalyzePlate}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-xs font-bold uppercase tracking-wider text-white transition"
            >
              {analyzing ? 'Running YOLOv8 + ResNet18...' : 'Scan Plate & Estimate Grams'}
            </button>
          </div>

          {/* Right Column: Editable Portion Weights + Macro Totals */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  STEP 2 • VERIFY PORTIONS
                </span>
                <h2 className="text-lg font-bold mt-0.5">Detected Items & Macro Breakdown</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  For custom-detector scans, corrections are recorded with your meal and never update shared model weights directly.
                </p>
              </div>

              {editableItems.length === 0 ? (
                <div className="p-10 rounded-xl bg-black/60 border border-neutral-900 text-center text-sm text-neutral-500">
                  {scanResult
                    ? 'No supported foods were detected. Try a clearer, well-lit photo with the plate fully visible.'
                    : <>Upload a plate image and click{' '}
                      <strong className="text-neutral-300">Scan Plate & Estimate Grams</strong> to review the detected portions.</>}
                </div>
              ) : (
                <div className="space-y-3">
                  {editableItems.map((item, idx) => (
                    <div
                      key={`${item.foodKey}-${idx}`}
                      className={`p-4 rounded-xl border transition ${
                        item.included
                          ? 'bg-neutral-900/80 border-neutral-800'
                          : 'bg-neutral-900/20 border-neutral-900 opacity-50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={() => toggleItemIncluded(idx)}
                            disabled={logging || hasLogged}
                            className="mt-1 h-4 w-4 accent-red-600 rounded cursor-pointer"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-white">{item.name}</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-black border border-neutral-800 text-neutral-400">
                                Conf: {Math.round(item.confidence * 100)}%
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-black border border-neutral-800 text-neutral-400">
                                Plate Area: {Math.round(item.areaRatio * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">
                              <strong className="text-white">{item.calories} kcal</strong> •{' '}
                              <strong className="text-red-400">{item.protein}g Protein</strong> •{' '}
                              {item.carbs}g Carbs • {item.fats}g Fat
                            </p>
                          </div>
                        </label>

                        {/* Gram Stepper Control */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => updateItemGrams(idx, item.finalGrams - 10)}
                            disabled={logging || hasLogged}
                            aria-label={`Decrease ${item.name} portion by 10 grams`}
                            className="w-7 h-7 rounded bg-black hover:bg-neutral-800 border border-neutral-800 text-sm font-bold text-neutral-300"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="5"
                            max="1000"
                            step="5"
                            value={item.gramsDraft}
                            aria-label={`${item.name} portion in grams`}
                            onChange={(e) => handleGramsChange(idx, e.target.value)}
                            onBlur={() => normalizeGrams(idx, item)}
                            disabled={logging || hasLogged}
                            className="w-16 px-2 py-1 rounded bg-black border border-neutral-800 text-center text-xs font-mono text-white focus:border-red-600 focus:outline-none"
                          />
                          <span className="text-xs text-neutral-400 pr-1">g</span>
                          <button
                            type="button"
                            onClick={() => updateItemGrams(idx, item.finalGrams + 10)}
                            disabled={logging || hasLogged}
                            aria-label={`Increase ${item.name} portion by 10 grams`}
                            className="w-7 h-7 rounded bg-black hover:bg-neutral-800 border border-neutral-800 text-sm font-bold text-neutral-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary & Confirm Log Footer */}
            {editableItems.length > 0 && (
              <div className="pt-4 border-t border-neutral-800 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-black border border-neutral-800">
                    <span className="text-[10px] uppercase text-neutral-400 block">Total Weight</span>
                    <span className="text-lg font-extrabold text-white">{activeTotals.grams}g</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black border border-neutral-800">
                    <span className="text-[10px] uppercase text-neutral-400 block">Calories</span>
                    <span className="text-lg font-extrabold text-white">
                      {activeTotals.calories} kcal
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black border border-red-600/50">
                    <span className="text-[10px] uppercase text-red-400 block">Protein</span>
                    <span className="text-lg font-extrabold text-red-500">
                      {activeTotals.protein}g
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black border border-neutral-800">
                    <span className="text-[10px] uppercase text-neutral-400 block">Carbs / Fat</span>
                    <span className="text-sm font-bold text-neutral-200 mt-0.5 block">
                      {activeTotals.carbs}g / {activeTotals.fats}g
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={logging || hasLogged}
                  onClick={handleConfirmAndLog}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white transition"
                >
                  {logging
                    ? 'Logging meal...'
                    : hasLogged
                      ? 'Meal logged successfully'
                      : 'Confirm Portions & Log Meal to Today'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}